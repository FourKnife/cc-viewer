---
phase: phase-20
plan: 01
type: execute
wave: 1
depends_on:
  - phase-19
files_modified:
  - src/components/VisualEditor/SideMenu.jsx
  - src/components/VisualEditor/BottomTabPanel.jsx
  - src/components/VisualEditor/BottomTabPanel.module.css
  - src/components/VisualEditor/PagePreview.jsx
  - src/components/VisualEditor/ProjectLauncher.jsx
  - src/components/VisualEditor/styles.module.css
  - src/App.jsx
  - src/App.module.css
  - src/i18n.js
autonomous: true
requirements:
  - PHASE-20-SIDEMENU-LAUNCHER
must_haves:
  truths:
    - "SideMenu has 3 items: ui-edit, launcher, pipeline — in that order"
    - "launcher icon is RocketOutlined, label is t('visual.menuLauncher')"
    - "visualMenuKey === 'launcher' renders ProjectLauncher full-height in visualCenter (no BottomTabPanel, no resizer, no StatusBar wrapping)"
    - "visualMenuKey === 'ui-edit' renders PagePreview + resizer + BottomTabPanel (element tab only)"
    - "BottomTabPanel TABS array is driven by a `tabs` prop instead of a hardcoded constant"
    - "When tabs array is empty, BottomTabPanel renders nothing"
    - "When tabs array has 1 item, tab bar still renders the single tab label (no functional change needed for single-tab visual simplification)"
    - "PagePreview no longer has the !port && !iframeSrc empty-state guard — URL bar is always rendered"
    - "When iframeSrc is empty, the iframe area shows a blank placeholder (no <iframe> element)"
    - "ProjectLauncher no longer accepts collapsed / onToggleCollapse props — always shows full view"
    - "ProjectLauncher removes the collapsed rendering branch"
    - "i18n key 'visual.menuLauncher' is added with zh/en/ja translations"
    - "npm run build exits 0 with no errors"
  artifacts:
    - path: "src/components/VisualEditor/SideMenu.jsx"
      provides: "Updated SideMenu with launcher menu item"
    - path: "src/components/VisualEditor/BottomTabPanel.jsx"
      provides: "Dynamic tabs via props"
    - path: "src/components/VisualEditor/PagePreview.jsx"
      provides: "Always-visible URL bar"
    - path: "src/components/VisualEditor/ProjectLauncher.jsx"
      provides: "Simplified launcher without collapsed state"
    - path: "src/i18n.js"
      provides: "New visual.menuLauncher i18n entries"
  key_links:
    - from: "src/App.jsx"
      to: "src/components/VisualEditor/SideMenu.jsx"
      via: "import SideMenu"
      pattern: "sideMenu"
    - from: "src/App.jsx"
      to: "src/components/VisualEditor/ProjectLauncher.jsx"
      via: "import ProjectLauncher"
      pattern: "ProjectLauncher"
    - from: "src/App.jsx"
      to: "src/components/VisualEditor/PagePreview.jsx"
      via: "import PagePreview"
      pattern: "PagePreview"
    - from: "src/App.jsx"
      to: "src/components/VisualEditor/BottomTabPanel.jsx"
      via: "import BottomTabPanel"
      pattern: "BottomTabPanel"
---

<objective>
Restructure the visual editor layout by promoting ProjectLauncher from a BottomTabPanel tab to a full SideMenu entry, removing the launcher tab from the bottom panel, and making PagePreview always display its URL input bar regardless of project state.

Purpose: This gives the project launcher more screen space for log output, separates the launch workflow from the element-inspection workflow, and lets users enter arbitrary URLs in the preview pane without needing a local project running.

Output: Updated SideMenu.jsx, BottomTabPanel.jsx, PagePreview.jsx, ProjectLauncher.jsx, App.jsx, i18n.js, and related CSS files.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/phase-20/CONTEXT.md

Key facts discovered during planning:

1. **SideMenu current structure** (`src/components/VisualEditor/SideMenu.jsx`):
   - items array: `[{key:'ui-edit', icon:EditOutlined}, {key:'pipeline', icon:ApiOutlined}]`
   - icons imported from `@ant-design/icons`
   - labels via `t()` calls in items definition

2. **App.jsx visualCenter rendering** (lines 506-582):
   - `<SideMenu>` is always rendered at left
   - `<StatusBar>` is always rendered at top of visualCenter
   - When `visualMenuKey === 'ui-edit'`: renders PagePreview + resizer + BottomTabPanel(launcher + element)
   - Otherwise: renders `<div className={styles.visualPipelinePlaceholder}>` with "coming soon" text
   - `activeBottomTab` state tracks which tab is active (initial: 'launcher')
   - `bottomPanelCollapsed` state controls bottom panel collapse
   - `bottomPanelCollapsed` auto-management in componentDidUpdate (lines 80-89):
     - project starting → collapse
     - project stopping → expand
     - element selected → switch to element tab + expand

3. **BottomTabPanel structure** (`src/components/VisualEditor/BottomTabPanel.jsx`):
   - TABS is a hardcoded array: `[{key:'launcher'}, {key:'element'}]`
   - Props: `activeTab`, `collapsed`, `onTabClick`, `onCollapse`, `children` (object with launcher/element keys)
   - Children passed via named keys: `children[key]` rendered when `activeTab === key`

4. **PagePreview empty state** (lines 385-394):
   - `if (!port && !iframeSrc) { return (<div className={styles.emptyPreview}>...) }`
   - This guard prevents URL bar from rendering when no project is running and no URL has been navigated to
   - The guard must be removed; the URL bar should always render

5. **PagePreview URL bar** (lines 396-433):
   - Contains: inspect toggle, LinkOutlined icon, Input, go arrow, refresh, screenshot, Sketch compare
   - Works independently of port — `handleNavigate()` constructs default URLs with port fallback
   - When iframeSrc is empty, no <iframe> is rendered (line 438-446 — the `{iframeSrc && (<iframe>...)}` pattern already handles this)

6. **ProjectLauncher props**:
   - Receives `collapsed` and `onToggleCollapse` from App via BottomTabPanel → ProjectLauncher
   - In App.jsx: `collapsed={false}` and `onToggleCollapse={() => {}}` (hardcoded)
   - ProjectLauncher has a `collapsed` rendering branch (lines 45-79) that renders a summary line
   - Both `collapsed` prop and the collapsed rendering branch should be removed

7. **Edge case: componentDidUpdate still references bottomPanelCollapsed for auto-collapse on project start**
   - Lines 80-89: auto-collapses bottom panel when project starts running, auto-expands when stops
   - When `visualMenuKey === 'launcher'` (full-screen launcher), `bottomPanelCollapsed` / `activeBottomTab` are irrelevant
   - Fix: keep bottomPanelCollapsed logic but guard it with `visualMenuKey === 'ui-edit'` so it doesn't trigger when on launcher view

8. **Edge case: StatusBar is rendered for ALL visualMenuKey values**
   - In current code, StatusBar is rendered unconditionally inside visualCenter (before the visualMenuKey branching)
   - For launcher view, StatusBar should still show (Sketch status, element info) — keep as-is

9. **Style requirements for launcher full-height**:
   - Need a new CSS class (e.g., `visualLauncherArea`) that takes `flex: 1` and `min-height: 0`
   - ProjectLauncher wrapper should have `overflow: auto` for log scrolling
   - Existing `.launcher` styles have `padding: 8px` which is fine for full-height view

10. **Node test runner**: `node --test` (ESM, package type=module)
    - No unit tests needed for this phase (UI-only changes)
    - Verification: `npm run build` must exit 0
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Add launcher menu item to SideMenu</name>
  <files>src/components/VisualEditor/SideMenu.jsx</files>
  <action>
In `src/components/VisualEditor/SideMenu.jsx`:

1. Add `RocketOutlined` to the import from `@ant-design/icons`
2. Insert a new item between ui-edit and pipeline in the items array:

```js
import { EditOutlined, ApiOutlined, RocketOutlined } from '@ant-design/icons';

const items = [
  { key: 'ui-edit', icon: EditOutlined, label: () => t('visual.menuUIEdit') },
  { key: 'launcher', icon: RocketOutlined, label: () => t('visual.menuLauncher') },
  { key: 'pipeline', icon: ApiOutlined, label: () => t('visual.menuPipeline') },
];
```

No other changes needed.
  </action>
  <verify>
    <automated>grep -q "RocketOutlined" src/components/VisualEditor/SideMenu.jsx && grep -q "launcher" src/components/VisualEditor/SideMenu.jsx</automated>
  </verify>
  <done>SideMenu.jsx updated with 3 items: ui-edit, launcher, pipeline. RocketOutlined imported.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Add i18n key visual.menuLauncher</name>
  <files>src/i18n.js</files>
  <action>
In `src/i18n.js`, add the following entry right after `visual.menuPipeline` (around line 7610):

```js
"visual.menuLauncher": {
  "zh": "项目启动器",
  "en": "Launcher",
  "ja": "ランチャー"
},
```
  </action>
  <verify>
    <automated>grep -q "visual.menuLauncher" src/i18n.js</automated>
  </verify>
  <done>i18n key visual.menuLauncher added with zh/en/ja translations.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Refactor BottomTabPanel to accept tabs via props</name>
  <files>src/components/VisualEditor/BottomTabPanel.jsx, src/components/VisualEditor/BottomTabPanel.module.css</files>
  <action>
In `src/components/VisualEditor/BottomTabPanel.jsx`:

1. Remove the hardcoded `TABS` constant
2. Add a `tabs` prop (default: `[]`)
3. Update rendering to use `tabs` prop:
   - If `tabs.length === 0`, return null (render nothing)
   - Tab bar iterates over `tabs` array
   - Content area iterates over `tabs` array for children lookup
   - Collapse button remains always (but hidden when no tabs — which won't happen in practice since collapse is controlled by parent)

New file content:

```jsx
import React from 'react';
import { UpOutlined, DownOutlined } from '@ant-design/icons';
import { t } from '../../i18n';
import styles from './BottomTabPanel.module.css';

export default function BottomTabPanel({
  tabs = [],
  activeTab,
  collapsed,
  onTabClick,
  onCollapse,
  children,
}) {
  if (tabs.length === 0) return null;

  return (
    <div className={styles.panel}>
      {/* Tab 标签横条 — 始终可见 */}
      <div className={styles.tabBar}>
        {tabs.map(({ key, labelKey }) => (
          <div
            key={key}
            className={`${styles.tab}${activeTab === key ? ' ' + styles.tabActive : ''}`}
            onClick={() => onTabClick(key)}
          >
            {t(labelKey)}
          </div>
        ))}
        {/* 折叠/展开图标 — 右侧 */}
        <div className={styles.collapseBtn} onClick={onCollapse} title={collapsed ? t('visual.launcher.expand') : t('visual.launcher.collapse')}>
          {collapsed ? <UpOutlined /> : <DownOutlined />}
        </div>
      </div>

      {/* Tab 内容区 — 始终挂载，折叠时 display:none（避免状态丢失） */}
      <div className={styles.content} style={{ display: collapsed ? 'none' : undefined }}>
        {tabs.map(({ key }) => (
          <div
            key={key}
            style={{ display: activeTab === key ? 'flex' : 'none', height: '100%', flexDirection: 'column', overflow: 'auto', minHeight: 0 }}
          >
            {children?.[key]}
          </div>
        ))}
      </div>
    </div>
  );
}
```

No changes needed to BottomTabPanel.module.css.
  </action>
  <verify>
    <automated>grep -q "tabs =" src/components/VisualEditor/BottomTabPanel.jsx</automated>
  </verify>
  <done>BottomTabPanel.jsx now accepts dynamic `tabs` prop. Returns null when tabs is empty.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 4: Update App.jsx visualCenter rendering for launcher view + ui-edit changes</name>
  <files>src/App.jsx, src/App.module.css</files>
  <action>
**Part A: Update App.jsx constructor state**

In the constructor (around line 40-42), change `activeBottomTab` initial value from `'launcher'` to `'element'` since the launcher tab no longer exists in BottomTabPanel:

```js
activeBottomTab: 'element',   // 'element' only — launcher is now a SideMenu entry
```

**Part B: Update componentDidUpdate project-auto-collapse (line 80-89)**

Add a guard to only auto-manage bottom panel when in ui-edit mode:

```js
componentDidUpdate(prevProps, prevState) {
  // 仅在 ui-edit 模式下自动管理底部面板
  if (this.state.visualMenuKey !== 'ui-edit') return;

  const prevStatus = prevState.projectStatus?.status;
  const curStatus = this.state.projectStatus?.status;
  if (prevStatus !== 'running' && curStatus === 'running') {
    this.setState({ bottomPanelCollapsed: true });
  }
  if (prevStatus === 'running' && curStatus !== 'running') {
    this.setState({ bottomPanelCollapsed: false });
  }

  const prevEl = prevState.selectedElement;
  const curEl = this.state.selectedElement;
  if (!prevEl && curEl) {
    this.setState({ activeBottomTab: 'element', bottomPanelCollapsed: false });
  }
}
```

Note: the return at the beginning only skips the bottom panel management, but the selectedElement auto-switch below is also part of bottom panel behavior, so we include it all under the guard.

**Part C: Update visualCenter rendering (lines 506-582)**

Replace the current visualCenter rendering block with:

```jsx
<div className={styles.visualCenter} ref={this.visualCenterRef}>
  <StatusBar
    sketchMcpStatus={this.state.sketchMcpStatus}
    selectedElement={this.state.selectedElement}
    sketchSelectedLayer={this.state.sketchSelectedLayer}
    onAuthenticate={this.handleSketchAuthenticate}
  />
  {this.state.visualMenuKey === 'launcher' ? (
    <div className={styles.visualLauncherArea}>
      <ProjectLauncher
        status={this.state.projectStatus}
        output={this.state.projectOutput}
        onStart={this.handleStartProject}
        onStop={this.handleStopProject}
        defaultPath={this.state.projectDir}
      />
    </div>
  ) : this.state.visualMenuKey === 'ui-edit' ? (
    <>
      <div className={styles.visualPreviewArea}>
        <PagePreview
          port={this.state.projectStatus?.port}
          previewUrl={this.state.previewUrl}
          onPreviewUrlChange={this.handlePreviewUrlChange}
          onElementHover={(el) => {}}
          onElementSelect={(el) => this.setState({ selectedElement: el })}
          onElementDeselect={() => this.setState({ selectedElement: null, visualPendingImages: [] })}
          selectedElement={this.state.selectedElement}
          sketchMcpStatus={this.state.sketchMcpStatus}
          onElementScreenshot={this.handleElementScreenshot}
        />
      </div>
      {/* 折叠时隐藏 resizer */}
      {!this.state.bottomPanelCollapsed && (
        <div
          className={styles.visualHResizer}
          onMouseDown={this.handleVerticalResizeStart}
        />
      )}
      <div
        className={styles.visualOperationArea}
        style={{
          height: this.state.bottomPanelCollapsed
            ? 33
            : this.state.visualOperationHeight,
        }}
      >
        <BottomTabPanel
          tabs={[{ key: 'element', labelKey: 'visual.tabElement' }]}
          activeTab={this.state.activeBottomTab}
          collapsed={this.state.bottomPanelCollapsed}
          onTabClick={(key) => {
            this.setState({ activeBottomTab: key, bottomPanelCollapsed: false });
          }}
          onCollapse={() => this.setState(prev => ({ bottomPanelCollapsed: !prev.bottomPanelCollapsed }))}
        >
          {{
            element: (
              <ElementInfo element={this.state.selectedElement} />
            ),
          }}
        </BottomTabPanel>
      </div>
    </>
  ) : (
    <div className={styles.visualPipelinePlaceholder}>
      {t('visual.pipelineComingSoon')}
    </div>
  )}
</div>
```

Key changes:
- `visualMenuKey === 'launcher'` → renders ProjectLauncher in `.visualLauncherArea` (new CSS class)
- `visualMenuKey === 'ui-edit'` → renders PagePreview + resizer + BottomTabPanel with **only** the `element` tab (no launcher tab)
- `BottomTabPanel` now receives `tabs` prop with just `[{key:'element', labelKey:'visual.tabElement'}]`
- `children` only passes the `element` slot (no launcher slot)
- `ProjectLauncher` no longer receives `collapsed` or `onToggleCollapse` props

**Part D: Add new CSS class for launcher full-height area**

In `src/App.module.css`, add after `.visualPipelinePlaceholder` (around line 911):

```css
.visualLauncherArea {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
```

**Part E: Update projectOutput/projectDir state references**

No changes needed — `this.state.projectOutput` and `this.state.projectDir` are already managed by AppBase and referenced correctly.
  </action>
  <verify>
    <automated>npm run build 2>&1 | tail -10</automated>
  </verify>
  <done>App.jsx visualCenter rendering updated. launcher mode renders ProjectLauncher full-height, ui-edit mode renders PagePreview + BottomTabPanel with only element tab. BottomTabPanel receives dynamic tabs prop. New .visualLauncherArea CSS class added.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 5: Remove empty-state guard from PagePreview</name>
  <files>src/components/VisualEditor/PagePreview.jsx</files>
  <action>
In `src/components/VisualEditor/PagePreview.jsx`:

1. Remove the empty-state block (lines 384-394):

```js
// 删除以下代码块：
// 无端口且无已加载页面时显示空状态
if (!port && !iframeSrc) {
  return (
    <div className={styles.emptyPreview}>
      <div className={styles.emptyGuide}>
        <PlayCircleOutlined className={styles.emptyGuideIcon} />
        <Typography.Text className={styles.emptyGuideText}>{t('visual.emptyGuide')}</Typography.Text>
      </div>
    </div>
  );
}
```

2. Remove unused imports that are only used by the empty state:
   - `Typography` can stay (still used elsewhere)
   - `PlayCircleOutlined` — check if used elsewhere in the file. Looking at the code:
     - `PlayCircleOutlined` is only used in the empty-state block → remove from import
   - `t` and other imports remain unchanged

3. The rest of the file remains unchanged. The URL bar + iframe area already handles the empty iframeSrc case gracefully:
   - URL bar renders unconditionally (moved outside the removed guard)
   - iframe rendering is already guarded: `{iframeSrc && (<iframe>...)}` — when iframeSrc is empty, no iframe is rendered
   - The empty iframe area will just show the `.iframeArea` background

**Import line change** (line 3):

```js
import { ReloadOutlined, LinkOutlined, ArrowRightOutlined, AimOutlined, CameraOutlined, LoadingOutlined } from '@ant-design/icons';
```

Remove `PlayCircleOutlined` and `Typography` from the import if they're not used elsewhere. Actually, `Typography` might not be used elsewhere — let's check. Looking at the code, `Typography.Text` on line 390 is inside the removed block. Search for other uses of `Typography`:

Since the component also uses `Tooltip` and `message` from antd/Typography — yes, Typography is only used in the empty state. Remove it from import.

**Import line change**:
```js
import { Input, Tooltip, message } from 'antd';
```

Remove `Typography` from the antd import.
  </action>
  <verify>
    <automated>npm run build 2>&1 | tail -10</automated>
  </verify>
  <done>PagePreview empty-state guard removed. URL bar and iframe area render unconditionally. PlayCircleOutlined and Typography removed from imports.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 6: Remove collapsed props from ProjectLauncher</name>
  <files>src/components/VisualEditor/ProjectLauncher.jsx</files>
  <action>
In `src/components/VisualEditor/ProjectLauncher.jsx`:

1. Update the function signature — remove `collapsed` and `onToggleCollapse` from destructured props:

```js
export default function ProjectLauncher({ status, output, onStart, onStop, defaultPath }) {
```

2. Remove the collapsed rendering branch (lines 45-79, from `// 折叠态：仅显示摘要行` through the closing brace of the `if (collapsed)` block).

3. Remove unused imports that were only used by the collapsed branch:
   - `UpOutlined, DownOutlined` — check if used elsewhere. Looking at the component, `UpOutlined` and `DownOutlined` are only used in the collapsed branch and the full header's toggle button. Since we're removing the collapsed branch, we need to also remove the toggle button from the full header.
   - Actually, looking at the code more carefully:
     - `UpOutlined` is used in line 90 in the header (full view toggle button): `<UpOutlined />`
     - `DownOutlined` is used in line 74 in the collapsed branch: `<DownOutlined />`
   - Since we're removing the collapsed branch entirely, and the `onToggleCollapse` is gone, we should also remove the toggle button from the full header. The launcher is now always full-height.
   
4. Remove `UpOutlined, DownOutlined` from the `@ant-design/icons` import:

```js
import { PlayCircleOutlined, StopOutlined, FolderOpenOutlined } from '@ant-design/icons';
```

5. Remove the `launcherToggle` span from the header:

Remove:
```jsx
<span
  className={styles.launcherToggle}
  onClick={onToggleCollapse}
  title={t('visual.launcher.collapse')}
>
  <UpOutlined />
</span>
```

The header should become:
```jsx
<div className={styles.launcherHeader}>
  <Typography.Title level={5} style={{ margin: 0 }}>{t('visual.projectLauncher')}</Typography.Title>
</div>
```

6. (Optional but clean) Remove CSS classes that become unused:
   - `launcherToggle`, `launcherSummary`, `launcherDot`, `launcherDotRunning`, `launcherSummaryPath`, `launcherSummaryPort`, `launcherSummaryStatus`, `launcherSummaryBtn`
   - These can be left in styles.module.css for now (they do no harm) or cleaned up. Leave them for now to keep the change minimal — CSS cleanup can happen in a later pass.
  </action>
  <verify>
    <automated>npm run build 2>&1 | tail -10</automated>
  </verify>
  <done>ProjectLauncher simplified: collapsed prop, onToggleCollapse prop, and collapsed rendering branch removed. Header toggle button removed. Unused icon imports cleaned up.</done>
</task>

</tasks>

<verification>
After all tasks complete, run the full verification:

```bash
# 1. Production build
npm run build 2>&1 | tail -10
```

Expected: build exits 0 with no errors.

Manual spot-check (if browser available):
1. Navigate to visual mode
2. SideMenu should show 3 items: UI编辑, 项目启动器, Pipeline
3. Click "项目启动器" → center area switches to full-height ProjectLauncher
4. Click "UI编辑" → center area shows PagePreview + BottomTabPanel (元素信息 tab only)
5. UI编辑模式下，URL 输入框始终可见（即使没有运行项目）
6. 在 URL 输入框输入 `http://localhost:3000` 并按回车，iframe 加载对应页面
7. 项目启动后自动填入端口 URL 的逻辑正常
8. 选中元素后，底部「元素信息」tab 自动切换到 element info
</verification>

<success_criteria>
- `npm run build` exits 0
- SideMenu has 3 items: ui-edit, launcher, pipeline
- visualMenuKey === 'launcher' → full-height ProjectLauncher in visualCenter
- visualMenuKey === 'ui-edit' → PagePreview + resizer + BottomTabPanel (element tab only)
- PagePreview URL bar always visible regardless of port/iframeSrc state
- ProjectLauncher no longer has collapsed/toggle behavior
- BottomTabPanel tabs driven by `tabs` prop
</success_criteria>

<output>
After completion, create `.planning/phases/phase-20/phase-20-01-SUMMARY.md` with:
- Files changed and what changed in each
- Confirmation that `npm run build` passes
- Note on any edge cases discovered during implementation
</output>
