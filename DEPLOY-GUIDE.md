# 免费部署方案指南

## 方案一：GitHub Releases（推荐，完全免费）

### 步骤 1：创建 GitHub 仓库

1. 登录 GitHub：https://github.com
2. 点击右上角 "+" → "New repository"
3. 仓库名称填写：`infinite-canvas`
4. 选择 Public（公开）或 Private（私有）
5. 点击 "Create repository"

### 步骤 2：修改配置

编辑 `package.json`，将 `YOUR_GITHUB_USERNAME` 替换为你的 GitHub 用户名：

```json
"publish": {
  "provider": "github",
  "owner": "你的GitHub用户名",
  "repo": "infinite-canvas",
  "releaseType": "release"
}
```

### 步骤 3：生成 GitHub Token

1. 打开 https://github.com/settings/tokens
2. 点击 "Generate new token (classic)"
3. 勾选 `repo` 权限
4. 点击 "Generate token"
5. 复制生成的 token（只显示一次！）

### 步骤 4：设置环境变量

**Mac/Linux:**
```bash
export GH_TOKEN=你的token
```

**Windows (PowerShell):**
```powershell
$env:GH_TOKEN="你的token"
```

### 步骤 5：发布到 GitHub

```bash
cd infinite-canvas

# 发布 Mac 版本
npm run publish:mac

# 发布 Windows 版本
npm run publish:win

# 或同时发布两个平台
npm run publish:all
```

### 步骤 6：验证发布

1. 打开你的 GitHub 仓库
2. 点击 "Releases" 标签
3. 应该能看到 v1.0.0 版本和上传的文件

---

## 方案二：Cloudflare R2（免费 10GB）

### 优点
- 免费 10GB 存储
- 无出口流量费
- 全球 CDN 加速

### 步骤

1. 注册 Cloudflare：https://dash.cloudflare.com
2. 进入 R2 → 创建存储桶
3. 上传 release 目录下的文件
4. 设置公开访问
5. 修改 `package.json` 和 `main.cjs` 中的 URL

---

## 方案三：Vercel（免费 100GB/月）

### 步骤 1：安装 Vercel CLI

```bash
npm install -g vercel
```

### 步骤 2：创建更新服务目录

```bash
mkdir updates-server
cd updates-server
```

### 步骤 3：复制更新文件

```bash
cp ../infinite-canvas/release/latest*.yml .
cp ../infinite-canvas/release/*.zip .
cp ../infinite-canvas/release/*.exe .
cp ../infinite-canvas/release/*.blockmap .
```

### 步骤 4：创建 vercel.json

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" }
      ]
    }
  ]
}
```

### 步骤 5：部署

```bash
vercel --prod
```

### 步骤 6：更新配置

将 Vercel 给你的 URL 填入 `package.json` 和 `main.cjs`

---

## 发布新版本流程

无论使用哪种方案，发布新版本的步骤都是：

### 1. 更新版本号

编辑 `package.json`：
```json
"version": "1.1.0"
```

### 2. 更新关于对话框

编辑 `electron/main.cjs` 中的版本显示：
```javascript
message: '无限画布 v1.1.0',
```

### 3. 重新打包并发布

**GitHub Releases:**
```bash
npm run publish:all
```

**其他方案:**
```bash
npm run pack:all
# 然后手动上传 release 目录下的文件
```

---

## 常见问题

### Q: GitHub 发布失败？
A: 检查 GH_TOKEN 是否设置正确，token 是否有 repo 权限

### Q: 用户下载慢？
A: GitHub 在国内访问可能较慢，可以考虑使用 Cloudflare R2 或国内云存储

### Q: 如何测试更新？
A: 
1. 先发布 1.0.0 版本
2. 安装 1.0.0 版本
3. 修改版本号为 1.0.1 并发布
4. 打开已安装的应用，检查更新

### Q: Mac 提示"无法验证开发者"？
A: 需要 Apple 开发者证书签名，或者用户右键选择"打开"

### Q: Windows 提示"未知发布者"？
A: 需要代码签名证书，或者用户选择"仍要运行"
