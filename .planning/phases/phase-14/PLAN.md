# Phase 14: 可视化编辑器布局重构

## 目标

将 visual 模式的三栏布局从「左侧 sidebar(280px) | 中间预览 | 右侧终端(400px)」重构为「左侧菜单(48px) | 中间上下分割(StatusBar + 预览 + 操作区) | 右侧终端(400px)」。

## 当前结构分析

```
App.jsx (viewMode === 'visual') 渲染:
├── .visualMain (flex row)
│   ├── .visualSidebar (280px) — ProjectLauncher + ElementInfo 纵向堆叠
│   ├── .visualPreview (flex:1) — PagePreview (url bar + iframe)
│   └── .visualTerminalWrapper (400px) — element tag + TerminalPanel
└── StatusBar (底部, visualMain 外部)
```

## 目标结构

```
├── .visualMain (flex row)
│   ├── SideMenu (48px) — 图标式菜单: UI编辑 | Pipeline
│   ├── .visualCenter (flex:1, flex column)
│   │   ├── StatusBar (顶部, 24px)
│   │   ├── .visualPreviewArea (上方, flex:1) — PagePreview
│   │   ├── HorizontalResizer (拖拽条, 4px)
│   │   └── .visualOperationArea (下方, 可拖拽高度) — ProjectLauncher + ElementInfo
│   └── .visualTerminalWrapper (400px) — 不变
```

---

## 步骤 1: 新建 SideMenu 组件

**新建**: `src/components/VisualEditor/SideMenu.jsx` + `SideMenu.module.css`

**SideMenu.jsx 规格**:
- Props: `activeKey` (string), `onSelect` (fn)
- 两个菜单项:
  - `ui-edit`: 图标 + "UI编辑" 文字 (默认激活)
  - `pipeline`: 图标 + "Pipeline" 文字 (点击切换)
- 使用 antd Icons: `EditOutlined` (UI编辑), `ApiOutlined` (Pipeline)
- 激活态: 左侧 2px 竖线指示器 + 文字/图标高亮色 `var(--text-primary)`
- 非激活态: `var(--text-muted)`

**SideMenu.module.css 规格**:
- `.sideMenu`: width 48px, 背景 `var(--bg-base-alt)`, 右边框 `var(--border-primary)`, flex column, padding-top 8px
- `.menuItem`: 48px 宽, padding 12px 0, 居中对齐, cursor pointer, flex column, align-items center, gap 2px
- `.menuItemActive`: 左侧 2px solid `var(--color-primary-light)` 指示条, 文字 `var(--text-primary)`
- `.menuIcon`: font-size 18px
- `.menuLabel`: font-size 10px

**Anti-AI-Slop 约束**: 无渐变背景, 无 emoji, 无圆角卡片装饰, 纯 CSS 变量着色。

---

## 步骤 2: 重构 App.jsx visual 模式布局

**修改**: `src/App.jsx`

### 2a. 新增 state 和 import

```jsx
import SideMenu from './components/VisualEditor/SideMenu';
```

在 constructor 中新增:
```js
visualMenuKey: 'ui-edit',        // 左侧菜单当前选中
visualOperationHeight: 220,      // 操作区初始高度 (px)
```

### 2b. 添加操作区垂直拖拽 handler

新增方法 `handleVerticalResize`:
- 监听 mousedown → mousemove → mouseup
- 计算中间区域的总高度，根据鼠标 Y 位置算出操作区高度
- 约束: 最小 120px, 最大为中间区域高度的 60%
- 将结果 setState 到 `visualOperationHeight`

### 2c. 替换 viewMode === 'visual' 的 JSX

**旧**: visualSidebar(280px) + visualPreview(flex:1) + visualTerminalWrapper(400px) + StatusBar(底部)

**新**:
```jsx
{viewMode === 'visual' && (
  <div className={styles.visualMain}>
    <SideMenu
      activeKey={this.state.visualMenuKey}
      onSelect={(key) => this.setState({ visualMenuKey: key })}
    />
    <div className={styles.visualCenter} ref={this.visualCenterRef}>
      <StatusBar
        sketchMcpStatus={this.state.sketchMcpStatus}
        selectedElement={this.state.selectedElement}
        sketchSelectedLayer={this.state.sketchSelectedLayer}
      />
      {this.state.visualMenuKey === 'ui-edit' ? (
        <>
          <div className={styles.visualPreviewArea}>
            <PagePreview ... />
          </div>
          <div
            className={styles.visualHResizer}
            onMouseDown={this.handleVerticalResizeStart}
          />
          <div
            className={styles.visualOperationArea}
            style={{ height: this.state.visualOperationHeight }}
          >
            <ProjectLauncher ... />
            <ElementInfo element={this.state.selectedElement} />
          </div>
        </>
      ) : (
        <div className={styles.visualPipelinePlaceholder}>
          {t('visual.pipelineComingSoon')}
        </div>
      )}
    </div>
    <div className={styles.visualTerminalWrapper}>
      {/* element tag + TerminalPanel — 完全不变 */}
    </div>
  </div>
)}
```

**删除**: 原先 visualMain 外部的 `<StatusBar />` 渲染块。

### 2d. 新增 ref

```js
this.visualCenterRef = React.createRef();
```

---

## 步骤 3: 更新 CSS 样式

**修改**: `src/App.module.css`

### 删除/修改:
- 删除 `.visualSidebar` (原 280px sidebar)
- `.visualPreview` 重命名为 `.visualPreviewArea` 并调整为 `flex: 1; min-height: 0;`

### 新增:
```css
.visualCenter {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.visualPreviewArea {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.visualHResizer {
  height: 4px;
  cursor: row-resize;
  background: var(--border-primary);
  flex-shrink: 0;
  transition: background 0.15s;
}
.visualHResizer:hover,
.visualHResizer:active {
  background: var(--color-primary-light);
}

.visualOperationArea {
  flex-shrink: 0;
  overflow-y: auto;
  border-top: 1px solid var(--border-primary);
  padding: 12px 16px;
  background: var(--bg-base-alt);
}

.visualPipelinePlaceholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 14px;
}
```

---

## 步骤 4: StatusBar 样式微调

**修改**: `src/components/VisualEditor/styles.module.css`

StatusBar 原先 `border-top` → 改为 `border-bottom`，因为它现在在顶部而非底部:
```css
.statusBar {
  border-top: none;
  border-bottom: 1px solid var(--border-primary);
}
```

---

## 步骤 5: 添加 i18n 条目

**修改**: `src/i18n.js`

新增 key:
| Key | zh | en | ja |
|---|---|---|---|
| `visual.menuUIEdit` | UI编辑 | UI Edit | UI編集 |
| `visual.menuPipeline` | Pipeline | Pipeline | Pipeline |
| `visual.pipelineComingSoon` | Pipeline 功能即将推出 | Pipeline coming soon | Pipeline 近日公開 |

---

## 步骤 6: 构建验证

运行 `npm run build`，确保:
- 无编译错误
- 无未使用的 import 警告
- CSS module 类名正确引用

---

## 文件变更清单

| 操作 | 文件 | 说明 |
|---|---|---|
| 新建 | `src/components/VisualEditor/SideMenu.jsx` | 左侧图标菜单组件 |
| 新建 | `src/components/VisualEditor/SideMenu.module.css` | 菜单样式 |
| 修改 | `src/App.jsx` | visual 布局重构 + 垂直拖拽 + state |
| 修改 | `src/App.module.css` | 删除 visualSidebar, 新增 center/operation/resizer 样式 |
| 修改 | `src/components/VisualEditor/styles.module.css` | StatusBar border 方向 |
| 修改 | `src/i18n.js` | 3 个新 i18n key |

## 不变文件

- `src/components/VisualEditor/ProjectLauncher.jsx` — 内部不修改
- `src/components/VisualEditor/ElementInfo.jsx` — 内部不修改
- `src/components/VisualEditor/PagePreview.jsx` — 内部不修改
- `src/components/VisualEditor/StatusBar.jsx` — 内部不修改
- `src/components/TerminalPanel.jsx` — 不修改
- `server.js` — 不修改

## 设计约束

- Anti-AI-Slop: 无紫色渐变, 无 emoji 图标, 无圆角卡片+色条装饰
- 仅使用项目已有 CSS 变量 (`var(--bg-*)`, `var(--text-*)`, `var(--border-*)`, `var(--color-primary-*)`)
- SideMenu 图标使用 antd Icons
- 深色/浅色主题通过 CSS 变量自动兼容
- 右侧终端 400px 宽度和功能完全保持不变
