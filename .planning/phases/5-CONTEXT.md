# Phase 5 Context: AI 修改集成

## 决策摘要

| 决策点 | 决定 | 原因 |
|--------|------|------|
| AI 通信方式 | 复用 Claude Code PTY 终端 | 已有完整 CLI 集成，无需另建 API 链路 |
| 对话展示 | 复用现有 ChatView (compact 模式) | visual 模式右侧已渲染 ChatView |
| 文件修改 | Claude Code 直接修改 → webpack HMR | 全自动，无需手动写文件 |
| Prompt 输入 | 新建 PromptInput 组件 | 简洁的输入框 + 上下文注入 |
| Diff 预览 | 用户在 ChatView 中查看 | ChatView 已集成 DiffView |

---

## 技术方案

### 核心流程

```
选中元素 → 输入修改意图 → 自动构造带上下文的 prompt
    → 写入 Claude Code PTY → Claude 修改源码
    → webpack HMR 自动热更新 → iframe 刷新展示
```

### 1. PromptInput 组件

位置：ElementInfo 面板下方（左侧栏底部）

功能：
- 文本输入框 + 发送按钮
- 选中元素后自动聚焦
- 发送时自动注入元素上下文到 prompt
- 发送后清空输入框

### 2. Prompt 上下文构造

当用户输入"把按钮改成红色"时，实际发送给 Claude Code 的 prompt:

```
请修改以下 React 组件中的元素:

文件: src/components/TransferButton.tsx:42
组件: TransferButton
元素: <button class="btn-primary">
选择器: button.btn-primary

用户要求: 把按钮改成红色
```

### 3. 通过 PTY 发送

cc-viewer 的 pty-manager.js 提供:
- `writeToPty(data)` — 向 Claude Code CLI 写入文本
- `/ws/terminal` WebSocket — 实时终端通信

发送方式: 调用 `/api/terminal-write` 或通过 WebSocket 发送构造好的 prompt

### 4. 响应展示

- ChatView (compact 模式) 已在 visual 模式右侧渲染
- Claude 的回答（包括 DiffView）自动展示
- 用户可以在 ChatView 中继续对话、查看修改

### 5. 热更新

- Claude Code 修改文件后，webpack-dev-server 自动检测文件变化
- HMR 触发页面热更新
- iframe 自动反映修改结果
- 无需手动刷新

---

## 文件修改清单

### 新增文件

| 文件 | 功能 |
|------|------|
| `cc-viewer/src/components/VisualEditor/PromptInput.jsx` | AI 修改输入组件 |

### 修改文件

| 文件 | 改动 |
|------|------|
| `cc-viewer/src/App.jsx` | 传递 PTY 写入能力给 PromptInput |
| `cc-viewer/src/components/VisualEditor/styles.module.css` | PromptInput 样式 |
| `cc-viewer/src/i18n.js` | 添加 prompt 相关 i18n 键 |

---

## 依赖

- Phase 4 完成（sourceInfo 提供文件路径/行号/组件名）
- Claude Code CLI 已通过 PTY 连接（cc-viewer 启动时自动连接）

---

## 风险

| 风险 | 缓解措施 |
|------|----------|
| PTY 未连接 | 检测 PTY 状态，提示用户 |
| Claude 修改错误文件 | prompt 中明确指定文件路径 |
| HMR 不生效 | 提供手动刷新按钮 |
| 无 sourceInfo | 允许用户手动描述要修改的内容 |
