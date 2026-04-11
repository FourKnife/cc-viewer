# macOS 签名快速参考

## 🚀 快速开始

### 1. 检查配置状态
```bash
npm run electron:check-sign
```

### 2. 设置环境变量
```bash
# 方法 A: 临时设置
export CSC_LINK="$HOME/Desktop/developer-id.p12"
export CSC_KEY_PASSWORD="你的密码"
export APPLE_ID="your@email.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="TEAMID"

# 方法 B: 永久设置（添加到 ~/.zshrc）
echo 'export CSC_LINK="$HOME/Desktop/developer-id.p12"' >> ~/.zshrc
echo 'export CSC_KEY_PASSWORD="你的密码"' >> ~/.zshrc
# ... 其他变量
source ~/.zshrc
```

### 3. 执行打包
```bash
# 仅签名（需要 CSC_LINK + CSC_KEY_PASSWORD）
npm run electron:build

# 签名 + 公证（需要所有环境变量）
npm run electron:sign
```

## 📋 所需环境变量

| 变量 | 用途 | 必需 |
|------|------|------|
| `CSC_LINK` | .p12 证书文件路径 | ✅ 必需 |
| `CSC_KEY_PASSWORD` | .p12 证书密码 | ✅ 必需 |
| `APPLE_ID` | Apple ID 邮箱 | 公证需要 |
| `APPLE_APP_SPECIFIC_PASSWORD` | App 专用密码 | 公证需要 |
| `APPLE_TEAM_ID` | 开发者 Team ID | 公证需要 |

## 🔍 验证命令

```bash
# 查看已安装的签名证书
security find-identity -v -p codesigning

# 验证应用签名
codesign --verify --verbose=4 "electron-dist/mac-arm64/CC Viewer.app"

# 查看签名详情
codesign -dv --verbose=4 "electron-dist/mac-arm64/CC Viewer.app"

# 测试 Gatekeeper
spctl -a -vv "electron-dist/mac-arm64/CC Viewer.app"

# 查看公证历史
xcrun notarytool history --apple-id "your@email.com" \
  --password "xxxx-xxxx-xxxx-xxxx" \
  --team-id "TEAMID"
```

## 📂 输出位置

```
electron-dist/
├── CC Viewer-1.6.139-mac.zip          # 压缩包
├── CC Viewer-1.6.139.dmg              # DMG 安装包（推荐分发）
└── mac-arm64/
    └── CC Viewer.app                   # 应用包
```

## ⚙️ 相关文件

- `electron-builder.yml` - 打包配置
- `build/entitlements.mac.plist` - 权限配置
- `build/notarize.js` - 公证脚本
- `scripts/mac-sign.sh` - 签名脚本
- `SIGNING_GUIDE.md` - 完整指南

## 🆘 常见错误

### 错误 1: No valid identity found
```bash
# 检查证书
security find-identity -v -p codesigning
```
解决: 重新安装证书或检查证书有效期

### 错误 2: Notarization failed
解决: 检查 APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID 是否正确

### 错误 3: Application requires hardened runtime
解决: 已在 electron-builder.yml 中配置 `hardenedRuntime: true`

## 📖 详细文档

查看 `SIGNING_GUIDE.md` 获取完整的步骤说明。
