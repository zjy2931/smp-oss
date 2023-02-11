/*
 * @Description:
 * @Version: 1.0.0
 * @Autor: zhangjy
 * @Date: 2023-01-14 16:51:16
 * @LastEditors: zhangjy
 * @LastEditTime: 2023-02-11 16:08:11
 */
const OSS = require('ali-oss');
const fs = require('fs');
const path = require('path');
const slog = require('single-line-log').stdout;
const { createHash } = require('crypto');

module.exports = class SmpOss {
    constructor(option) {
        this.client = new OSS(option);
        this.ossFileList = [];
        this.localFileList = [];
        this.ossDirList = [];
        this.successNums = 0;
    }
    //读取oss目录
    async readOssDir(ossPath, marker) {
        this.ossDirList.push(ossPath);
        try {
            const result = await this.client.list({
                prefix: ossPath,
                marker: marker || null,
                delimiter: '/',
            });
            if (result.prefixes) {
                for (let i = 0; i < result.prefixes.length; i++) {
                    await this.readOssDir(result.prefixes[i]);
                }
                result.prefixes.forEach(subDir => {
                    this.ossDirList.push(subDir);
                });
            }
            if (result.nextMarker) {
                await this.readOssDir(ossPath, result.nextMarker);
            }
        } catch (e) {
            console.log(e);
        }
    }
    // 获取oss文件列表
    async getOssFileList(ossDir, marker) {
        const result = await this.client.list({
            prefix: ossDir,
            marker: marker || null,
        });
        result.objects.forEach(file => {
            let name = file.name;
            if (name.endsWith('/')) return;
            this.ossFileList.push(file);
        });
        if (result.nextMarker) {
            await this.getOssFileList(ossDir, result.nextMarker);
        }
    }
    // 备份oss目录
    async copyOssFile(ossDir) {
        await this.getOssFileList(ossDir);

        let newDir = `${this.nowTimeString()}.${ossDir}-${new Date().toLocaleDateString().replace(/\//g,'-')}`;

        this.ossFileList.forEach(async obj => {
            let name = obj.name.replace(ossDir, newDir);
            await this.client.copy(name, obj.name);
        });
    }
    // 上传文件到oss
    async uploadDir(ossDir, localDir, needClear) {
        localDir = path.resolve(process.cwd(), localDir);
        if (!ossDir.endsWith('/')) ossDir = ossDir + '/';
        this.localFileList = [];
        console.log(ossDir, localDir)
        // 备份oss文件
        await this.copyOssFile(ossDir);
        // 清空原有文件
        if (needClear) {
            await this._clearOssFiles();
            console.log('=========== 清空文件完毕 ===========');
        }
        console.log('=========== 开始写入文件 ===========');
        this._readFiles(localDir, file_path => {
            this.localFileList.push(file_path);
        });
        const progress_per_file = 100 / this.localFileList.length;
        let progress = 0;
        await Promise.all(
            this.localFileList.map(async file_path => {
                file_path = file_path.replace(/\\/g, '/');
                const name = file_path.replace(localDir.replace(/\\/g, '/') + '/', '');
                await this.client.put(ossDir + name, file_path);
                progress += progress_per_file;
                slog(`=========== 已完成${progress}% ===========`);
            })
        );

        console.log('\n=========== 写入文件结束 ===========');
    }
    async downloadDir(ossPath, localPath) {
        console.log('开始下载');
        if (!ossPath.endsWith('/')) ossPath = ossPath + '/';
        if (!localPath.endsWith('/')) localPath = localPath + '/';
        this.ossFileList = [];
        this.ossDirList = [];
        this.successNums = 0;
        await this.getOssFileList(ossPath);
        await this.readOssDir(ossPath);
        //创建本地目录
        await this._mkdirs(ossPath, localPath);
        //下载文件
        for (let file of this.ossFileList) {
            let ossName = file.name;
            let localName = ossName.replace(ossPath, localPath);
            this.downloadFile(ossName, localName, file);
        }
    }
    async downloadFile(ossPath, localPath, e) {
        try {
            await this.client.get(ossPath, localPath);
        } catch (error) {
            slog('下载失败', e.name, '重新下载');
            downloadFile(ossPath, localPath, e);
            return;
        }
        this.successNums++;
        slog(`已下载${this.successNums}/${this.ossFileList.length}`);
        if (this.successNums >= this.ossFileList.length) {
            console.log('\n完成下载');
        }
    }
    _mkdirs(ossPath, localPath) {
        return new Promise(resolve => {
            let n = 0;
            let length = this.ossDirList.length;
            for (let obj of this.ossDirList) {
                let dir = obj.replace(ossPath, localPath);
                this.mkdirs(dir, () => {
                    n++;
                    if (n >= length) {
                        resolve();
                    }
                });
            }
        });
    }
    mkdirs(dirname, callback) {
        fs.exists(dirname, exists => {
            if (exists) return callback();
            this.mkdirs(path.dirname(dirname), () => {
                fs.mkdir(dirname, callback);
            });
        });
    }
    // 读取本地文件列表
    _readFiles(dir_path, cb) {
        const file_list = fs.readdirSync(dir_path);
        file_list.forEach(file_name => {
            const file_path = path.resolve(dir_path, file_name);
            const res = fs.statSync(file_path);
            if (res.isDirectory()) {
                this._readFiles(file_path, cb);
            } else {
                cb(file_path);
            }
        });
    }
    async _clearOssFiles() {
        await Promise.all(
            this.ossFileList.map(async obj => {
                await this.client.delete(obj.name);
            })
        );
    }
    nowTimeString = () => {
        let hash = createHash('sha1');
        hash.update(Date.now() + '');
        return hash.digest('hex').slice(0, 18);
    };
};
