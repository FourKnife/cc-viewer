# Phase 23: Steps 执行引擎 — 上下文

## 目标

扩展 inspector postMessage 协议，支持在 iframe 内执行交互步骤序列（click/wait/fill）。

## 关键发现

### inspector-inject.js 当前协议

- 父 → iframe: `{ source: 'cc-visual-parent', type: 'enable'|'disable' }`
- iframe → 父: `{ source: 'cc-visual-inspector', type: 'hover'|'select'|'deselect'|'ready', data }`
- `sendToParent(type, data)` 工具函数已存在

### PagePreview.jsx 当前 pendingScenario 流程

- 注入 localStorage → `handleNavigate(url)` → 立即调用 `onScenarioDone()`
- Phase 23 需要改为：导航 → 等待 onLoad → 逐步执行 steps → 完成后调用 `onScenarioDone()`
- `handleNavigate` 通过递增 `iframeKey` 触发 iframe 重新挂载
- `onLoad` 在 JSX 中内联定义

### fill 步骤 React 兼容性

React 受控 input 忽略直接 `.value =` 赋值，需要：
1. `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, val)`
2. `el.dispatchEvent(new Event('input', { bubbles: true }))`

### 步骤执行设计

- `pendingStepsRef = useRef(null)` 持有 `{ scenario, stepIndex }`
- `pendingScenario` 变化时：注入 storage，设置 ref，导航
- `onLoad` 触发时：若 ref 非空，调用 `sendNextStep()`
- `sendNextStep()` 发送当前步骤的 `run-step` postMessage
- 消息处理器收到 `step-done`/`step-error` 后推进 stepIndex，继续或结束

## 文件清单

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| `public/inspector-inject.js` | 修改 | 新增 run-step 处理器 |
| `src/components/VisualEditor/PagePreview.jsx` | 修改 | 重设计 pendingScenario 执行流程 |
| `src/components/VisualEditor/ScenarioPanel.jsx` | 修改 | StepsEditor + 进度显示 |
| `src/App.jsx` | 修改 | scenarioProgress 状态 + handleStepProgress |
| `src/i18n.js` | 修改 | 步骤相关 i18n 键 |
