/*
 * @Description:
 * @Version: 1.0.0
 * @Autor: zhangjy
 * @Date: 2023-01-14 18:25:18
 * @LastEditors: zhangjy
 * @LastEditTime: 2023-01-14 18:36:01
 */
const SmpOss = require('./index.js');
const oss = new SmpOss( {
    region: '<Your region>',
    accessKeyId: '<Your AccessKeyId>',
    accessKeySecret: '<Your AccessKeySecret>',
    bucket: 'Your bucket name'
});
// oss.uploadDir('ossImg', './img');
oss.downloadDir('ossImg','./img1')
