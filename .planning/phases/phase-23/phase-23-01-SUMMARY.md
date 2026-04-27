---
phase: 23
plan: 01
subsystem: visual-editor
tags: [steps-engine, scenario, postmessage, inspector]
key-files:
  modified:
    - public/inspector-inject.js
    - src/i18n.js
    - src/components/VisualEditor/PagePreview.jsx
    - src/components/VisualEditor/ScenarioPanel.jsx
    - src/App.jsx
decisions:
  - Steps execute sequentially after iframe onLoad via ref-driven state machine
  - step-error advances stepIndex (skip-on-error) rather than aborting scenario
---

# Phase 23 Plan 01: Steps Execution Engine Summary

Implemented the scenario steps execution engine end-to-end: postMessage protocol extension, ref-driven step sequencing in PagePreview, StepsEditor UI in ScenarioPanel, and progress wiring through App.jsx.

## Files Modified

### public/inspector-inject.js
- Added `nativeInputValueSetter` helper for React-compatible input filling
- Added `run-step` message handler supporting `click`, `wait`, `fill` step types
- Sends `step-done` / `step-error` back to parent after each step

### src/i18n.js
- Added 8 new keys: `visual.scenario.steps`, `stepClick`, `stepWait`, `stepFill`, `stepSelector`, `stepMs`, `stepValue`, `visual.scenario.running`

### src/components/VisualEditor/PagePreview.jsx
- Added `onStepProgress` prop to function signature
- Added `pendingStepsRef` to hold `{ scenario, stepIndex }` during execution
- Added `sendNextStep` useCallback that reads ref state and posts `run-step` to iframe
- Redesigned `pendingScenario` useEffect: sets ref before navigating, calls `onScenarioDone` immediately only when scenario has no steps
- Added `step-done` / `step-error` cases to message handler (skip-on-error semantics)
- Extended `onLoad` handler to call `sendNextStep()` when ref is non-null

### src/components/VisualEditor/ScenarioPanel.jsx
- Added `scenarioProgress` prop to `ScenarioPanel`
- Added `StepsEditor` component with click/wait/fill step types
- Updated `ScenarioForm` to manage `steps` state and render `StepsEditor`
- Added progress display bar below header when `scenarioProgress.total > 0`

### src/App.jsx
- Added `scenarioProgress: null` to initial state
- Added `handleStepProgress(current, total)` method
- Passed `onStepProgress={this.handleStepProgress}` to `PagePreview`
- Passed `scenarioProgress={this.state.scenarioProgress}` to `ScenarioPanel`

## Verification

- `test/scenarios.test.js`: 4/4 tests pass
- `npm run build`: succeeds (built in ~16s, no errors)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- public/inspector-inject.js: FOUND, contains run-step and step-done
- src/i18n.js: FOUND, contains visual.scenario.steps and visual.scenario.running
- src/components/VisualEditor/PagePreview.jsx: FOUND, contains pendingStepsRef and sendNextStep
- src/components/VisualEditor/ScenarioPanel.jsx: FOUND, contains StepsEditor and scenarioProgress
- src/App.jsx: FOUND, contains handleStepProgress and scenarioProgress state
