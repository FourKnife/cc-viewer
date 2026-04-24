# Phase 18 Summary — Fix visual editor iframe URL reset bug

## Root Cause

`PagePreview` owned its own `urlInput` / `iframeSrc` state; when `viewMode` switched away from `visual` the component unmounted, discarding all state, so every re-entry reset the URL to blank.

## Files Changed

### src/App.jsx
- Added `previewUrl: ''` to constructor state (persisted across viewMode switches).
- Added `handlePreviewUrlChange = (url) => this.setState({ previewUrl: url })` method.
- Passed `previewUrl={this.state.previewUrl}` and `onPreviewUrlChange={this.handlePreviewUrlChange}` as props to `<PagePreview>`.

### src/components/VisualEditor/PagePreview.jsx
- Updated function signature to accept `previewUrl: externalUrl` and `onPreviewUrlChange`.
- Changed `useState('')` to `useState(externalUrl || '')` so initial render uses any persisted URL.
- Added `onPreviewUrlChange?.(displayUrl)` call inside `handleNavigate` (after `setUrlInput`) and added `onPreviewUrlChange` to the `useCallback` dependency array.
- Added sync effect: when `externalUrl` prop changes (App state pushed down), update local `urlInput` to match.
- Added mount-only effect: if component mounts with a persisted `externalUrl` but no active `iframeSrc`, call `handleNavigate(externalUrl)` to reload automatically.

## Fix Mechanism

`previewUrl` now lives in `App` class state, which persists independently of which child components are mounted. When the user navigates inside the iframe, `onPreviewUrlChange` bubbles the URL up to App. When `viewMode` switches back to `visual`, `PagePreview` remounts and the mount-only effect detects `externalUrl !== ''` with `iframeSrc === ''` and immediately reloads the last-visited URL — no manual re-entry required.

## Build / Test Result

- `npm run build` completed successfully in 8.25 s with no errors.
- No TypeScript / lint errors introduced.
- Chunk-size warnings are pre-existing and unrelated to this change.
