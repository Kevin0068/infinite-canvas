# 自动更新服务器部署指南

## 概述

本应用使用 `electron-updater` 实现自动更新功能。你需要一个静态文件服务器来托管更新文件。

## 服务器要求

任何支持静态文件托管的服务器都可以，例如：
- Nginx
- Apache
- AWS S3
- 阿里云 OSS
- 腾讯云 COS
- GitHub Releases
- 自建 Node.js 服务器

## 配置步骤

### 1. 修改更新服务器地址

编辑以下两个文件，将 `https://your-server.com/updates/` 替换为你的实际服务器地址：

**electron/main.cjs:**
```javascript
autoUpdater.setFeedURL({
  provider: 'generic',
  url: 'https://your-server.com/updates/',  // 替换这里
});
```

**package.json:**
```json
"publish": {
  "provider": "generic",
  "url": "https://your-server.com/updates/"  // 替换这里
}
```

### 2. 打包应用

```bash
# 打包 Mac 版本
npm run pack:mac

# 打包 Windows 版本
npm run pack:win

# 同时打包两个平台
npm run pack:all
```

### 3. 上传更新文件到服务器

打包完成后，将 `release/` 目录下的以下文件上传到服务器：

**Mac 更新所需文件：**
- `InfiniteCanvas-{version}-mac-x64.zip`
- `InfiniteCanvas-{version}-mac-x64.zip.blockmap`
- `InfiniteCanvas-{version}-mac-arm64.zip`
- `InfiniteCanvas-{version}-mac-arm64.zip.blockmap`
- `latest-mac.yml`

**Windows 更新所需文件：**
- `InfiniteCanvas-{version}-win-x64.exe`
- `InfiniteCanvas-{version}-win-x64.exe.blockmap`
- `latest.yml`

### 4. 服务器目录结构示例

```
/updates/
├── latest-mac.yml
├── latest.yml
├── InfiniteCanvas-1.0.0-mac-x64.zip
├── InfiniteCanvas-1.0.0-mac-x64.zip.blockmap
├── InfiniteCanvas-1.0.0-mac-arm64.zip
├── InfiniteCanvas-1.0.0-mac-arm64.zip.blockmap
├── InfiniteCanvas-1.0.0-win-x64.exe
└── InfiniteCanvas-1.0.0-win-x64.exe.blockmap
```

## Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-server.com;

    location /updates/ {
        alias /var/www/updates/;
        autoindex on;
        
        # 允许跨域
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods 'GET, OPTIONS';
        
        # 设置正确的 MIME 类型
        types {
            application/octet-stream exe;
            application/zip zip;
            application/x-yaml yml;
        }
    }
}
```

## 发布新版本流程

1. **更新版本号**
   编辑 `package.json`，修改 `version` 字段：
   ```json
   "version": "1.1.0"
   ```

2. **重新打包**
   ```bash
   npm run pack:all
   ```

3. **上传新文件**
   将 `release/` 目录下的新版本文件上传到服务器，覆盖旧文件。

4. **验证更新**
   - `latest-mac.yml` 和 `latest.yml` 文件会自动生成
   - 这些文件包含版本信息，客户端会读取它们来判断是否有新版本

## latest.yml 文件格式示例

```yaml
version: 1.1.0
files:
  - url: InfiniteCanvas-1.1.0-win-x64.exe
    sha512: <sha512-hash>
    size: 96361214
path: InfiniteCanvas-1.1.0-win-x64.exe
sha512: <sha512-hash>
releaseDate: '2025-01-10T12:00:00.000Z'
```

## 更新流程说明

1. 应用启动后 3 秒自动检查更新
2. 发现新版本时弹窗提示用户
3. 用户确认后开始下载
4. 下载完成后提示重启安装
5. 用户可以选择立即重启或稍后重启

## 手动检查更新

用户可以通过菜单 `帮助 -> 检查更新...` 手动检查更新。

## 常见问题

### Q: 更新检查失败？
A: 检查服务器地址是否正确，确保 `latest.yml` 文件可以访问。

### Q: Mac 更新需要签名吗？
A: 如果要发布到 App Store 或启用 Gatekeeper，需要 Apple 开发者证书签名。自用可以不签名。

### Q: Windows 更新需要签名吗？
A: 建议使用代码签名证书，否则 Windows 可能会显示安全警告。

## 使用 GitHub Releases（可选）

如果你想使用 GitHub Releases 托管更新，修改配置：

**package.json:**
```json
"publish": {
  "provider": "github",
  "owner": "your-username",
  "repo": "infinite-canvas"
}
```

**electron/main.cjs:**
```javascript
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'your-username',
  repo: 'infinite-canvas',
});
```

然后使用 `npm run publish:all` 自动发布到 GitHub Releases。
