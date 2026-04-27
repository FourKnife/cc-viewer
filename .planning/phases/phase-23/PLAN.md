---
phase: phase-23
plan: 01
type: execute
wave: 1
depends_on:
  - phase-22
files_modified:
  - public/inspector-inject.js
  - src/components/VisualEditor/PagePreview.jsx
  - src/components/VisualEditor/ScenarioPanel.jsx
  - src/App.jsx
  - src/i18n.js
autonomous: true
requirements:
  - PHASE-23-STEPS-ENGINE
must_haves:
  truths:
    - "inspector-inject.js handles 'run-step' message from parent: click/wait/fill"
    - "inspector-inject.js sends 'step-done' after each step completes"
    - "inspector-inject.js sends 'step-error' (with warning) when selector not found, does not crash"
    - "PagePreview executes steps sequentially after iframe onLoad when pendingScenario has steps"
    - "PagePreview calls onScenarioDone only after all steps complete (or no steps)"
    - "PagePreview calls onStepProgress(current, total) during step execution"
    - "ScenarioPanel shows step progress indicator when running (N/M)"
    - "ScenarioPanel form includes StepsEditor: add/remove steps with type/selector/ms/value fields"
    - "App.jsx passes onStepProgress to PagePreview and scenarioProgress to ScenarioPanel"
    - "i18n keys visual.scenario.steps, visual.scenario.stepClick, visual.scenario.stepWait, visual.scenario.stepFill, visual.scenario.stepSelector, visual.scenario.stepMs, visual.scenario.stepValue, visual.scenario.running are added"
    - "All existing tests continue to pass"
    - "npm run build exits 0"
  artifacts:
    - path: "public/inspector-inject.js"
      provides: "run-step handler for click/wait/fill + step-done/step-error responses"
    - path: "src/components/VisualEditor/ScenarioPanel.jsx"
      provides: "StepsEditor sub-component + progress display"
  key_links:
    - from: "src/components/VisualEditor/PagePreview.jsx"
      to: "public/inspector-inject.js"
      via: "postMessage run-step / step-done protocol"
    - from: "src/App.jsx"
      to: "src/components/VisualEditor/PagePreview.jsx"
      via: "onStepProgress prop"
    - from: "src/App.jsx"
      to: "src/components/VisualEditor/ScenarioPanel.jsx"
      via: "scenarioProgress prop"
---

<objective>
Implement the Steps execution engine for Phase 23 of M1.6.

Extends the inspector postMessage protocol with run-step/step-done/step-error messages.
PagePreview executes steps sequentially after page load. ScenarioPanel shows progress and
allows editing steps in the form.

Purpose: Let developers record click/wait/fill sequences so scenarios can reach deep UI states
automatically, not just navigate to a URL.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/milestones/v1.6-REQUIREMENTS.md

Key facts discovered during research:

1. **inspector-inject.js** (`public/inspector-inject.js`):
   - Plain IIFE, injected by proxy into every proxied page
   - Current message protocol:
     - Parent → iframe: `{ source: 'cc-visual-parent', type: 'enable'|'disable' }`
     - Iframe → parent: `{ source: 'cc-visual-inspector', type: 'hover'|'select'|'deselect'|'ready', data }`
   - Message listener at line 182: `window.addEventListener('message', ...)`
   - `sendToParent(type, data)` helper at line 139

2. **PagePreview.jsx** current pendingScenario flow (lines 327-342):
   - Injects localStorage, calls `handleNavigate(url)`, immediately calls `onScenarioDone()`
   - Must be redesigned: steps need to run AFTER iframe onLoad
   - `handleNavigate` increments `iframeKey` → iframe remounts → `onLoad` fires
   - `onLoad` handler is inline JSX at line 508: clears load timer + setLoadError('')
   - `iframeRef` is a useRef at line 180
   - `sendInspectorCmd` sends to `iframe.contentWindow.postMessage`

3. **Step execution design** (prop-based, ref-driven):
   - Add `pendingStepsRef = useRef(null)` — holds `{ scenario, stepIndex }` during execution
   - When `pendingScenario` changes: inject storage, set `pendingStepsRef.current`, navigate
   - In `onLoad`: if `pendingStepsRef.current`, call `sendNextStep()`
   - `sendNextStep()`: reads current step from ref, sends `run-step` postMessage to iframe
   - Message handler: on `step-done`/`step-error`, advance stepIndex, call `sendNextStep()` or finish
   - On finish: call `onScenarioDone()`, clear ref, call `onStepProgress(0, 0)`

4. **fill step React compatibility**:
   - React controlled inputs ignore direct `.value =` assignment
   - Must use `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, val)`
   - Then dispatch `new Event('input', { bubbles: true })`

5. **ScenarioPanel.jsx** current state:
   - `ScenarioForm` has name/url/storage fields but no steps
   - Needs `StepsEditor` sub-component (similar to `StorageEditor`)
   - Needs `scenarioProgress` prop: `null | { current, total }` for progress display

6. **App.jsx** current state:
   - Has `pendingScenario` state + `handleRunScenario` method
   - Passes `pendingScenario` + `onScenarioDone` to PagePreview
   - Needs: `scenarioProgress` state + `handleStepProgress(current, total)` method
   - Pass `onStepProgress={this.handleStepProgress}` to PagePreview
   - Pass `scenarioProgress={this.state.scenarioProgress}` to ScenarioPanel

7. **i18n**: Add to `src/i18n.js` (frontend only)
   - Keys: `visual.scenario.steps`, `visual.scenario.stepClick`, `visual.scenario.stepWait`,
     `visual.scenario.stepFill`, `visual.scenario.stepSelector`, `visual.scenario.stepMs`,
     `visual.scenario.stepValue`, `visual.scenario.running`
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Extend inspector-inject.js with run-step handler</name>
  <files>public/inspector-inject.js</files>
  <action>
In `public/inspector-inject.js`, extend the message listener (currently at line 182) to handle `run-step`:

**Add nativeInputValueSetter helper** near the top of the IIFE (after `let selectedElement = null;`):

```js
  var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value') &&
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
```

**Extend the message listener** — replace the existing listener block:

```js
  // 接收父窗口指令
  window.addEventListener('message', function(e) {
    if (!e.data || e.data.source !== 'cc-visual-parent') return;
    if (e.data.type === 'enable') { enabled = true; }
    if (e.data.type === 'disable') {
      enabled = false;
      hoverOverlay.style.display = 'none';
      selectOverlay.style.display = 'none';
      selectedElement = null;
    }
    if (e.data.type === 'run-step') {
      var step = e.data.step;
      var stepIndex = e.data.stepIndex;
      try {
        if (step.type === 'click') {
          var clickEl = document.querySelector(step.selector);
          if (!clickEl) { sendToParent('step-error', { stepIndex: stepIndex, reason: 'selector not found: ' + step.selector }); return; }
          clickEl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          sendToParent('step-done', { stepIndex: stepIndex });
        } else if (step.type === 'wait') {
          setTimeout(function() { sendToParent('step-done', { stepIndex: stepIndex }); }, step.ms || 0);
        } else if (step.type === 'fill') {
          var fillEl = document.querySelector(step.selector);
          if (!fillEl) { sendToParent('step-error', { stepIndex: stepIndex, reason: 'selector not found: ' + step.selector }); return; }
          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(fillEl, step.value || '');
          } else {
            fillEl.value = step.value || '';
          }
          fillEl.dispatchEvent(new Event('input', { bubbles: true }));
          fillEl.dispatchEvent(new Event('change', { bubbles: true }));
          sendToParent('step-done', { stepIndex: stepIndex });
        } else {
          // Unknown step type — skip
          sendToParent('step-done', { stepIndex: stepIndex });
        }
      } catch (err) {
        sendToParent('step-error', { stepIndex: stepIndex, reason: String(err) });
      }
    }
  });
```
  </action>
  <verify>
    <automated>grep -q "run-step" public/inspector-inject.js && grep -q "step-done" public/inspector-inject.js && grep -q "step-error" public/inspector-inject.js</automated>
  </verify>
  <done>inspector-inject.js handles run-step (click/wait/fill) and sends step-done/step-error.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Add i18n keys for steps UI</name>
  <files>src/i18n.js</files>
  <action>
In `src/i18n.js`, add the following entries before the closing `};` of `i18nData` (after existing scenario keys):

```js
  "visual.scenario.steps": {
    "zh": "步骤",
    "en": "Steps"
  },
  "visual.scenario.stepClick": {
    "zh": "点击",
    "en": "Click"
  },
  "visual.scenario.stepWait": {
    "zh": "等待",
    "en": "Wait"
  },
  "visual.scenario.stepFill": {
    "zh": "填写",
    "en": "Fill"
  },
  "visual.scenario.stepSelector": {
    "zh": "选择器",
    "en": "Selector"
  },
  "visual.scenario.stepMs": {
    "zh": "毫秒",
    "en": "ms"
  },
  "visual.scenario.stepValue": {
    "zh": "值",
    "en": "Value"
  },
  "visual.scenario.running": {
    "zh": "运行中",
    "en": "Running"
  }
```
  </action>
  <verify>
    <automated>grep -q "visual.scenario.steps" src/i18n.js && grep -q "visual.scenario.running" src/i18n.js</automated>
  </verify>
  <done>All step i18n keys added to src/i18n.js.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Redesign pendingScenario execution in PagePreview.jsx</name>
  <files>src/components/VisualEditor/PagePreview.jsx</files>
  <action>
Read `src/components/VisualEditor/PagePreview.jsx` first to confirm current line numbers.

**Part A — Add new props to function signature**:

Find the current signature (contains `pendingScenario, onScenarioDone`) and add `onStepProgress`:

```js
export default function PagePreview({ port, previewUrl: externalUrl, onPreviewUrlChange, onElementHover, onElementSelect, onElementDeselect, selectedElement, sketchMcpStatus, onElementScreenshot, pendingScenario, onScenarioDone, onStepProgress })
```

**Part B — Add pendingStepsRef** after `iframeRef`:

```js
  const pendingStepsRef = useRef(null); // { scenario, stepIndex } during step execution
```

**Part C — Add sendNextStep helper** (after `sendInspectorCmd`):

```js
  const sendNextStep = useCallback(() => {
    const state = pendingStepsRef.current;
    if (!state) return;
    const { scenario, stepIndex } = state;
    const steps = scenario.steps || [];
    if (stepIndex >= steps.length) {
      // All steps done
      pendingStepsRef.current = null;
      onStepProgress?.(0, 0);
      onScenarioDone?.();
      return;
    }
    onStepProgress?.(stepIndex + 1, steps.length);
    const iframe = iframeRef.current;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(
        { source: 'cc-visual-parent', type: 'run-step', step: steps[stepIndex], stepIndex },
        '*'
      );
    }
  }, [onScenarioDone, onStepProgress]);
```

**Part D — Replace the existing pendingScenario useEffect** (lines ~327-342):

```js
  // 执行 pendingScenario：注入 localStorage → 导航 → 执行 steps
  useEffect(() => {
    if (!pendingScenario) return;
    const iframe = iframeRef.current;
    try {
      const win = iframe?.contentWindow;
      if (win && pendingScenario.storage) {
        Object.entries(pendingScenario.storage).forEach(([k, v]) => {
          win.localStorage.setItem(k, v);
        });
      }
    } catch (err) {
      console.warn('localStorage inject failed:', err);
    }
    const steps = pendingScenario.steps || [];
    if (steps.length > 0) {
      pendingStepsRef.current = { scenario: pendingScenario, stepIndex: 0 };
      // steps will execute in onLoad after navigation completes
    } else {
      pendingStepsRef.current = null;
      onScenarioDone?.();
    }
    handleNavigate(pendingScenario.url);
  }, [pendingScenario]); // eslint-disable-line react-hooks/exhaustive-deps
```

**Part E — Extend the message handler** to handle `step-done` and `step-error`.

Find the existing `handleMessage` function (around line 292) and add cases:

```js
        case 'step-done':
          if (pendingStepsRef.current) {
            pendingStepsRef.current.stepIndex++;
            sendNextStep();
          }
          break;
        case 'step-error':
          console.warn('Step error:', e.data.data);
          if (pendingStepsRef.current) {
            pendingStepsRef.current.stepIndex++;
            sendNextStep();
          }
          break;
```

Also add `sendNextStep` to the useEffect dependency array for the message listener.

**Part F — Extend the onLoad handler** in JSX (line ~508):

Find:
```jsx
onLoad={() => { if (loadTimerRef.current) { clearTimeout(loadTimerRef.current); loadTimerRef.current = null; } setLoadError(''); }}
```

Replace with:
```jsx
onLoad={() => {
  if (loadTimerRef.current) { clearTimeout(loadTimerRef.current); loadTimerRef.current = null; }
  setLoadError('');
  if (pendingStepsRef.current) { sendNextStep(); }
}}
```
  </action>
  <verify>
    <automated>npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>PagePreview executes steps sequentially after onLoad, calls onStepProgress, calls onScenarioDone after all steps.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 4: Add StepsEditor + progress display to ScenarioPanel.jsx</name>
  <files>src/components/VisualEditor/ScenarioPanel.jsx</files>
  <action>
Read `src/components/VisualEditor/ScenarioPanel.jsx` first.

**Part A — Add `scenarioProgress` prop** to `ScenarioPanel`:

```js
export default function ScenarioPanel({ onRunScenario, scenarioProgress })
```

**Part B — Add `StepsEditor` component** (add before `ScenarioForm`):

```jsx
function StepsEditor({ steps, onChange }) {
  const addStep = () => onChange([...steps, { type: 'click', selector: '' }]);
  const removeStep = (i) => onChange(steps.filter((_, idx) => idx !== i));
  const updateStep = (i, field, val) => {
    const next = steps.map((s, idx) => idx === i ? { ...s, [field]: val } : s);
    onChange(next);
  };
  const typeOptions = [
    { value: 'click', label: t('visual.scenario.stepClick') },
    { value: 'wait', label: t('visual.scenario.stepWait') },
    { value: 'fill', label: t('visual.scenario.stepFill') },
  ];
  return (
    <div>
      {steps.map((s, i) => (
        <Space key={i} style={{ display: 'flex', marginBottom: 4, alignItems: 'flex-start' }}>
          <select
            value={s.type}
            onChange={e => updateStep(i, 'type', e.target.value)}
            style={{ fontSize: 12, padding: '1px 4px', height: 24 }}
          >
            {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {s.type === 'wait' ? (
            <Input
              size="small"
              type="number"
              placeholder={t('visual.scenario.stepMs')}
              value={s.ms || ''}
              onChange={e => updateStep(i, 'ms', Number(e.target.value))}
              style={{ width: 80 }}
            />
          ) : (
            <Input
              size="small"
              placeholder={t('visual.scenario.stepSelector')}
              value={s.selector || ''}
              onChange={e => updateStep(i, 'selector', e.target.value)}
              style={{ width: 140 }}
            />
          )}
          {s.type === 'fill' && (
            <Input
              size="small"
              placeholder={t('visual.scenario.stepValue')}
              value={s.value || ''}
              onChange={e => updateStep(i, 'value', e.target.value)}
              style={{ width: 100 }}
            />
          )}
          <MinusCircleOutlined onClick={() => removeStep(i)} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} />
        </Space>
      ))}
      <Button size="small" icon={<PlusOutlined />} onClick={addStep} type="dashed" style={{ marginTop: 4 }}>
        {t('visual.scenario.steps')}
      </Button>
    </div>
  );
}
```

**Part C — Add steps state to `ScenarioForm`**:

In `ScenarioForm`, add steps state:
```js
  const [steps, setSteps] = useState(initial?.steps || []);
```

In `handleSave`, include steps:
```js
    onSave({ name: name.trim(), url: url.trim(), storage, steps });
```

Add `StepsEditor` to the form JSX (after the storage section):
```jsx
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('visual.scenario.steps')}</Typography.Text>
        <StepsEditor steps={steps} onChange={setSteps} />
```

**Part D — Add progress display** in `ScenarioPanel` render.

In the panel header area, add a progress indicator when `scenarioProgress` is active:

```jsx
      {scenarioProgress && scenarioProgress.total > 0 && (
        <div style={{ padding: '4px 12px', fontSize: 12, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-primary)' }}>
          {t('visual.scenario.running')} {scenarioProgress.current}/{scenarioProgress.total}
        </div>
      )}
```

Place this after the header div and before the `showAdd` block.
  </action>
  <verify>
    <automated>npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>ScenarioPanel has StepsEditor in form, progress display when running.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 5: Wire scenarioProgress in App.jsx</name>
  <files>src/App.jsx</files>
  <action>
Read `src/App.jsx` first to confirm current state structure and render section.

**Part A — Add `scenarioProgress` state** (after `pendingScenario: null`):
```js
scenarioProgress: null,
```

**Part B — Add `handleStepProgress` method** (after `handleRunScenario`):
```js
handleStepProgress = (current, total) => {
  this.setState({ scenarioProgress: total > 0 ? { current, total } : null });
};
```

**Part C — Pass `onStepProgress` to PagePreview**:

Find the PagePreview usage and add:
```jsx
onStepProgress={this.handleStepProgress}
```

**Part D — Pass `scenarioProgress` to ScenarioPanel**:

Find the ScenarioPanel usage and add:
```jsx
scenarioProgress={this.state.scenarioProgress}
```
  </action>
  <verify>
    <automated>npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>App.jsx wires scenarioProgress state through PagePreview → ScenarioPanel.</done>
</task>

</tasks>

<verification>
After all tasks complete, run the full verification sequence:

```bash
# 1. Existing scenario unit tests (no regressions)
CCV_LOG_DIR=tmp node --test test/scenarios.test.js

# 2. Full test suite
CCV_LOG_DIR=tmp node --test 2>&1 | tail -10

# 3. Production build
npm run build 2>&1 | tail -10
```

Expected: all tests pass, build exits 0.

Manual spot-check (if browser available):
1. Open ScenarioPanel → Edit an existing scenario → Steps section appears with Add button
2. Add a click step with selector ".some-button" → Save
3. Run the scenario → iframe navigates, then step executes
4. Progress indicator shows "运行中 1/1" during execution
5. After completion, progress clears
</verification>

<success_criteria>
- `inspector-inject.js` handles `run-step` for click/wait/fill
- Steps execute sequentially after iframe onLoad
- `onScenarioDone` called only after all steps complete
- ScenarioPanel form shows StepsEditor
- Progress indicator shows during execution
- All existing tests pass
- `npm run build` exits 0
</success_criteria>

<output>
After completion, create `.planning/phases/phase-23/phase-23-01-SUMMARY.md` with:
- Files modified and what changed
- Confirmation that all tests pass and build succeeds
- Any deviations from plan
</output>
