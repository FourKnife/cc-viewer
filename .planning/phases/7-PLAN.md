---
phase: 07-selected-element-tag-statusbar
plan: 01
type: execute
wave: 1
depends_on: [06-01]
files_modified:
  - cc-viewer/src/components/VisualEditor/ElementInfo.jsx
  - cc-viewer/src/components/VisualEditor/styles.module.css
  - cc-viewer/src/components/ChatView.jsx
  - cc-viewer/src/App.jsx
  - cc-viewer/src/AppBase.jsx
  - cc-viewer/src/App.module.css
  - cc-viewer/src/i18n.js
files_created:
  - cc-viewer/src/components/VisualEditor/StatusBar.jsx
autonomous: true
requirements: [FR-007]
must_haves:
  truths:
    - "选中元素 Tag 在 ChatView 输入框上方正确显示"
    - "发送消息时自动注入选中元素上下文"
    - "ElementInfo 中 askAI 按钮已移除"
    - "StatusBar 在 visual 模式底部显示"
    - "Sketch MCP 连接状态可检测"
---

<objective>
为 Visual Editor 添加选中元素 Tag 交互和底部状态栏。

Purpose: 优化元素选中→AI修改的交互流程，新增全局状态栏展示关键信息
Output: ChatView 输入框 Tag 标记 + 底部 StatusBar
</objective>

<execution_context>
@.planning/phases/7-CONTEXT.md
</execution_context>

<tasks>

<task type="auto">
  <name>Task 1: 删除 ElementInfo 中的 askAI 按钮</name>
  <files>cc-viewer/src/components/VisualEditor/ElementInfo.jsx, cc-viewer/src/components/VisualEditor/styles.module.css</files>
  <action>
清理 ElementInfo 中被 Tag 交互替代的旧逻辑:

1. **ElementInfo.jsx** — 删除以下内容:
   - `buildContext` 函数（line 7-21）
   - `handleAskAI` 函数（line 26-29）
   - `Button`, `EditOutlined` 的 import
   - 底部 `askAiRow` div 及其 Button（line 126-129）

   删除后组件仅保留元素信息展示功能（tag、class、selector、position、text、computedStyle、sourceInfo）。

2. **styles.module.css** — 删除 `.askAiRow` 样式（line 215-217）
  </action>
  <verify>
    <automated>! grep -q "askAI\|askAi\|buildContext" cc-viewer/src/components/VisualEditor/ElementInfo.jsx && echo "askAI removed"</automated>
  </verify>
  <done>
- ElementInfo 仅展示元素信息，不含 AI 操作按钮
- askAiRow 样式已清理
  </done>
</task>

<task type="auto">
  <name>Task 2: ChatView 输入框新增选中元素 Tag</name>
  <files>cc-viewer/src/App.jsx, cc-viewer/src/components/ChatView.jsx</files>
  <action>
**A. App.jsx — 传递 props 到 ChatView（visual 模式）**

在 `chatViewWrapper` 内的 `<ChatView>` 组件上新增两个 props:
```jsx
selectedElement={viewMode === 'visual' ? this.state.selectedElement : null}
onDeselectElement={() => this.setState({ selectedElement: null })}
```

**B. ChatView.jsx — 渲染 Tag + 修改发送逻辑**

1. 在输入区域上方（textarea 之前），当 `this.props.selectedElement` 存在时渲染一个 Tag:

```jsx
{this.props.selectedElement && (
  <div className="ccv-element-tag">
    <span className="ccv-element-tag-content">
      &lt;{this.props.selectedElement.tag}&gt;
      {this.props.selectedElement.className && (
        <span className="ccv-element-tag-class">
          .{this.props.selectedElement.className.split(' ').slice(0, 2).join(' .')}
        </span>
      )}
    </span>
    <span className="ccv-element-tag-close" onClick={this.props.onDeselectElement}>×</span>
  </div>
)}
```

用内联样式或在 ChatView.module.css 中添加样式:
- Tag 容器: `display: inline-flex; align-items: center; gap: 4px; background: rgba(22,104,220,0.12); border: 1px solid rgba(22,104,220,0.3); border-radius: 4px; padding: 2px 6px 2px 8px; margin: 0 0 6px 0; font-size: 12px; color: var(--color-primary-light, #1668dc); font-family: monospace;`
- class 片段: `color: var(--text-muted, #888); margin-left: 4px;`
- 关闭按钮: `cursor: pointer; font-size: 14px; color: var(--text-muted); padding: 0 2px; border-radius: 2px;` hover 时颜色变亮

2. Tag 的渲染位置:
   在 ChatView 中找到输入区域（`_inputRef` textarea 所在的容器），在 textarea 上方渲染 Tag。
   具体位置: 搜索 `_inputRef` 的 textarea，在其父容器内、textarea 之前插入 Tag。

注意: ChatView 是 class component，使用 `this.props.selectedElement`。
  </action>
  <verify>
    <automated>grep -q "selectedElement" cc-viewer/src/components/ChatView.jsx && grep -q "ccv-element-tag" cc-viewer/src/components/ChatView.jsx && echo "Tag component added"</automated>
  </verify>
  <done>
- 选中元素时，ChatView 输入框上方显示 Tag
- Tag 展示: `<tag> .class-fragment`
- 点击 × 可取消选中
  </done>
</task>

<task type="auto">
  <name>Task 3: 发送时自动注入选中元素上下文</name>
  <files>cc-viewer/src/components/ChatView.jsx</files>
  <action>
**A. 新增 buildElementContext 工具函数**

在 ChatView.jsx 顶部（或 class 外部）添加:

```javascript
function buildElementContext(element) {
  const lines = ['请修改以下 React 组件中的元素:\n'];
  if (element.sourceInfo?.fileName) {
    lines.push('文件: ' + element.sourceInfo.fileName + ':' + element.sourceInfo.lineNumber);
  }
  if (element.sourceInfo?.componentName) {
    lines.push('组件: ' + element.sourceInfo.componentName);
  }
  const cls = element.className
    ? ' class="' + element.className.split(' ').slice(0, 3).join(' ') + '"'
    : '';
  lines.push('元素: <' + element.tag + cls + '>');
  if (element.selector) {
    lines.push('选择器: ' + element.selector);
  }
  lines.push('');
  return lines.join('\n');
}
```

**B. 修改发送逻辑**

找到 ChatView 中处理发送消息的方法（搜索 `handleSend` 或 `_sendMessage` 或 textarea 的 Enter 键处理），在发送前:

```javascript
let finalText = userInput;
if (this.props.selectedElement) {
  finalText = buildElementContext(this.props.selectedElement) + '用户要求: ' + userInput;
}
// 使用 finalText 替代原来的 userInput 发送
```

**C. 移除旧的 ccv-inject-input 事件机制**

删除 ChatView 中:
- `componentDidMount` 里的 `this._onInjectInput` 定义和 `window.addEventListener('ccv-inject-input', ...)`
- `componentWillUnmount` 里的 `window.removeEventListener('ccv-inject-input', ...)`
- `_onInjectInput` 方法本身

这个旧机制被 Tag + 自动注入完全替代。
  </action>
  <verify>
    <automated>grep -q "buildElementContext" cc-viewer/src/components/ChatView.jsx && ! grep -q "ccv-inject-input" cc-viewer/src/components/ChatView.jsx && echo "Auto-inject works, old mechanism removed"</automated>
  </verify>
  <done>
- 发送消息时，如有选中元素自动拼接上下文
- 旧的 ccv-inject-input 事件注入机制已移除
  </done>
</task>

<task type="auto">
  <name>Task 4: 创建 StatusBar 组件</name>
  <files>cc-viewer/src/components/VisualEditor/StatusBar.jsx, cc-viewer/src/components/VisualEditor/styles.module.css</files>
  <action>
**A. 新建 StatusBar.jsx**

```jsx
import React from 'react';
import { t } from '../../i18n';
import styles from './styles.module.css';

export default function StatusBar({ sketchMcpStatus, selectedElement }) {
  return (
    <div className={styles.statusBar}>
      <div className={styles.statusBarLeft}>
        <span className={styles.statusDot + ' ' + (sketchMcpStatus === 'connected' ? styles.statusDotConnected : styles.statusDotDisconnected)} />
        <span className={styles.statusLabel}>
          Sketch MCP {sketchMcpStatus === 'connected' ? t('visual.statusConnected') : t('visual.statusDisconnected')}
        </span>
      </div>
      <div className={styles.statusBarRight}>
        {selectedElement && (
          <>
            <span className={styles.statusSep}>|</span>
            <span className={styles.statusElement}>
              &lt;{selectedElement.tag}&gt;
              {selectedElement.className && (
                <span className={styles.statusClass}>
                  {' '}.{selectedElement.className.split(' ').slice(0, 2).join(' .')}
                </span>
              )}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
```

**B. styles.module.css — 在末尾添加 StatusBar 样式**

```css
/* StatusBar */
.statusBar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 24px;
  padding: 0 12px;
  background: var(--bg-primary, #111);
  border-top: 1px solid var(--border-color, #333);
  font-size: 11px;
  color: var(--text-muted, #666);
  flex-shrink: 0;
}
.statusBarLeft {
  display: flex;
  align-items: center;
  gap: 6px;
}
.statusBarRight {
  display: flex;
  align-items: center;
  gap: 6px;
}
.statusDot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.statusDotConnected {
  background: #52c41a;
}
.statusDotDisconnected {
  background: #666;
}
.statusLabel {
  color: var(--text-muted, #666);
}
.statusSep {
  color: var(--border-color, #333);
  margin: 0 2px;
}
.statusElement {
  font-family: monospace;
  color: var(--text-secondary, #b0b0b0);
}
.statusClass {
  color: var(--text-muted, #666);
}
```
  </action>
  <verify>
    <automated>test -f cc-viewer/src/components/VisualEditor/StatusBar.jsx && grep -q "statusBar" cc-viewer/src/components/VisualEditor/styles.module.css && echo "StatusBar created"</automated>
  </verify>
  <done>
- StatusBar 组件创建完成
- 展示 Sketch MCP 连接状态（绿/灰圆点）
- 展示选中元素标签和 class
  </done>
</task>

<task type="auto">
  <name>Task 5: Sketch MCP 心跳 + StatusBar 集成到布局</name>
  <files>cc-viewer/src/AppBase.jsx, cc-viewer/src/App.jsx, cc-viewer/src/App.module.css</files>
  <action>
**A. AppBase.jsx — 新增 sketchMcpStatus 状态和心跳**

1. 在 `this.state` 中新增:
```javascript
sketchMcpStatus: 'disconnected', // 'disconnected' | 'connected'
```

2. 在 `componentDidMount`（或 AppBase 中已有的初始化逻辑）中添加心跳:
```javascript
// Sketch MCP 心跳检测
this._checkSketchMcp = () => {
  fetch('http://localhost:31126/mcp', { method: 'HEAD', mode: 'no-cors' })
    .then(() => {
      if (!this._unmounted) this.setState({ sketchMcpStatus: 'connected' });
    })
    .catch(() => {
      if (!this._unmounted) this.setState({ sketchMcpStatus: 'disconnected' });
    });
};
this._checkSketchMcp();
this._sketchMcpTimer = setInterval(this._checkSketchMcp, 15000);
```

3. 在 `componentWillUnmount` 中清理:
```javascript
if (this._sketchMcpTimer) clearInterval(this._sketchMcpTimer);
```

注意: `mode: 'no-cors'` 用于跨域探测 — fetch 成功即认为连接可用（即使无法读取响应体）。如果 Sketch MCP 未启动，fetch 会 reject（网络错误）。

**B. App.jsx — 集成 StatusBar**

1. 在文件顶部添加 import:
```javascript
import StatusBar from './components/VisualEditor/StatusBar';
```

2. 在 visual 模式的渲染中，在 `</Layout.Content>` 之前、chatViewWrapper div 之后，添加 StatusBar:

在 `viewMode === 'visual'` 条件内，紧贴在 `chatViewWrapper` div 后方添加:
```jsx
{viewMode === 'visual' && (
  <div className={styles.statusBarWrapper}>
    <StatusBar
      sketchMcpStatus={this.state.sketchMcpStatus}
      selectedElement={this.state.selectedElement}
    />
  </div>
)}
```

注意 StatusBar 需要在 `Layout.Content` 之外渲染（紧跟其后），以实现全宽底部栏效果。或者在 `contentVisual` 容器内用 `flex-wrap: wrap` 让 StatusBar 独占一行。

更佳方案：将 StatusBar 放在 `Layout.Content` 内，但改为绝对定位底部，或者将 `contentVisual` 改为 `flex-wrap: wrap`。

**推荐实现**: 在 visual 模式下，整个 content 区域改为:
```
┌─ contentVisual (flex column) ──────────┐
│ ┌─ visualMain (flex row, flex:1) ────┐ │
│ │ sidebar │ preview │ chat           │ │
│ └────────────────────────────────────┘ │
│ ┌─ StatusBar (flex-shrink:0) ────────┐ │
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```

修改 App.jsx visual 模式渲染结构为:
```jsx
{viewMode === 'visual' && (
  <>
    <div className={styles.visualMain}>
      <div className={styles.visualSidebar}>...</div>
      <div className={styles.visualPreview}>...</div>
      <div className={styles.chatViewWrapper} style={{...}}>...</div>
    </div>
    <StatusBar
      sketchMcpStatus={this.state.sketchMcpStatus}
      selectedElement={this.state.selectedElement}
    />
  </>
)}
```

**C. App.module.css — 修改 visual 布局样式**

将 `.contentVisual` 改为 flex-direction: column:
```css
.contentVisual {
  display: flex !important;
  flex-direction: column !important;
}
.visualMain {
  display: flex;
  flex: 1;
  min-height: 0;
}
```

`.visualSidebar` 和 `.visualPreview` 样式保持不变。
  </action>
  <verify>
    <automated>grep -q "sketchMcpStatus" cc-viewer/src/AppBase.jsx && grep -q "StatusBar" cc-viewer/src/App.jsx && grep -q "visualMain" cc-viewer/src/App.module.css && echo "StatusBar integrated"</automated>
  </verify>
  <done>
- Sketch MCP 心跳每 15 秒检测一次
- StatusBar 在 visual 模式底部横跨全宽显示
- 布局从 row 改为 column + row 嵌套
  </done>
</task>

<task type="auto">
  <name>Task 6: i18n 补充 + 构建验证</name>
  <files>cc-viewer/src/i18n.js</files>
  <action>
**A. 新增 i18n 键**

在 i18n.js 的 `visual.*` 区域添加:

```javascript
"visual.statusConnected": {
  "zh": "已连接", "en": "Connected",
  "zh-TW": "已連線", "ko": "연결됨", "ja": "接続済み"
},
"visual.statusDisconnected": {
  "zh": "未连接", "en": "Disconnected",
  "zh-TW": "未連線", "ko": "연결 안됨", "ja": "未接続"
},
```

**B. 删除已废弃的 i18n 键**

删除 `visual.askAI` 条目（已被 Tag 交互替代）。

同时检查 `visual.aiModify`、`visual.promptPlaceholder`、`visual.selectToModify`、`visual.sending` 这些 PromptInput 相关的 key 是否还有引用。如果 PromptInput 已不再使用（App.jsx 注释: "PromptInput 已移除"），但 PromptInput.jsx 文件仍存在，这些 key 暂时保留。

**C. 运行构建验证**

```bash
cd /Users/duanrong/yuyan/duanrong/cleffa/cc-viewer && npm run build 2>&1 | tail -5
```
  </action>
  <verify>
    <automated>cd /Users/duanrong/yuyan/duanrong/cleffa/cc-viewer && npm run build 2>&1 | tail -3</automated>
  </verify>
  <done>
- i18n 新增 statusConnected / statusDisconnected
- visual.askAI 已删除
- npm run build 成功
  </done>
</task>

</tasks>

<verification>
## Phase 7 完成检查

1. **选中元素 Tag**
   - [ ] visual 模式下选中元素后，ChatView 输入框上方显示 Tag
   - [ ] Tag 展示元素标签名 + class 片段
   - [ ] 点击 × 可关闭 Tag（取消选中）
   - [ ] 未选中元素时 Tag 不显示

2. **自动注入上下文**
   - [ ] 有选中元素时发送消息，上下文自动拼接到 prompt 前
   - [ ] 无选中元素时正常发送（不影响普通对话）
   - [ ] 旧的 ccv-inject-input 机制已移除

3. **askAI 按钮清理**
   - [ ] ElementInfo 中不再有"AI修改此元素"按钮
   - [ ] buildContext / handleAskAI 已删除
   - [ ] 元素信息展示功能正常

4. **StatusBar**
   - [ ] visual 模式底部显示 StatusBar
   - [ ] 展示 Sketch MCP 连接状态（圆点 + 文字）
   - [ ] 展示当前选中元素信息
   - [ ] Sketch MCP 未启动时显示灰色"未连接"
   - [ ] 非 visual 模式不显示 StatusBar

5. **构建**
   - [ ] npm run build 成功
</verification>

<success_criteria>
1. 选中元素 Tag 在 ChatView 输入框上方正确显示且可关闭
2. 发送消息时自动注入选中元素上下文
3. ElementInfo askAI 按钮已移除
4. StatusBar 在 visual 模式底部显示 Sketch MCP 状态和选中元素信息
5. npm run build 成功
</success_criteria>
