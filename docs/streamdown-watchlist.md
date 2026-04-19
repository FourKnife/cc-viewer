# Streamdown Reevaluation Watchlist

A migration to Vercel Streamdown was evaluated in April 2026 and deferred:
5 open issues in the library were judged serious enough — combined with an
unverified performance claim and a Tailwind CSS dependency conflict with
Ant Design + CSS Modules — that the risk exceeded the upside for this
personal-open-source project. The full rationale lives in the approved plan.

This file tracks the conditions under which that decision should be revisited.

## Rule

Reevaluate when **at least 4** of the items below flip to ✅.

| # | Condition | Upstream tracker | Last checked | Status |
|---|---|---|---|---|
| 1 | Shiki default engine no longer triggers CSP `unsafe-eval` (or @streamdown/code ships a JS-engine path by default) | [vercel/streamdown#384](https://github.com/vercel/streamdown/issues/384) | 2026-04-18 | ❌ |
| 2 | `mermaid` demoted from `dependencies` to `peerDependencies` (or sharded into a lazy plugin with zero base cost) | [vercel/streamdown#501](https://github.com/vercel/streamdown/issues/501) | 2026-04-18 | ❌ |
| 3 | Lazy-loaded CodeBlock / Mermaid shipped with an internal error boundary so a stale chunk 404 no longer crashes the app | [vercel/streamdown#343](https://github.com/vercel/streamdown/issues/343) | 2026-04-18 | ❌ |
| 4 | No catastrophic regex backtracking on Go struct-tag backticks or similar patterns | [vercel/streamdown#357](https://github.com/vercel/streamdown/issues/357) | 2026-04-18 | ❌ |
| 5 | @streamdown/mermaid no longer pulls a vulnerable lodash-es version | [vercel/streamdown#368](https://github.com/vercel/streamdown/issues/368) | 2026-04-18 | ❌ |
| 6 | Official benchmark published against react-markdown AND marked on realistic AI streams | streamdown.ai docs | 2026-04-18 | ❌ |
| 7 | Six consecutive months without a breaking API change on the `<Streamdown>` props surface | GitHub releases | 2026-04-18 | ❌ |
| 8 | Documented non-Tailwind integration path (or all defaults exposed via CSS variables, no `@source` directive required) | streamdown.ai/docs/styling | 2026-04-18 | ❌ |

## Review cadence

- Recheck every **8 weeks**. Update the "Last checked" column even on "no change".
- If a condition flips, add a one-line note below with the commit / release / PR that triggered it.

## Change log

- 2026-04-18 — File created; all conditions ❌.
