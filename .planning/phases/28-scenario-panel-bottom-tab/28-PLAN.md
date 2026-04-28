# Phase 28: 场景面板底部 Tab 集成 — PLAN

**Phase:** 28-scenario-panel-bottom-tab
**Status:** Ready for execution
**Planned:** 2026-04-28

---

## Goal

将 ScenarioPanel 从全屏独占视图迁移到底部 Tab，支持边预览边编辑场景。
BottomTabPanel 新增「场景」Tab，精简版 ScenarioPanel 嵌入 Tab 内容区；保留全屏场景视图入口。

---

## Step 1 — src/i18n.js：新增 visual.tabScenario 翻译键

**File:** `src/i18n.js`

在 `visual.tabElement` 条目之后插入：

```js
  "visual.tabScenario": { "zh": "场景", "en": "Scenario", "ja": "シナリオ" },
```

---

## Step 2 — ScenarioPanel.jsx：新增 compact prop

**File:** `src/components/VisualEditor/ScenarioPanel.jsx`

### 2a — 组件定义（第 161 行）

在参数解构中添加 `compact`，放在 `onRunScenario` 之前：

```js
export default function ScenarioPanel({ compact = false, onRunScenario, ...
```

### 2b — Header 区域（~第 212–234 行）

将 header 渲染逻辑改为：
- `compact` 为 true 时隐藏标题文字 `t('visual.menuScenarios')`（tab 已指示）
- `compact` 为 true 时隐藏 batchRun 按钮

```jsx
<div className={styles.scenarioPanelHeader}>
  {!compact && <Typography.Text strong>{t('visual.menuScenarios')}</Typography.Text>}
  <Space size={4}>
    {!compact && scenarios.length > 0 && (
      <Button size="small" icon={<CameraOutlined />} onClick={() => onBatchRun?.(scenarios)}>
        {t('visual.scenario.batchRun')}
      </Button>
    )}
    {isRecording ? (/* ... 保持不变 ... */}
```

---

## Step 3 — App.jsx：ui-edit 模式底部 Tab 新增「场景」Tab

**File:** `src/App.jsx`

### 3a — BottomTabPanel tabs 数组（第 700 行）

新增 'scenario' tab：

```jsx
tabs={[
  { key: 'element', labelKey: 'visual.tabElement' },
  { key: 'scenario', labelKey: 'visual.tabScenario' },
]}
```

### 3b — BottomTabPanel children（第 708–712 行）

新增 scenario children：

```jsx
{{
  element: (
    <ElementInfo element={this.state.selectedElement} />
  ),
  scenario: (
    <ScenarioPanel
      compact
      onRunScenario={this.handleRunScenario}
      scenarioProgress={this.state.scenarioProgress}
      onBatchRun={this.handleBatchRun}
      pinnedScenarioId={this.state.pinnedScenario?.id || null}
      onPinScenario={this.handlePinScenario}
      isRecording={this.state.isRecording}
      onStartRecording={this.handleStartRecording}
      onStopRecording={this.handleStopRecording}
      recordedSteps={this.state.recordedSteps}
    />
  ),
}}
```

---

## Step 4 — 构建与测试验证

```bash
npm run build
npm run test
```

---

## Acceptance Criteria

1. **场景 Tab 存在**：ui-edit 模式底部 Tab 栏显示「场景」Tab（与「元素信息」并列）
2. **场景 Tab 可操作**：切换到场景 Tab 后，可编辑 steps、运行、固定场景
3. **Tab 切换不丢失状态**：切换到 Element Info Tab 再切回，场景编辑状态不丢失
4. **全屏入口保留**：SideMenu「场景」项仍然打开全屏场景视图（含 batchRun、gallery）
5. **compact 模式正确**：底部 Tab 中的 ScenarioPanel 隐藏标题和 batchRun 按钮（避免冗余）
6. **构建通过**：`npm run build` 无错误

---

## Files Changed

| File | Action |
|------|--------|
| `src/i18n.js` | 新增 `visual.tabScenario` |
| `src/components/VisualEditor/ScenarioPanel.jsx` | 新增 `compact` prop，条件隐藏 header 标题 + batchRun |
| `src/App.jsx` | BottomTabPanel 新增 'scenario' tab + children |

---

## Out of Scope

- Step 类型扩展（scroll/keyboard/assert 等）— Phase 29
- 可视化元素选择器 — Phase 29
- 录制体验优化（暂停/恢复）— Phase 30
- AI 生成改进 — Phase 30
