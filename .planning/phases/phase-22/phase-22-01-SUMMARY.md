---
phase: 22
plan: 01
subsystem: scenario-system
tags: [scenario, crud, storage, ui, i18n]
key-files:
  created:
    - test/scenarios.test.js
    - src/utils/scenarioStorage.js
    - src/components/VisualEditor/ScenarioPanel.jsx
  modified:
    - server.js
    - src/i18n.js
    - src/components/VisualEditor/SideMenu.jsx
    - src/components/VisualEditor/styles.module.css
    - src/App.jsx
    - src/components/VisualEditor/PagePreview.jsx
decisions:
  - Used inline body parsing (req.on data/end) consistent with existing server.js patterns instead of a readBody helper
  - Scenario routes placed immediately before the proxy route block
  - TDD: RED commit (test file) → GREEN commit (implementation) followed
metrics:
  completed_date: "2026-04-27"
  tasks: 8
---

# Phase 22 Plan 01: Scenario System — Data Layer + Panel UI + Basic Run

Scenario CRUD server routes with exported storage helpers, frontend fetch utility, ScenarioPanel UI with inline form and localStorage injection, SideMenu entry, App.jsx wiring, and PagePreview run-scenario support.

## New Files

- `test/scenarios.test.js` — unit tests for `scenariosFilePath`, `readScenariosFile`, `writeScenariosFile`
- `src/utils/scenarioStorage.js` — frontend fetch wrappers: `getScenarios`, `createScenario`, `updateScenario`, `deleteScenario`
- `src/components/VisualEditor/ScenarioPanel.jsx` — full CRUD panel with `StorageEditor` and `ScenarioForm` sub-components

## Modified Files

- `server.js` — exported helpers (`scenariosFilePath`, `readScenariosFile`, `writeScenariosFile`) + GET/POST/PUT/DELETE `/api/scenarios` routes before proxy block
- `src/i18n.js` — 14 new keys under `visual.scenario.*` and `visual.menuScenarios`
- `src/components/VisualEditor/SideMenu.jsx` — added `ExperimentOutlined` icon + `scenarios` menu item after `launcher`
- `src/components/VisualEditor/styles.module.css` — appended ScenarioPanel CSS classes
- `src/App.jsx` — imported `ScenarioPanel`, added `pendingScenario: null` state, `handleRunScenario` method, scenarios branch in render, `pendingScenario`/`onScenarioDone` props on `PagePreview`
- `src/components/VisualEditor/PagePreview.jsx` — added `pendingScenario`/`onScenarioDone` to signature + useEffect that injects localStorage and navigates

## Verification

- Scenario unit tests: 4/4 pass
- Production build: success (31.83s)

## Deviations from Plan

**1. [Rule 1 - Bug] Inline body parsing instead of `readBody` helper**
- Found during: Task 1
- Issue: Plan referenced `readBody(req)` but no such helper exists in server.js; body parsing is done inline with `req.on('data', ...)` throughout the file
- Fix: Used the same inline pattern consistent with all other POST/PUT routes
- Files modified: server.js

## Known Stubs

None — all CRUD operations are fully wired to `.cleffa/scenarios.json` storage.

## Self-Check: PASSED

All 8 files verified present. Scenario tests 4/4 pass. Build succeeds.
