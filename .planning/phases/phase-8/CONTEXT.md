# Phase 8 Context: 截图对比 POC + UI 质量优化

## 目标

验证 iframe-Sketch 截图对比可行性 + 整体 UI 打磨

## 现状摘要

### 截图能力
- html2canvas 已安装 (^1.4.1)，MarkdownBlock 和 TeamSessionPanel 已有使用模式
- iframe 通过 proxy 加载（`/api/proxy/{port}/{path}`），注入 inspector 脚本
- Sketch MCP 仅有心跳检测（HEAD 到 localhost:31126/mcp），无图层导出
- Chrome MCP 未集成到项目依赖中

### UI 现状
- CSS Modules + 70+ CSS 自定义变量（global.css）
- Ant Design v5.29.2 作为组件库
- 33 个 .module.css 文件，模式不完全一致
- Empty/Loading 状态未标准化
- VisualEditor 侧边栏固定 320px

### 关键文件
- PagePreview.jsx — iframe 预览
- AppBase.jsx — Sketch MCP 状态管理
- MarkdownBlock.jsx — html2canvas 使用模式
- global.css — 主题变量
- VisualEditor/styles.module.css — 视觉编辑器样式

## 约束
- 截图对比是 POC 性质，验证可行性即可
- UI 优化应保守，不改变功能逻辑
- 依赖 Phase 7 完成（StatusBar 等组件）
