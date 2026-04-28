# Cleffa - 项目路线图 (基于 cc-viewer)

## 里程碑概览

- ✅ **[M1: MVP Core](milestones/v1.0-ROADMAP.md)** — 6 phases, 17 files, +1559 LOC (2026-04-20 → 2026-04-22)
- ✅ **[M1.1: UI 优化](milestones/v1.1-ROADMAP.md)** — 2 phases, 选中元素 Tag + 状态栏 + 截图对比 POC + UI 打磨 (2026-04-22)
- ✅ **[M1.2: 可视化编辑体验增强](milestones/v1.2-ROADMAP.md)** — 4 phases, 默认值优化 + 终端替换 + 设计稿对比自动调整 (2026-04-23)
- ✅ **[M1.3: 优化可视区域](milestones/v1.3-ROADMAP.md)** — 2 phases, 布局重构 + 操作区折叠 + Anti-AI-Slop (2026-04-23)
- ✅ **[M1.4: 细节修复与上下文结构化](milestones/v1.4-ROADMAP.md)** — 2 phases, iframe URL 持久化 + XML 结构化元素上下文
- ✅ **[M1.5: 项目启动器 UI 改造](milestones/v1.5-ROADMAP.md)** — 2 phases, Launcher 迁移 SideMenu + PagePreview 常态化 + ANSI 过滤 + Available Pages 快捷导航 (2026-04-24)
- ✅ **[M1.6: Scenario 场景系统](milestones/v1.6-ROADMAP.md)** — 4 phases, 多页面状态快速导航 + storage 注入 + steps 执行引擎 + 批量截图画廊 + 固定场景
- ✅ **[M1.7: UI 启动体验优化](milestones/v1.7-REQUIREMENTS.md)** — 2 phases, 底部面板 Tab 化 + Available Pages QR 码
- 🚧 **[M1.8: 可视化编辑-场景优化](milestones/v1.8-REQUIREMENTS.md)** — 3 phases, Step 编辑器增强 + 录制优化 + 底部 Tab 集成 + AI 改进

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

## M1.7: UI 启动体验优化 ✅

### Phase 26: 可视化模式底部面板 Tab 化 + 折叠功能

**Goal:** 解决项目启动器遮挡 iframe 的问题，并为底部面板未来扩展做架构准备
**Description:** 将底部区域改为轻量 Tab 面板（项目启动器 + 元素信息），支持点击已激活 Tab 折叠为 32px 横条；iframe 高度通过 flex 自动响应
**Depends on:** Phase 25
**Status:** ✅ completed

### Phase 27: Available Pages QR 码生成

**Goal:** 在项目启动器的页面列表中，为每个页面新增 QR 码生成按钮，通过 stdin 命令 `sim <pageName>` 触发二维码输出到日志区
**Description:** 新增 `POST /api/project/stdin` 端点 + `projectManager.writeStdin()`；ProjectLauncher 页面列表每项新增 QR 按钮（QrcodeOutlined），点击发送 stdin；QR 内容展示在日志滚动区
**Depends on:** Phase 26
**Status:** ✅ completed

---

---

## M1.8: 可视化编辑-场景优化 🚧

**Goal:** 增强 Scenario Step 编辑器和录制体验，将场景面板整合到底部 Tab，扩展 step 类型体系
**Status:** 🚧 planned

### Phase 28: 场景面板底部 Tab 集成

**Goal:** 将 ScenarioPanel 从全屏独占视图迁移到底部 Tab，支持边预览边编辑场景
**Description:** BottomTabPanel 新增「场景」Tab，精简版 ScenarioPanel 嵌入 Tab 内容区；保留全屏场景视图入口
**Depends on:** Phase 27 (M1.7)
**Status:** 🚧 planned

### Phase 29: Step 编辑器全面增强

**Goal:** 扩展 step 类型体系，提供可视化元素选择器和 step 管理能力
**Description:** 新增 scroll/keyboard/hover/select/assert 五种 step 类型；可视化元素选择器（iframe 点击选元素）；拖拽排序、复制、分组折叠
**Depends on:** Phase 28
**Status:** 🚧 planned

### Phase 30: 录制体验优化 + AI 生成改进

**Goal:** 完善录制交互（暂停/恢复/插入），提升 AI 生成的灵活性和可控性
**Description:** 录制暂停/恢复、实时步骤预览、手动插入步骤；AI 可配置模型、新 step 类型生成支持、step 精炼
**Depends on:** Phase 29
**Status:** 🚧 planned

---

## 后续迭代方向（M2+）

- Pipeline 场景录入与截图留痕
- 支持 Vue 项目
- 多文件修改预览
- 修改历史和撤销
- 组件库快速插入
- 样式可视化编辑

---

## Backlog

### Phase 999.1: iframe 窗口尺寸选择器 (BACKLOG)

**Goal:** 在 iframe 预览区增加窗口尺寸选择器，支持 iPhone 16 Pro Max（430x932）和 375x932 两种固定尺寸，375 为设计稿标准尺寸
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)

### Phase 999.2: ui-design-verification skill 注入机制 (BACKLOG)

**Goal:** 评估并实现在视觉对比还原流程中自动引用 ui-design-verification skill 的最佳方案
**Context:** 当前点击视觉对比按钮时，没有指定使用 ui-design-verification skill，导致 Claude 不知道该 skill 的存在。两个候选方案：1) 将 skill 内容作为 prompt 注入到视觉对比请求中；2) 在 cc-viewer 使用过程里手动往项目注入（如写入 CLAUDE.md）
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)
