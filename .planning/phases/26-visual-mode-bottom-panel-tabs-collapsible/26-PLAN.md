# Phase 999.1: 可视化模式底部面板 Tab 化 + 折叠功能 — PLAN

**Phase:** 999.1-visual-mode-bottom-panel-tabs-collapsible
**Status:** Ready for execution
**Planned:** 2026-04-24

---

## Goal

将 visual 模式 `visualOperationArea` 改造为自定义轻量 Tab 面板，支持两个 Tab（项目启动器 / 元素信息），并支持折叠为 32px 高的 tab 标签横条。

---

## Step 1 — App state 重命名与扩展

**File:** `src/App.jsx`

在 constructor 的 `Object.assign(this.state, {...})` 中：

1. 将 `launcherCollapsed: false` 替换为：
   ```js
   bottomPanelCollapsed: false,
   activeBottomTab: 'launcher',   // 'launcher' | 'element'
   ```

**Note:** `launcherCollapsed` 在 `componentDidUpdate`、render JSX 中有 3 处引用，全部替换（见 Step 2、Step 4）。

---

## Step 2 — 更新 componentDidUpdate

**File:** `src/App.jsx` §76–87

将所有 `launcherCollapsed` 替换为 `bottomPanelCollapsed`，逻辑不变：

```js
componentDidUpdate(prevProps, prevState) {
  // 项目启动成功后自动折叠底部面板
  const prevStatus = prevState.projectStatus?.status;
  const curStatus = this.state.projectStatus?.status;
  if (prevStatus !== 'running' && curStatus === 'running') {
    this.setState({ bottomPanelCollapsed: true });
  }
  // 项目停止后自动展开
  if (prevStatus === 'running' && curStatus !== 'running') {
    this.setState({ bottomPanelCollapsed: false });
  }

  // D-05: selectedElement 从 null 变为非 null 时，展开并切换到元素信息 Tab
  const prevEl = prevState.selectedElement;
  const curEl = this.state.selectedElement;
  if (!prevEl && curEl) {
    this.setState({ activeBottomTab: 'element', bottomPanelCollapsed: false });
  }
}
```

---

## Step 3 — 创建 BottomTabPanel 组件

**File:** `src/components/VisualEditor/BottomTabPanel.jsx` (新建)

自定义轻量 Tab 面板，参考 `SideMenu.jsx` 实现模式。

```jsx
import React from 'react';
import { AppstoreOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { t } from '../../i18n';
import styles from './BottomTabPanel.module.css';

const TABS = [
  { key: 'launcher', icon: AppstoreOutlined, labelKey: 'visual.tabLauncher' },
  { key: 'element',  icon: InfoCircleOutlined, labelKey: 'visual.tabElement' },
];

export default function BottomTabPanel({
  activeTab,
  collapsed,
  onTabClick,
  children,   // { launcher: <node>, element: <node> }
}) {
  return (
    <div className={styles.panel}>
      {/* Tab 标签横条 — 始终可见 */}
      <div className={styles.tabBar}>
        {TABS.map(({ key, icon: Icon, labelKey }) => (
          <div
            key={key}
            className={`${styles.tab}${activeTab === key ? ' ' + styles.tabActive : ''}`}
            onClick={() => onTabClick(key)}
          >
            <Icon className={styles.tabIcon} />
            <span className={styles.tabLabel}>{t(labelKey)}</span>
          </div>
        ))}
      </div>

      {/* Tab 内容区 — 始终挂载，折叠时 display:none（D-08：避免状态丢失） */}
      <div className={styles.content} style={{ display: collapsed ? 'none' : undefined }}>
        {TABS.map(({ key }) => (
          <div
            key={key}
            style={{ display: activeTab === key ? 'flex' : 'none', height: '100%' }}
          >
            {children[key]}
          </div>
        ))}
      </div>
    </div>
  );
}
```

**折叠逻辑由父组件（App）控制**，`BottomTabPanel` 仅负责渲染；`onTabClick` 回调在 App 中实现 D-02 逻辑。

---

## Step 4 — 创建 BottomTabPanel.module.css

**File:** `src/components/VisualEditor/BottomTabPanel.module.css` (新建)

```css
.panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* Tab 标签横条 — 固定 32px */
.tabBar {
  display: flex;
  align-items: center;
  height: 32px;
  min-height: 32px;
  border-top: 1px solid var(--border-primary);
  background: var(--bg-container);
  flex-shrink: 0;
}

.tab {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 12px;
  height: 100%;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-secondary);
  border-right: 1px solid var(--border-primary);
  user-select: none;
}

.tab:hover {
  color: var(--text-primary);
}

.tabActive {
  color: var(--color-primary);
  background: var(--bg-elevated);
}

.tabIcon {
  font-size: 12px;
}

.tabLabel {
  font-size: 12px;
}

/* Tab 内容区 — 占满剩余高度 */
.content {
  flex: 1;
  overflow: hidden;
}
```

---

## Step 5 — 更新 App.jsx render：替换 visualOperationArea

**File:** `src/App.jsx` §523–541

将当前结构：

```jsx
<div
  className={styles.visualHResizer}
  onMouseDown={this.handleVerticalResizeStart}
/>
<div
  className={styles.visualOperationArea}
  style={{ height: this.state.visualOperationHeight }}
>
  <ProjectLauncher
    ...
    collapsed={this.state.launcherCollapsed}
    onToggleCollapse={() => this.setState(prev => ({ launcherCollapsed: !prev.launcherCollapsed }))}
  />
  <ElementInfo element={this.state.selectedElement} />
</div>
```

替换为：

```jsx
{/* D-07: 折叠时隐藏 resizer */}
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
      ? 32
      : this.state.visualOperationHeight,
  }}
>
  <BottomTabPanel
    activeTab={this.state.activeBottomTab}
    collapsed={this.state.bottomPanelCollapsed}
    onTabClick={(key) => {
      const { activeBottomTab, bottomPanelCollapsed } = this.state;
      if (!bottomPanelCollapsed && key === activeBottomTab) {
        // D-02: 展开态点当前 tab → 折叠
        this.setState({ bottomPanelCollapsed: true });
      } else {
        // 展开态点其他 tab → 切换；折叠态点任意 tab → 展开
        this.setState({ activeBottomTab: key, bottomPanelCollapsed: false });
      }
    }}
  >
    {{
      launcher: (
        <ProjectLauncher
          status={this.state.projectStatus}
          output={this.state.projectOutput}
          onStart={this.handleStartProject}
          onStop={this.handleStopProject}
          defaultPath={this.state.projectDir}
          collapsed={false}
          onToggleCollapse={() => {}}
        />
      ),
      element: (
        <ElementInfo element={this.state.selectedElement} />
      ),
    }}
  </BottomTabPanel>
</div>
```

**Note:** `ProjectLauncher` 的 `collapsed` / `onToggleCollapse` 传入空值，折叠控制权已移交给 `BottomTabPanel`（D-04）。

---

## Step 6 — 在 App.jsx 中添加 BottomTabPanel import

**File:** `src/App.jsx` 顶部 import 区

```js
import BottomTabPanel from './components/VisualEditor/BottomTabPanel';
```

---

## Step 7 — 添加 i18n 条目

**File:** `src/i18n.js`

按照项目中 `visual.menuUIEdit` 的三语言模式（zh/en/ja）添加：

```js
"visual.tabLauncher": { "zh": "项目启动器", "en": "Launcher", "ja": "ランチャー" },
"visual.tabElement":  { "zh": "元素信息", "en": "Element Info", "ja": "要素情報" },
```

**Note:** 按照项目 i18n 对象结构（每个 key 为包含语言子键的对象），插入位置紧跟 `visual.menuPipeline` 之后。

---

## Step 8 — 构建与测试验证

依次运行，均须无错误：

```bash
npm run build
npm run test
```

---

## Acceptance Criteria

1. **Tab 切换**：点击「项目启动器」Tab 显示 ProjectLauncher，点击「元素信息」Tab 显示 ElementInfo
2. **折叠**：展开状态下点当前激活 Tab → 底部面板折叠为 32px 横条，iframe 自动扩展填满
3. **展开**：折叠状态下点任意 Tab → 展开并激活对应 Tab
4. **自动切换**：在页面中选中元素 → 底部面板自动展开并切换到「元素信息」Tab
5. **Resizer**：展开时拖动 resizer 可调整高度；折叠时 resizer 隐藏
6. **项目状态自动折叠/展开**：项目启动成功后底部面板自动折叠；项目停止后自动展开（原有行为保持）
7. **构建通过**：`npm run build` 无错误
8. **测试通过**：`npm run test` 无失败用例

---

## Files Changed

| File | Action |
|------|--------|
| `src/App.jsx` | 修改 state、componentDidUpdate、render |
| `src/components/VisualEditor/BottomTabPanel.jsx` | 新建 |
| `src/components/VisualEditor/BottomTabPanel.module.css` | 新建 |
| `src/i18n.js` | 添加 2 个 i18n key |

---

## Out of Scope

- ProjectLauncher 内部 collapsed 摘要行 UI 是否移除（延迟决定）
- CSS transition 动画（性能优先，不加）
- 更多 Tab（Pipeline 等）
