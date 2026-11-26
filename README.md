# 拾光机 ✦

拾起同事的闪光时刻：填写自己的名字、对方名字、对方团队和认可内容，选一张照片，贴上可拖动的 emoji，然后交给 iPhone 快捷指令发送。

- 网页：https://lucianlei.github.io/shiguangji/
- 快捷指令设置：https://lucianlei.github.io/shiguangji/guide.html

## 使用

在 iPhone 上按设置页创建名为「拾光机」的快捷指令。无输入时打开网页；网页完成后复制 JSON，再用 Apple 官方支持的 `shortcuts://run-shortcut?name=拾光机&input=clipboard` 调用同一个快捷指令。快捷指令从输入解析词典，发送 `message`，如 `imageBase64` 非空则先 Base64 解码再发送图像。接收人的 iMessage 手机号或 Apple ID 邮箱只在快捷指令中配置。

快捷指令需要在 iPhone 中手动创建，当前仓库不提供已签名、可一键安装的快捷指令。系统可能要求剪贴板、运行快捷指令和发送信息权限。首次测试请开启「运行时显示」，使用自己的 iMessage 账号。发送文字和照片使用两次发送信息操作。信息类型由系统和收件人配置决定，请检查蓝色 iMessage 气泡。

## 照片和数据

图片选择使用系统文件选择器，网页无法浏览未选中的相册内容。图片在本机缩放到最长边不超过 1600 px，并重新编码为 JPEG；贴纸通过 Canvas 真正合成到照片中。支持拖动、大小调整、旋转、删除及键盘方向键。照片开关关闭时不包含图片数据。

无后台、无数据库、无追踪脚本、无第三方字体。文字和照片仅保留在当前页面内存，刷新后清除；点击交接才写入剪贴板。剪贴板可能经 Apple 通用剪贴板同步，发送后可由快捷指令清空。导出的 JSON 备份含完整文字与照片，请妥善保存。网页不记录消息送达结果。

JSON 协议版本为 `schemaVersion: 1`，`source: "shiguangji"`；包含 `sender`、`colleague`、`team`、`recognition`、`message`、`hasImage`、`imageBase64`、`imageMimeType`、`imageFilename`、`submissionId`、`createdAt`。无照片时 `imageBase64` 为空。每次预览生成新的标识；重复交接可能重复发送，当前不实现跨设备去重。

## 开发与发布

这是无需依赖的 HTML/CSS/JavaScript 静态站点。GitHub Pages 从 `main` 分支根目录发布，`.nojekyll` 关闭 Jekyll 处理。

```sh
npm run check
npm run build
```

`build.mjs` 将网页文件复制到 `dist`，便于本地预览或其他静态托管；GitHub Pages 可直接使用根目录文件。没有需要配置的 API 密钥。星光动画支持页面开关和 `prefers-reduced-motion`。

## Apple 文档

[通过 URL 运行快捷指令](https://support.apple.com/zh-cn/guide/shortcuts/apd624386f42/ios)
