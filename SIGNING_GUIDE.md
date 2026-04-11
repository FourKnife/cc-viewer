# macOS 应用签名和公证完整指南

本指南将帮助你完成 CC Viewer Electron 应用的苹果开发者签名和公证流程。

## 📋 前置要求

1. ✅ 苹果开发者账户（已有）
2. 拥有 Developer ID Application 证书
3. macOS 系统（用于签名和公证）

---

## 🔑 第一步：获取开发者证书

### 1.1 创建证书签名请求 (CSR)

在你的 Mac 上：

1. 打开"钥匙串访问"应用（Keychain Access）
2. 菜单栏选择：**钥匙串访问 > 证书助理 > 从证书颁发机构请求证书**
3. 填写信息：
   - 用户电子邮件地址：你的 Apple ID 邮箱
   - 常用名称：你的名字或公司名
   - CA 电子邮件地址：留空
   - 请求是：**存储到磁盘**
4. 点击"继续"，保存 CSR 文件到桌面

### 1.2 在苹果开发者网站创建证书

1. 访问 [Apple Developer](https://developer.apple.com/account/resources/certificates/list)
2. 点击 **➕ 按钮** 创建新证书
3. 选择 **Developer ID Application** （用于在 Mac App Store 外分发）
4. 上传刚才创建的 CSR 文件
5. 下载生成的 `.cer` 证书文件

### 1.3 安装证书

1. 双击下载的 `.cer` 文件
2. 证书会自动安装到"钥匙串访问"中的"登录"钥匙串

### 1.4 导出为 .p12 文件

1. 打开"钥匙串访问"
2. 在左侧选择"登录" > "我的证书"
3. 找到刚安装的 **Developer ID Application: [你的名字]** 证书
4. 展开证书，确保下面有私钥
5. 右键点击证书，选择"导出..."
6. 文件格式选择：**个人信息交换 (.p12)**
7. 保存文件，例如：`~/Desktop/developer-id.p12`
8. 设置一个密码（记住这个密码，后面会用到）

---

## 🍎 第二步：获取 App-Specific 密码（用于公证）

公证（Notarization）是苹果要求的额外步骤，确保应用安全。

1. 访问 [Apple ID 账户页面](https://appleid.apple.com)
2. 登录你的 Apple ID
3. 在"安全"部分，找到 **App-Specific Passwords（App 专用密码）**
4. 点击"生成密码..."
5. 输入标签，如 "CC Viewer Notarization"
6. 复制生成的密码（格式类似：xxxx-xxxx-xxxx-xxxx）
7. **保存这个密码**，后面会用到

---

## 🔍 第三步：获取 Team ID

1. 访问 [Apple Developer Membership](https://developer.apple.com/account/#/membership)
2. 在页面上找到 **Team ID**（10 位字符，例如：ABCD123456）
3. 复制保存

---

## ⚙️ 第四步：配置环境变量

### 方法 1: 临时设置（每次打包前执行）

```bash
# 证书配置
export CSC_LINK="$HOME/Desktop/developer-id.p12"
export CSC_KEY_PASSWORD="你的p12密码"

# 公证配置
export APPLE_ID="your-apple-id@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="ABCD123456"
```

### 方法 2: 永久设置（推荐）

在 `~/.zshrc` 或 `~/.bash_profile` 中添加：

```bash
# CC Viewer 签名配置
export CSC_LINK="$HOME/Desktop/developer-id.p12"
export CSC_KEY_PASSWORD="你的p12密码"
export APPLE_ID="your-apple-id@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="ABCD123456"
```

然后执行：`source ~/.zshrc` 或 `source ~/.bash_profile`

### 方法 3: 使用 .env 文件（更安全）

创建 `.env.local` 文件（不要提交到 git）：

```bash
CSC_LINK=/Users/你的用户名/Desktop/developer-id.p12
CSC_KEY_PASSWORD=你的p12密码
APPLE_ID=your-apple-id@example.com
APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
APPLE_TEAM_ID=ABCD123456
```

---

## 🚀 第五步：执行签名和打包

### 完整签名和公证

```bash
npm run electron:sign
```

这个命令会：
1. ✅ 构建前端代码
2. ✅ 使用你的开发者证书签名应用
3. ✅ 上传到苹果服务器进行公证
4. ✅ 将公证票据附加到应用
5. ✅ 生成 .dmg 和 .zip 文件

### 仅签名（不公证）

如果暂时不需要公证，可以只设置证书环境变量：

```bash
export CSC_LINK="$HOME/Desktop/developer-id.p12"
export CSC_KEY_PASSWORD="你的p12密码"

npm run electron:build
```

---

## 📦 输出文件

成功后，你会在 `electron-dist/` 目录看到：

- `CC Viewer-[version]-mac.zip` - 压缩包版本
- `CC Viewer-[version].dmg` - 磁盘映像版本（推荐分发）

---

## ✅ 验证签名

### 检查应用签名状态

```bash
codesign --verify --verbose=4 "electron-dist/mac-arm64/CC Viewer.app"
```

### 检查签名信息

```bash
codesign -dv --verbose=4 "electron-dist/mac-arm64/CC Viewer.app"
```

### 检查 Gatekeeper 评估

```bash
spctl -a -vv "electron-dist/mac-arm64/CC Viewer.app"
```

成功的输出应该包含：
- "satisfies its Designated Requirement"
- 你的 Developer ID 信息

---

## 🔧 常见问题

### Q1: 找不到签名身份

**错误**: `No valid code signing identity found`

**解决**:
```bash
# 检查可用的签名身份
security find-identity -v -p codesigning

# 应该看到类似输出:
# 1) ABC123... "Developer ID Application: Your Name (TEAMID)"
```

如果没有输出，请重新检查证书安装步骤。

### Q2: 公证失败

**错误**: `Notarization failed`

**解决**:
1. 检查 App-Specific 密码是否正确
2. 确保 Apple ID 已启用双重认证
3. 检查 Team ID 是否正确

### Q3: 应用无法在其他 Mac 上运行

**解决**:
- 必须完成公证步骤
- 公证后的应用才能在其他 Mac 上正常运行

### Q4: 公证时间过长

公证通常需要 5-15 分钟，请耐心等待。可以查看状态：

```bash
xcrun notarytool history --apple-id "your@email.com" --password "xxxx-xxxx-xxxx-xxxx" --team-id "TEAMID"
```

---

## 🔒 安全建议

1. ✅ **不要**将 `.p12` 文件和密码提交到代码仓库
2. ✅ 将 `.env.local` 添加到 `.gitignore`
3. ✅ 定期更换 App-Specific 密码
4. ✅ 妥善保管证书文件的备份

---

## 📚 参考资料

- [Apple 代码签名指南](https://developer.apple.com/support/code-signing/)
- [Apple 公证流程](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [electron-builder 签名文档](https://www.electron.build/code-signing)

---

## 🆘 需要帮助？

如果遇到问题，请提供以下信息：

1. 错误信息的完整输出
2. 执行的命令
3. `security find-identity -v -p codesigning` 的输出

---

**配置完成后，你就可以开始打包签名应用了！** 🎉
