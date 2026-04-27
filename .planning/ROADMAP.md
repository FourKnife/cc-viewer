# Cleffa - 项目路线图 (基于 cc-viewer)

## 里程碑概览

- ✅ **[M1: MVP Core](milestones/v1.0-ROADMAP.md)** — 6 phases, 17 files, +1559 LOC (2026-04-20 → 2026-04-22)
- ✅ **[M1.1: UI 优化](milestones/v1.1-ROADMAP.md)** — 2 phases, 选中元素 Tag + 状态栏 + 截图对比 POC + UI 打磨 (2026-04-22)
- ✅ **[M1.2: 可视化编辑体验增强](milestones/v1.2-ROADMAP.md)** — 4 phases, 默认值优化 + 终端替换 + 设计稿对比自动调整 (2026-04-23)
- ✅ **[M1.3: 优化可视区域](milestones/v1.3-ROADMAP.md)** — 2 phases, 布局重构 + 操作区折叠 + Anti-AI-Slop (2026-04-23)
- ✅ **[M1.4: 细节修复与上下文结构化](milestones/v1.4-ROADMAP.md)** — 2 phases, iframe URL 持久化 + XML 结构化元素上下文
- ✅ **[M1.5: 项目启动器 UI 改造](milestones/v1.5-ROADMAP.md)** — 2 phases, Launcher 迁移 SideMenu + PagePreview 常态化 + ANSI 过滤 + Available Pages 快捷导航 (2026-04-24)
- ✅ **[M1.6: Scenario 场景系统](milestones/v1.6-ROADMAP.md)** — 4 phases, 多页面状态快速导航 + storage 注入 + steps 执行引擎 + 批量截图画廊 + 固定场景
- 🚧 **M1.7: 可视化编辑器体验改进** — 2 phases, 底部面板 Tab 化 + Available Pages QR 码

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

## M1.7: 可视化编辑器体验改进 🚧

### Phase 26: 可视化模式底部面板 Tab 化 + 折叠功能

**Goal:** 解决项目启动器遮挡 iframe 的问题，并为底部面板未来扩展做架构准备
**Description:** 将底部区域改为轻量 Tab 面板（项目启动器 + 元素信息），支持点击已激活 Tab 折叠为 32px 横条；iframe 高度通过 flex 自动响应
**Depends on:** Phase 25
**Status:** ✅ completed

### Phase 27: Available Pages QR 码生成

**Goal:** 在项目启动器的页面列表中，为每个页面新增 QR 码生成按钮，通过 stdin 命令 `sim <pageName>` 触发二维码输出到日志区
**Description:** 新增 `POST /api/project/stdin` 端点 + `projectManager.writeStdin()`；ProjectLauncher 页面列表每项新增 QR 按钮（QrcodeOutlined），点击发送 stdin；QR 内容展示在日志滚动区
**Depends on:** Phase 26
**Status:** 🔲 pending

---

## 后续迭代方向（M2+）

- Pipeline 场景录入与截图留痕
- 支持 Vue 项目
- 多文件修改预览
- 修改历史和撤销
- 组件库快速插入
- 样式可视化编辑
