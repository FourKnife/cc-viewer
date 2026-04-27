---
phase: 25
plan: 01
subsystem: visual-editor
tags: [scenario, pin, auto-execute, iframe]
key-files:
  modified:
    - src/App.jsx
    - src/components/VisualEditor/ScenarioPanel.jsx
    - src/components/VisualEditor/PagePreview.jsx
    - src/components/VisualEditor/styles.module.css
    - src/i18n.js
decisions:
  - Store full pinnedScenario object in App state (not just id) to avoid lookup across component boundary
  - Use pinnedRunningRef boolean guard in PagePreview to prevent infinite onLoad loop
  - Reset guard after 500ms so subsequent manual refreshes re-run the pinned scenario
  - Pin indicator placed in URL bar as a small clickable tag (click to unpin)
metrics:
  completed: 2026-04-27
---

# Phase 25 Plan 01: Pinned Scenario (Auto-Rerun on Refresh) Summary

Implemented pinned scenario feature: users can pin one scenario per session; the iframe auto-executes it on every load without creating an infinite loop.

## Files Modified

- `src/i18n.js` — added `visual.scenario.pin`, `visual.scenario.unpin`, `visual.scenario.pinned` keys
- `src/App.jsx` — `pinnedScenario: null` state, `handlePinScenario` toggle, props passed to ScenarioPanel and PagePreview
- `src/components/VisualEditor/ScenarioPanel.jsx` — pin toggle button (PushpinOutlined/PushpinFilled) per row, pinned row highlight via `scenarioItemPinned`
- `src/components/VisualEditor/PagePreview.jsx` — `pinnedScenario`/`onUnpinScenario` props, `pinnedRunningRef` guard, auto-execute in `onLoad`, pin indicator tag in URL bar
- `src/components/VisualEditor/styles.module.css` — `.scenarioItemPinned`, `.pinnedScenarioTag` styles

## Verification

```
CCV_LOG_DIR=tmp node --test test/scenarios.test.js
# ✔ scenario storage helpers (4 tests passed)

npm run build
# ✓ built in 32.80s — exit 0
```

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- All 5 files modified exist and contain expected changes
- Build succeeded (exit 0)
- Tests passed (4/4)
