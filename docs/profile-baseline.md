# Markdown Render Profiling — Baseline

**Purpose.** Quantify where time is spent when cc-viewer renders Markdown during
SSE streaming, so any future engine swap (markdown-it, Streamdown, react-markdown)
is decided against numbers, not assumptions.

## How to collect

1. `npm run dev` (Vite dev server — `import.meta.env.DEV === true`).
2. Open a long-running Claude Code conversation that streams >100 SSE chunks,
   ideally with mixed Markdown (headings, lists, fenced code in JS/Go/Python,
   a Mermaid diagram, a table).
3. Open DevTools console:
   - `window.__mdStats.summary()` — P50/P95 for parse and mount.
   - `window.__mdStats.reset()` before each recording.
   - `window.__mdStats.samples` — raw arrays for offline analysis.
4. Open DevTools Performance → record a 10-second slice mid-stream.
   Look for `md-parse` and `md-mount` measures in the User Timing track;
   stack frames attribute Layout/Paint to the surrounding mount.

## Fields to record

| Field | Definition | Source |
|---|---|---|
| `parseP50` / `parseP95` | `DOMPurify(marked.parse())` cost per chunk | `__mdStats.summary()` |
| `mountP50` / `mountP95` | React update + dangerouslySetInnerHTML DOM replace per chunk | `__mdStats.summary()` |
| `layoutMs` | browser Layout time inside a mount measure | Chrome Performance |
| `paintMs` | browser Paint time inside a mount measure | Chrome Performance |
| `chunksPerSec` | observed SSE cadence during capture | interceptor log or eyeball |

## Baseline run (TODO — fill in)

Date: _____________  Build: 1.6.163  Machine/Browser: _____________

Scenario: _________________________________________________________

| Metric | Value |
|---|---|
| parseN | |
| parseP50 (ms) | |
| parseP95 (ms) | |
| parseMax (ms) | |
| mountN | |
| mountP50 (ms) | |
| mountP95 (ms) | |
| mountMax (ms) | |
| Observed chunksPerSec | |
| Layout + Paint share of mount | |

## Decision matrix (P1 gate)

Branch, per Plan §IV:

| Dominant cost | Action |
|---|---|
| `parseP95 ≥ 50%` of (parse+mount) | P1-A: evaluate markdown-it + markdown-it-incremental |
| `mountP95 ≥ 50%` of (parse+mount) | P1-B: block-level React.memo split (no insertAdjacentHTML) |
| Both <30% of a human-perceivable frame budget (16ms) | P1-C: no change — close initiative |

## Notes

- Node-side unit test `test/markdown-stream.test.js` already shows that a
  1000-line mixed Markdown parses in ~4ms on the baseline machine; that is
  a ceiling for the parse component. Mount and paint are the remaining
  unknowns this file is meant to pin down.
- The profiler is gated on `import.meta.env.DEV`. Production builds compile
  every call to a no-op and drop the `window.__mdStats` surface.
