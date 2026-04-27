# Cleffa - 项目路线图 (基于 cc-viewer)

## 里程碑概览

- ✅ **[M1: MVP Core](milestones/v1.0-ROADMAP.md)** — 6 phases, 17 files, +1559 LOC (2026-04-20 → 2026-04-22)
- ✅ **[M1.1: UI 优化](milestones/v1.1-ROADMAP.md)** — 2 phases, 选中元素 Tag + 状态栏 + 截图对比 POC + UI 打磨 (2026-04-22)
- ✅ **[M1.2: 可视化编辑体验增强](milestones/v1.2-ROADMAP.md)** — 4 phases, 默认值优化 + 终端替换 + 设计稿对比自动调整 (2026-04-23)
- ✅ **[M1.3: 优化可视区域](milestones/v1.3-ROADMAP.md)** — 2 phases, 布局重构 + 操作区折叠 + Anti-AI-Slop (2026-04-23)
- ✅ **[M1.4: 细节修复与上下文结构化](milestones/v1.4-ROADMAP.md)** — 2 phases, iframe URL 持久化 + XML 结构化元素上下文
- ✅ **[M1.5: 项目启动器 UI 改造](milestones/v1.5-ROADMAP.md)** — 2 phases, Launcher 迁移 SideMenu + PagePreview 常态化 + ANSI 过滤 + Available Pages 快捷导航 (2026-04-24)
- 🚧 **[M1.6: Scenario 场景系统](milestones/v1.6-ROADMAP.md)** — 4 phases, 多页面状态快速导航 + storage 注入 + steps 执行引擎 + 批量截图画廊 + 固定场景

---

## M1.4: 细节修复与上下文结构化 ✅

### Phase 18: iframe URL 状态持久化

**Goal:** 修复可视化编辑器模式切换时 iframe URL 丢失的 bug
**Status:** ✅ completed

### Phase 19: XML 结构化元素上下文替代硬编码 prompt

**Goal:** 将可视化编辑器选中元素的上下文从硬编码中文 prompt 改为 XML 结构化格式
**Status:** ✅ completed

---

## M1.5: 项目启动器 UI 改造 ✅

### Phase 20: SideMenu 扩展 + Launcher 迁移 + PagePreview 常态化

**Goal:** 将 ProjectLauncher 迁移为 SideMenu 独立菜单项；PagePreview 始终显示 URL 输入框
**Description:** 新增 `launcher` 菜单项，center 区域按 visualMenuKey 渲染；移除 PagePreview 空状态判断，常态化显示 URL bar
**Depends on:** Phase 19
**Status:** ✅ completed

### Phase 21: 日志 ANSI 过滤 + Available Pages 快捷导航

**Goal:** 清除日志噪音；解析 Available Pages 展示为可点击快捷入口
**Description:** 新建 `stripAnsi` / `parseAvailablePages` 工具函数；ProjectLauncher 渲染时过滤 ANSI；启动后展示页面列表，点击自动导航到 ui-edit 模式并填入 URL
**Depends on:** Phase 20
**Status:** ✅ completed

---

## Backlog

### Phase 999.1: 可视化模式底部面板 Tab 化 + 折叠功能 (BACKLOG)

**Goal:** 解决项目启动器遮挡 iframe 的问题，并为底部面板未来扩展做架构准备
**Description:** 当前可视化模式下，底部项目启动器会遮挡 iframe 内容。需要：①iframe 高度根据底部面板动态调整；②将底部区域改为 Tab 面板，现有「项目启动器」作为第一个 Tab，便于后续追加其他功能 Tab；③支持底部面板折叠，点击后收起为页面底部横条，点击横条可展开恢复。
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)

### Phase 999.2: Available Pages 快速导航 + 二维码生成 (BACKLOG)

**Goal:** 在可视化编辑器项目启动器中，解析启动日志里的 Available Pages 列表，提供一键跳转 UI 编辑和生成二维码两个快捷操作
**Description:** 当前用户需要手动复制页面 URL 再粘贴到 UI 编辑器中打开，流程繁琐。需要：①解析启动日志中 "Available Pages:" 后的页面名称与 URL 列表；②在项目启动器 UI 中展示页面列表，点击页面名/链接可自动切换到 UI 编辑模式并填入对应 URL；③新增二维码生成功能：点击页面对应的二维码按钮，通过 `sim <页面名>` stdin 命令触发二维码生成，并在 UI 中展示可扫码的二维码图片，方便真机扫码调试。
**Context:** 启动日志格式示例：
```
Available Pages:
- demo:                       http://localhost:3002/demo.html
- transferInCKK:              http://localhost:3002/transferInCKK.html
Stdin Commands:
-  sim :  在当前命令行中输入「sim [页面名/启动模式] + 回车」 在 iOS 模拟器中打开
-  qr :   在当前命令行中输入「qr [页面名/启动模式] + 回车」 生成预览二维码
```
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)

---

## 后续迭代方向（M2+）

- Pipeline 场景录入与截图留痕
- 支持 Vue 项目
- 多文件修改预览
- 修改历史和撤销
- 组件库快速插入
- 样式可视化编辑
