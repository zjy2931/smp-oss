<!--
 * @Description:
 * @Version: 1.0.0
 * @Autor: zhangjy
 * @Date: 2023-01-11 14:24:53
 * @LastEditors: zhangjy
 * @LastEditTime: 2023-01-14 18:43:39
-->

## 安装

`npm install smp-oss`

## 示例

```js
const SmpOss = require('smp-oss');
const oss = new SmpOss({
    region: '<Your region>',
    accessKeyId: '<Your AccessKeyId>',
    accessKeySecret: '<Your AccessKeySecret>',
    bucket: 'Your bucket name',
});

/* 
    osspath
    localpath
*/
oss.uploadDir('ossImg', './img');
// oss.downloadDir('ossImg', './img1');
```
