# Phase 20: SideMenu 扩展 + Launcher 迁移 + PagePreview 常态化 — 决策上下文

**生成时间**: 2026-04-24
**状态**: 决策完成，可直接进入 plan

---

## 已锁定决策

### D1: SideMenu 新增 launcher 菜单项

- **决定**: SideMenu 新增 `launcher` 菜单项，icon 使用 `RocketOutlined`，label key 为 `visual.menuLauncher`
- **位置**: 排在 `ui-edit` 之后、`pipeline` 之前（即 items 数组第二项）
- **影响**: SideMenu.jsx items 数组扩展为 `[{key:'ui-edit'}, {key:'launcher'}, {key:'pipeline'}]`；App.jsx state `visualMenuKey` 新增合法值 `'launcher'`

### D2: `visualMenuKey === 'launcher'` 时 center 区域渲染 ProjectLauncher

- **决定**: App.jsx 中 `visualMenuKey === 'ui-edit'` 分支外新增 `visualMenuKey === 'launcher'` 分支
- **渲染**: 在 `visualCenter` 内渲染 `ProjectLauncher`（全高，无 BottomTabPanel、无 StatusBar 包裹，直接占满 flex:1）
- **BottomTabPanel**: 仅在 `visualMenuKey === 'ui-edit'` 时渲染，且此时 TABS 仅保留 `element` 一个 tab
- **影响**: App.jsx visualCenter 区域改为三段式渲染（三选一）：
  1. `visualMenuKey === 'launcher'` → ProjectLauncher 全高
  2. `visualMenuKey === 'ui-edit'` → PagePreview + resizer + BottomTabPanel（仅 element tab）
  3. 其他 → Pipeline 占位（不变）

### D3: BottomTabPanel 适配单 tab

- **决定**: BottomTabPanel 的 TABS 改为 props 传入，而非组件内部常量
- **行为**:
  - `TABS` 数组长度 === 0 → 不渲染整个 panel
  - `TABS` 数组长度 === 1 → tab bar 显示单个 tab（但较简化，可以省略 tab bar 直接显示内容）
  - `TABS` 数组长度 >= 2 → 当前行为（多 tab + 切换）
- **影响**: BottomTabPanel 由 `children` props 驱动改为 `tabs` + `children` 双驱动

### D4: ProjectLauncher 移除 collapsed 相关 props

- **决定**: ProjectLauncher 不再接收 `collapsed` 和 `onToggleCollapse` props
- **影响**: 移除折叠态渲染分支（collapsed 时为摘要行的逻辑），始终展示完整视图
- **兼容**: 若外部仍传这两个 props，则不处理（不报错，但忽略）

### D5: PagePreview 常态化

- **决定**: 移除 `!port && !iframeSrc` 空状态（line 385-393），始终渲染 URL bar + iframe area
- **行为**: 当 `iframeSrc` 为空时，URL bar 正常显示，iframe area 显示空白占位（不渲染 `<iframe>` 元素）
- **影响**: 用户任何时候都能看到 URL 输入框，输入任意 URL 后回车即可加载
- **副作用**: 确保自动填入端口 URL 的逻辑（port change effect）不破坏

### D6: 新增 i18n 键

- `visual.menuLauncher` — zh: "项目启动器", en: "Launcher", ja: "ランチャー"
- 注意：`visual.tabLauncher` 保留待后续清理（Phase 21 或 cleanup 阶段再移除）

---

## 不在本 Phase 范围内

- ANSI 转义序列过滤（Phase 21）
- Available Pages 快捷导航（Phase 21）
- `visual.tabLauncher` 的移除（保留，干净清理留给 Phase 21 或 cleanup）
- 移除 `ProjectLauncher` 内部 `collapsed` 的兼容代码（直接删，不移到 Phase 21）

---

## 关键文件

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| `src/components/VisualEditor/SideMenu.jsx` | 修改 | 加入 `launcher` 菜单项 |
| `src/App.jsx` | 修改 | 调整 visualCenter 渲染逻辑 |
| `src/App.module.css` | 修改 | 新增 launcher 全高样式 |
| `src/components/VisualEditor/BottomTabPanel.jsx` | 修改 | TABS 改为 props 驱动，支持单 tab |
| `src/components/VisualEditor/BottomTabPanel.module.css` | 可能修改 | 单 tab 适配 |
| `src/components/VisualEditor/PagePreview.jsx` | 修改 | 移除空状态，始终显示 URL bar |
| `src/components/VisualEditor/ProjectLauncher.jsx` | 修改 | 移除 collapsed props |
| `src/i18n.js` | 修改 | 新增 `visual.menuLauncher` |

---

## 验收标准

1. SideMenu 出现「项目启动器」菜单项（RocketOutlined icon）
2. 点击「项目启动器」→ center 区域切换到 ProjectLauncher 全高视图（无 tab bar、无 resizer）
3. 点击「UI 编辑」→ center 区域恢复 PagePreview + BottomTabPanel（仅 element 信息 tab）
4. UI 编辑模式下，未启动项目时 URL 输入框始终可见
5. 用户可直接在 URL 输入框中输入 `http://localhost:3002/demo.html` 后回车加载页面
6. 项目启动后自动填入端口 URL 的逻辑保留
7. BottomTabPanel 的「元素信息」tab 功能不变
8. `build` 通过
