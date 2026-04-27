# Phase 13: 修复可视化编辑器终端 Enter 发送问题

## 目标

选中 DOM 元素后，终端输入行显示"选中区块"标识，按 Enter 正常发送 prompt（将元素上下文自动注入），而非粘贴文案。

## 问题根因

`TerminalPanel.jsx:311-325` 的 `onData` handler 中，当 `data === '\r'` 且 `selectedElement` 存在时：
1. 先发送 bracketed paste（`\x1b[200~\n` + context + `\x1b[201~`）
2. 再发送原始 `\r`

这导致 context 被"粘贴"进终端但不与用户输入一起提交——CLI 将 paste 和 Enter 分开处理。

## 修改方案

### 步骤 1: 修改 onData handler 的 Enter 拦截逻辑

文件: `src/components/TerminalPanel.jsx` (约 311-325 行)

**当前逻辑**: 检测 `\r` → 发送 bracketed paste context → 发送 `\r`

**改为**: 检测 `\r` 且有 selectedElement 时：
1. 读取终端当前输入行的用户文本
2. 将 context + 用户文本组合为完整 prompt
3. 用 bracketed paste 一次性发送：`\x1b[200~` + 完整文本 + `\x1b[201~\r`
4. 清空当前终端输入行（发送足够的退格或用 `\x15` Ctrl+U 清行）
5. return 后不再发送原始 `\r`

### 步骤 2: 选中元素时显示视觉标识

当 `this.props.selectedElement` 变化时，在终端 prompt 前写入一行提示文字如 `[选中: <div.className>]`，让用户知道上下文会被注入。

## 验证

- 选中元素 → 终端显示"选中区块"标识
- 输入 prompt + Enter → 完整 prompt（含元素上下文）发送到 CLI
- 取消选中 → 标识消失，Enter 行为恢复正常
