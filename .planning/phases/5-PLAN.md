---
phase: 05-ai-modification
plan: 01
type: execute
wave: 1
depends_on: [04-01]
files_modified:
  - cc-viewer/src/components/VisualEditor/PromptInput.jsx
  - cc-viewer/src/components/VisualEditor/styles.module.css
  - cc-viewer/src/App.jsx
  - cc-viewer/src/i18n.js
autonomous: true
requirements: [FR-005]
must_haves:
  truths:
    - "选中元素后可输入修改意图"
    - "prompt 自动包含源码文件/行号/组件名上下文"
    - "通过 PTY WebSocket 发送给 Claude Code"
    - "Claude 修改后 iframe 自动热更新"
  artifacts:
    - path: "cc-viewer/src/components/VisualEditor/PromptInput.jsx"
      provides: "AI 修改输入组件"
  key_links:
    - from: "PromptInput.jsx"
      to: "WebSocket /ws/terminal"
      via: "构造 prompt → writeToPty"
    - from: "Claude Code"
      to: "iframe"
      via: "文件修改 → webpack HMR"
---

<objective>
将选中元素的上下文和用户修改意图发送给 Claude Code，实现 AI 驱动的代码修改。

Purpose: 完成"选中 → 描述 → 修改 → 预览"的核心闭环
Output: PromptInput 组件 + 上下文构造 + PTY 发送 + 热更新
</objective>

<execution_context>
@.planning/phases/5-CONTEXT.md
@.planning/phases/4-CONTEXT.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: 创建 PromptInput 组件</name>
  <files>cc-viewer/src/components/VisualEditor/PromptInput.jsx</files>
  <action>
创建 PromptInput 组件，在 ElementInfo 面板下方展示：

Props:
- `element` — 当前选中的元素信息（含 sourceInfo）
- `onSend` — 发送回调（App.jsx 负责 PTY 写入）
- `disabled` — PTY 未连接时禁用

功能:
1. TextArea 输入框 + 发送按钮
2. 选中元素变化时自动聚焦
3. 构造带上下文的 prompt
4. Enter 发送 / Shift+Enter 换行
5. 无选中元素时显示提示文字

```jsx
import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Typography } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { t } from '../../i18n';
import styles from './styles.module.css';

function buildPrompt(element, userInput) {
  const lines = ['请修改以下 React 组件中的元素:\n'];

  if (element.sourceInfo?.fileName) {
    lines.push(`文件: ${element.sourceInfo.fileName}:${element.sourceInfo.lineNumber}`);
  }
  if (element.sourceInfo?.componentName) {
    lines.push(`组件: ${element.sourceInfo.componentName}`);
  }
  lines.push(`元素: <${element.tag}${element.className ? ' class="' + element.className.split(' ').slice(0, 3).join(' ') + '"' : ''}>`);
  if (element.selector) {
    lines.push(`选择器: ${element.selector}`);
  }
  lines.push('');
  lines.push(`用户要求: ${userInput}`);

  return lines.join('\n');
}

export default function PromptInput({ element, onSend, disabled }) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);

  // 选中元素变化时聚焦
  useEffect(() => {
    if (element && inputRef.current) {
      inputRef.current.focus();
    }
  }, [element]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || !element) return;

    const prompt = buildPrompt(element, text);
    setSending(true);
    onSend?.(prompt);
    setInput('');
    // 短暂显示发送状态
    setTimeout(() => setSending(false), 1000);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!element) {
    return (
      <div className={styles.promptEmpty}>
        <Typography.Text type="secondary">{t('visual.selectToModify')}</Typography.Text>
      </div>
    );
  }

  return (
    <div className={styles.promptContainer}>
      <div className={styles.promptHeader}>
        <Typography.Text strong>{t('visual.aiModify')}</Typography.Text>
      </div>
      <div className={styles.promptInputRow}>
        <Input.TextArea
          ref={inputRef}
          className={styles.promptTextArea}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('visual.promptPlaceholder')}
          autoSize={{ minRows: 2, maxRows: 5 }}
          disabled={disabled || sending}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          disabled={!input.trim() || disabled || sending}
          loading={sending}
          className={styles.promptSendBtn}
        />
      </div>
    </div>
  );
}
```
  </action>
  <verify>
    <automated>test -f cc-viewer/src/components/VisualEditor/PromptInput.jsx && echo "PromptInput created"</automated>
  </verify>
  <done>
- PromptInput 组件创建
- buildPrompt 上下文构造
- Enter 发送 / Shift+Enter 换行
- 选中元素自动聚焦
  </done>
</task>

<task type="auto">
  <name>Task 2: App.jsx 集成 PromptInput + PTY 发送</name>
  <files>cc-viewer/src/App.jsx</files>
  <action>
在 App.jsx 中:

1. import PromptInput
2. 在 visual 模式的左侧栏中，ElementInfo 下方渲染 PromptInput
3. 实现 handleAIModify 方法：通过 WebSocket 向 PTY 写入构造好的 prompt

```jsx
// import
import PromptInput from './components/VisualEditor/PromptInput';

// 在 visual sidebar 中，ElementInfo 后面添加:
<PromptInput
  element={this.state.selectedElement}
  onSend={this.handleAIModify}
  disabled={!this.state.cliMode}
/>

// handleAIModify 方法:
handleAIModify = (prompt) => {
  // 通过 terminal WebSocket 发送到 Claude Code
  // ChatView 中的 TerminalPanel 已经维护了 ws 连接
  // 可以通过 window.dispatchEvent 触发
  window.dispatchEvent(new CustomEvent('ccv-terminal-send', { detail: { text: prompt + '\n' } }));
};
```

注意: 需要确认 ChatView/TerminalPanel 中是否监听了 ccv-terminal-send 事件。
如果没有，在 ChatView 的 terminal WebSocket 连接处添加监听:

```javascript
window.addEventListener('ccv-terminal-send', (e) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'input', data: e.detail.text }));
  }
});
```
  </action>
  <verify>
    <automated>grep -q "PromptInput" cc-viewer/src/App.jsx && grep -q "handleAIModify" cc-viewer/src/App.jsx && echo "Integration done"</automated>
  </verify>
  <done>
- PromptInput 集成到 visual sidebar
- handleAIModify 通过 WebSocket 发送 prompt
- 终端接收并转发给 Claude Code
  </done>
</task>

<task type="auto">
  <name>Task 3: PromptInput 样式</name>
  <files>cc-viewer/src/components/VisualEditor/styles.module.css</files>
  <action>
添加 PromptInput 相关的 CSS 样式:

```css
.promptContainer {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color, #333);
}
.promptHeader {
  margin-bottom: 8px;
  font-size: 13px;
}
.promptInputRow {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}
.promptTextArea {
  flex: 1;
  font-size: 13px;
  resize: none;
}
.promptSendBtn {
  flex-shrink: 0;
}
.promptEmpty {
  margin-top: 16px;
  padding: 12px;
  text-align: center;
  font-size: 12px;
}
```
  </action>
  <verify>
    <automated>grep -q "promptContainer" cc-viewer/src/components/VisualEditor/styles.module.css && echo "Styles added"</automated>
  </verify>
  <done>
- PromptInput 样式完成
  </done>
</task>

<task type="auto">
  <name>Task 4: i18n 键 + 构建验证</name>
  <files>cc-viewer/src/i18n.js</files>
  <action>
添加 AI 修改相关 i18n 键:
- visual.aiModify: AI 修改
- visual.promptPlaceholder: 描述你想要的修改...
- visual.selectToModify: 选中页面元素后输入修改意图
- visual.sending: 发送中...

运行 `npm run build` 验证。
  </action>
  <verify>
    <automated>cd /Users/duanrong/yuyan/duanrong/cleffa/cc-viewer && npm run build 2>&1 | tail -3</automated>
  </verify>
  <done>
- i18n 键添加
- 构建通过
  </done>
</task>

</tasks>

<verification>
## Phase 5 完成检查

1. **PromptInput 渲染**
   - [ ] 选中元素后左侧面板底部出现输入框
   - [ ] 未选中元素时显示提示文字
   - [ ] 输入框自动聚焦

2. **上下文构造**
   - [ ] 发送的 prompt 包含文件路径和行号
   - [ ] 发送的 prompt 包含组件名
   - [ ] 发送的 prompt 包含元素标签和选择器

3. **PTY 发送**
   - [ ] prompt 通过 WebSocket 发送到 Claude Code 终端
   - [ ] Claude Code 收到并开始处理
   - [ ] ChatView 中能看到 Claude 的回复

4. **热更新**
   - [ ] Claude 修改文件后 iframe 自动刷新
   - [ ] 修改效果在预览中可见

5. **端到端**
   - [ ] 选中按钮 → 输入"改成红色" → Claude 修改 CSS → 按钮变红
</verification>

<success_criteria>
1. PromptInput 组件正确渲染和交互
2. 发送的 prompt 包含完整上下文（文件/行号/组件名/选择器）
3. prompt 通过 PTY 成功发送给 Claude Code
4. ChatView 显示 Claude 的响应
5. npm run build 成功
</success_criteria>
