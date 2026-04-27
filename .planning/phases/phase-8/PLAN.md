# Phase 8: 截图对比 POC + UI 质量优化

## 目标
验证 iframe-Sketch 截图对比可行性 + 整体 UI 打磨

---

## Plan 8.1: 截图方案调研与 POC

**目标**: 调研并验证 iframe 截图 + Sketch 图层导出，实现对比原型

### 任务

#### 8.1.1 iframe 截图方案调研
**文件**: `cc-viewer/src/components/VisualEditor/PagePreview.jsx`

调研两种方案并输出结论：

**方案 A: html2canvas（已安装）**
- 在 PagePreview 中对 iframe 容器调用 html2canvas
- 限制：跨域 iframe 内容无法直接捕获（proxy 同源可能可行）
- 测试：proxy 模式下 html2canvas 能否渲染 iframe 内容
- 评估：渲染精度、性能、字体/图片加载

**方案 B: Chrome MCP screenshot**
- 项目已有 chrome-beta-mcp-server 可用（MCP 工具列表中存在）
- 使用 `chrome_screenshot` 对指定 tab 截图
- 优势：像素级精确，不受跨域限制
- 限制：依赖 Chrome MCP 连接，需要知道 tabId

**输出**: 在 CONTEXT.md 追加调研结论，选定方案

#### 8.1.2 Sketch MCP 图层导出调研
**文件**: `cc-viewer/src/AppBase.jsx`

- 调用 Sketch MCP 的导出相关接口（如果存在）
- 检查 `chrome_screenshot` 能否对 Sketch 窗口截图
- 评估：是否能获取当前 artboard/layer 的位图导出
- 如果 Sketch MCP 无导出能力，记录为"不可行"并跳过对比功能

**输出**: Sketch 导出能力评估

#### 8.1.3 截图对比原型（条件性）
**前置**: 8.1.1 和 8.1.2 至少有一种截图方案可行

**新文件**: `cc-viewer/src/components/VisualEditor/ScreenshotCompare.jsx`
**新文件**: `cc-viewer/src/components/VisualEditor/ScreenshotCompare.module.css`

功能：
- "截图对比"按钮（放在 PagePreview 工具栏）
- 点击后捕获当前 iframe 截图
- 如 Sketch 导出可行，同时获取 Sketch 截图
- 简单的左右 / 叠加对比 UI（使用 slider 拖动分割线）
- 图片缩放对齐

**修改文件**: `PagePreview.jsx` — 添加截图按钮和 ScreenshotCompare 引用

**验收**:
- [ ] 能截取 iframe 当前画面
- [ ] 对比 UI 可用（至少支持单张截图查看）
- [ ] 如 Sketch 可导出，支持双图对比

---

## Plan 8.2: UI 质量审计与优化

**目标**: 审查现有 UI，消除 AI slop，统一视觉体验

### 任务

#### 8.2.1 AI Slop 审计与清理
**文件**: 全局 CSS 和 VisualEditor 组件

检查并修复：
- 过度的渐变、阴影、圆角等"过度设计"元素
- 不必要的动画或过渡效果
- 不一致的间距（应统一使用 4px/8px 网格）
- 冗余的 CSS 变量或未使用的样式
- 过于花哨的空状态插图或文案

**修改文件**:
- `global.css` — 清理冗余变量
- `VisualEditor/styles.module.css` — 统一间距和视觉层次
- 其他受影响的 `.module.css` 文件

#### 8.2.2 视觉一致性优化
**文件**: VisualEditor 相关组件样式

优化项：
- 统一 border-radius（小组件 4px，卡片 8px，模态 12px）
- 统一 padding/margin 到 8px 网格系统
- 检查颜色使用是否都引用 CSS 变量（消除硬编码颜色）
- 确保 hover/active 状态反馈一致
- 检查字体大小层级（12px/13px/14px 层级）

**修改文件**:
- `VisualEditor/styles.module.css`
- `App.module.css`（如有间距不一致）

#### 8.2.3 空状态和 Loading 体验优化
**文件**: VisualEditor 组件

**PagePreview 空状态**:
- 替换简单的 `<Empty>` 为更有引导性的空状态
- 显示"启动项目"或"输入端口号"的引导提示

**ProjectLauncher Loading**:
- 启动过程中显示进度步骤（而非只有 loading 按钮）
- 错误状态使用 Alert 组件统一展示

**PromptInput 空状态**:
- 无选中元素时，显示提示"点击预览区域选择元素"
- 使用 Ant Design 的 Empty 或自定义引导组件

**修改文件**:
- `PagePreview.jsx` — 空状态优化
- `ProjectLauncher.jsx` — loading 状态优化
- `PromptInput.jsx` — 引导提示优化
- i18n 文件 — 新增翻译 key

**验收**:
- [ ] 无硬编码颜色值（全部使用 CSS 变量）
- [ ] 间距遵循 8px 网格
- [ ] 空状态提供明确的行动引导
- [ ] Loading 状态有进度反馈

---

## 执行顺序

1. **Plan 8.1** (截图 POC) — 先调研（8.1.1 + 8.1.2 并行），再决定是否做原型
2. **Plan 8.2** (UI 优化) — 可与 8.1 调研并行开始审计，调研完成后集中实施

## 风险

| 风险 | 影响 | 缓解 |
|------|------|------|
| html2canvas 无法捕获 proxy iframe | 截图方案受限 | 改用 Chrome MCP screenshot |
| Sketch MCP 无导出 API | 无法双图对比 | 仅做单侧截图查看 |
| UI 优化范围蔓延 | 时间超预期 | 限定在 VisualEditor 区域 |
