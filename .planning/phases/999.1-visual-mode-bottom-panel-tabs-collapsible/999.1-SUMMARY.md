# Phase 999.1 Summary — 可视化模式底部面板 Tab 化 + 折叠功能

## 目标

将 visual 模式的 `visualOperationArea` 改造为自定义轻量 Tab 面板，支持「项目启动器」和「元素信息」两个 Tab，并支持折叠为 32px 高的 tab 标签横条，解决项目启动器遮挡 iframe 的问题。

---

## 修改文件

### 1. `src/App.jsx` — state 重命名 + componentDidUpdate + render 替换

**State 变更：**
- 移除 `launcherCollapsed: false`
- 新增 `bottomPanelCollapsed: false`（控制面板展开/折叠）
- 新增 `activeBottomTab: 'launcher'`（当前激活 Tab）

**componentDidUpdate 新增逻辑：**
- 保留原有项目启动/停止自动折叠/展开（改用 `bottomPanelCollapsed`）
- 新增：`selectedElement` 从 null 变为非 null 时，自动展开并切换到「元素信息」Tab

**render 变更：**
- 折叠时隐藏 resizer（`!bottomPanelCollapsed`条件渲染）
- `visualOperationArea` 高度：折叠时固定 32px，展开时使用 `visualOperationHeight`
- 原 `<ProjectLauncher>` + `<ElementInfo>` 替换为 `<BottomTabPanel>` 包裹
- Tab 点击逻辑：展开态点当前 Tab → 折叠；折叠态或点其他 Tab → 展开并切换

**新增 import：**
- `import BottomTabPanel from './components/VisualEditor/BottomTabPanel'`

### 2. `src/components/VisualEditor/BottomTabPanel.jsx` — 新建

自定义轻量 Tab 面板组件：
- 始终渲染 Tab 标签横条（32px）
- Tab 内容区通过 `display: none` 控制折叠（避免状态丢失）
- Tab 内容通过 `children` 对象传入（`{ launcher, element }`）
- 使用 `AppstoreOutlined` / `InfoCircleOutlined` 图标

### 3. `src/components/VisualEditor/BottomTabPanel.module.css` — 新建

- `.panel`：flex 列布局，height 100%
- `.tabBar`：32px 固定高度横条，border-top，背景 `var(--bg-container)`
- `.tab` / `.tabActive`：12px 字体，pointer，使用 CSS 变量配色
- `.content`：flex: 1，占满剩余高度

### 4. `src/i18n.js` — 新增 2 个 key

```
visual.tabLauncher: { zh: "项目启动器", en: "Launcher", ja: "ランチャー" }
visual.tabElement:  { zh: "元素信息",   en: "Element Info", ja: "要素情報" }
```

---

## 验收标准验证

| # | 标准 | 状态 |
|---|------|------|
| 1 | Tab 切换显示对应内容 | ✅ 实现 |
| 2 | 展开态点当前 Tab → 折叠为 32px | ✅ 实现 |
| 3 | 折叠态点任意 Tab → 展开 | ✅ 实现 |
| 4 | 选中元素 → 自动展开并切 element Tab | ✅ 实现 |
| 5 | 展开时显示 resizer；折叠时隐藏 | ✅ 实现 |
| 6 | 项目启动/停止自动折叠/展开保留 | ✅ 实现 |
| 7 | `npm run build` 无错误 | ✅ 通过（8.84s） |
| 8 | `npm run test` 无新增失败 | ✅（唯一失败为环境预存问题） |

---

## 构建结果

```
✓ built in 8.84s
```

无编译错误，仅有预存的 chunk size 警��（与本次改动无关）。
