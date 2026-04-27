# Phase 7 Context: 选中元素 Tag + 状态栏

## 决策摘要

| 决策点 | 决定 | 原因 |
|--------|------|------|
| Tag 位置 | ChatView 输入框上方 | visual 模式下右侧 ChatView 是唯一输入入口，Tag 紧贴输入框最直观 |
| 上下文注入方式 | 发送时自动拼接 | 替代旧的 ccv-inject-input 事件注入，更可控、不污染用户输入 |
| askAI 按钮 | 删除 | 被 Tag + 自动注入完全替代，避免双重入口 |
| StatusBar 位置 | visual 模式底部，横跨所有列 | 类似 IDE 底部状态栏，信息密度高、不占主要空间 |
| Sketch MCP 检测 | 客户端 fetch 心跳 | 无需后端中转，直接 ping localhost:31126 即可 |

---

## 当前架构（Visual 模式）

```
┌─────────────┬──────────────────────┬────────────────┐
│ visualSidebar│   visualPreview     │  chatViewWrapper│
│ (280px)      │   (flex:1)          │  (400px)        │
│              │                      │                 │
│ ProjectLauncher│  PagePreview       │  ChatView       │
│ ElementInfo  │  (iframe+inspector) │  (对话+输入)    │
│              │                      │                 │
└─────────────┴──────────────────────┴────────────────┘
```

### Phase 7 目标架构

```
┌─────────────┬──────────────────────┬────────────────┐
│ visualSidebar│   visualPreview     │  chatViewWrapper│
│ (280px)      │   (flex:1)          │  (400px)        │
│              │                      │                 │
│ ProjectLauncher│  PagePreview       │  ChatView       │
│ ElementInfo  │  (iframe+inspector) │  [Tag] 输入框   │
│ (无askAI按钮)│                      │                 │
├─────────────┴──────────────────────┴────────────────┤
│ StatusBar: [Sketch MCP ●] | 图层: xxx | .class-name │
└─────────────────────────────────────────────────────┘
```

## 关键文件

| 文件 | 作用 | Phase 7 变更 |
|------|------|-------------|
| `App.jsx` | 主布局，visual 模式渲染 | 传递 selectedElement 到 ChatView，集成 StatusBar |
| `ChatView.jsx` | 对话视图 + 输入区 | 新增 Tag 渲染 + 发送时自动注入上下文 |
| `ElementInfo.jsx` | 选中元素信息面板 | 删除 askAI 按钮 + buildContext |
| `VisualEditor/styles.module.css` | Visual Editor 样式 | 删除 askAiRow 样式 |
| `App.module.css` | 主布局样式 | 新增 statusBar 样式 |
| `i18n.js` | 国际化 | 新增 StatusBar 相关 key，删除 visual.askAI |

## 状态管理

- `selectedElement`: 已在 AppBase state 中（line 90）
- 需新增: `sketchMcpStatus: 'disconnected' | 'connected' | 'checking'`
- ChatView 通过 props 接收 `selectedElement` + `onDeselectElement`

## 依赖

- Phase 1-6 全部完成（M1 MVP Core 已发布）
- Sketch MCP server 运行在 localhost:31126（可选，StatusBar 仅显示状态）
