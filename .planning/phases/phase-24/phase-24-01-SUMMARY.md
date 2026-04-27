---
phase: 24
plan: 01
subsystem: visual-editor
tags: [batch-screenshot, gallery, scenario, html2canvas]
key-files:
  created:
    - src/components/VisualEditor/ScenarioGallery.jsx
  modified:
    - src/components/VisualEditor/ScenarioPanel.jsx
    - src/components/VisualEditor/PagePreview.jsx
    - src/components/VisualEditor/styles.module.css
    - src/App.jsx
    - src/i18n.js
decisions:
  - Batch orchestration in App.jsx using instance vars (_batchScenarios, _batchIndex, _screenshotFn) to avoid closure staleness
  - PagePreview exposes captureFullScreenshot via onScreenshotReady callback (function ref pattern)
  - Gallery shown as a view swap within the scenarios panel area (showGallery state), no new menu item
  - JSZip not in package.json — batch download skipped, single download only
  - 500ms settle delay after scenario steps complete before taking screenshot
metrics:
  completed: "2026-04-27"
---

# Phase 24 Plan 01: Batch Screenshot + Gallery Summary

Batch screenshot gallery: "全部截图" button in ScenarioPanel runs all scenarios sequentially, captures html2canvas screenshots after each completes, and displays them in a grid gallery with lightbox + single download.

## Files Modified

- `src/components/VisualEditor/ScenarioGallery.jsx` — new grid gallery component with lightbox modal and download
- `src/components/VisualEditor/ScenarioPanel.jsx` — added `onBatchRun` prop, "全部截图" button in header
- `src/components/VisualEditor/PagePreview.jsx` — extracted `captureFullScreenshot`, exposed via `onScreenshotReady` callback
- `src/components/VisualEditor/styles.module.css` — gallery CSS (grid, card, lightbox modal)
- `src/App.jsx` — batch state, `handleBatchRun`, `handleBatchScenarioDone`, `_runNextBatchScenario`, ScenarioGallery render
- `src/i18n.js` — 8 new keys: `visual.scenario.batchRun`, `visual.scenario.gallery.*`

## Verification

- `node --test test/scenarios.test.js`: 4/4 pass
- `npm run build`: success (exit 0, built in 29s)

## Deviations from Plan

None — plan executed as specified. JSZip batch download skipped as instructed (not in package.json).

## Self-Check: PASSED

- ScenarioGallery.jsx: created
- ScenarioPanel.jsx: onBatchRun wired
- PagePreview.jsx: captureFullScreenshot + onScreenshotReady present
- App.jsx: handleBatchRun, handleBatchScenarioDone, ScenarioGallery import present
- Build: passed
- Tests: passed
