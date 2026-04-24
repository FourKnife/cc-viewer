# Phase 20: SideMenu 扩展 + Launcher 迁移 + PagePreview 常态化 — 执行摘要

**生成时间**: 2026-04-24
**状态**: ✅ 完成

---

## 文件改动

| 文件 | 改动说明 |
|------|----------|
| `src/components/VisualEditor/SideMenu.jsx` | 新增 `RocketOutlined` 导入；items 数组插入 `{key:'launcher'}` 项（位于 ui-edit 和 pipeline 之间） |
| `src/i18n.js` | 新增 `visual.menuLauncher` 键（zh: 项目启动器 / en: Launcher / ja: ランチャー） |
| `src/components/VisualEditor/BottomTabPanel.jsx` | 移除硬编码 `TABS` 常量；改为 `tabs` props 驱动；`tabs.length === 0` 时返回 null；children 改为可选链访问 `children?.[key]` |
| `src/App.jsx` | ① `activeBottomTab` 初始值从 `'launcher'` 改为 `'element'`；② `componentDidUpdate` 增加 `visualMenuKey !== 'ui-edit'` 守卫；③ visualCenter 渲染改为三路分支：`launcher` → 全高 ProjectLauncher / `ui-edit` → PagePreview + BottomTabPanel（仅 element tab）/ 其他 → Pipeline 占位 |
| `src/App.module.css` | 新增 `.visualLauncherArea` 样式（flex:1, min-height:0, overflow:auto） |
| `src/components/VisualEditor/PagePreview.jsx` | 移除 `!port && !iframeSrc` 空状态守卫；移除被空状态独占的 `Typography`、`PlayCircleOutlined` 导入 |
| `src/components/VisualEditor/ProjectLauncher.jsx` | 移除 `collapsed` / `onToggleCollapse` props；移除折叠态渲染分支（摘要行）；移除 `UpOutlined` / `DownOutlined` 导入；移除头部折叠按钮 |

## 构建 & 测试

- ✅ `npm run build` — 成功（无错误）
- ✅ `node --test` — 1206 测试全部通过，0 失败

## 边缘情况

1. **componentDidUpdate 守卫**：`visualMenuKey !== 'ui-edit'` 的 return guard 覆盖了整个底部面板自动管理逻辑（含 selectedElement 自动切换），确保在 launcher 视图中不会因为项目状态变化或元素选择意外触发 bottomPanelCollapsed 的变化
2. **BottomTabPanel children 兼容**：改为 `children?.[key]` 可选链，防止传入的 children 对象缺少某些 key 时报错
3. **PagePreview 空 iframe**：原有的 `{iframeSrc && (<iframe>...)}` 守卫已足够，移除空状态后，无 iframeSrc 时仅显示 `.iframeArea` 背景色，不影响功能
4. **ProjectLauncher 头部**：折叠按钮和折叠分支完全移除后，Launcher 现在是纯展示组件（不再管理折叠状态），简化了组件职责

## 成功标准达成情况

- [x] SideMenu 出现「项目启动器」菜单项（RocketOutlined icon）
- [x] 点击「项目启动器」→ center 区域切换到 ProjectLauncher 全高视图
- [x] 点击「UI 编辑」→ center 区域恢复 PagePreview + BottomTabPanel（仅元素信息 tab）
- [x] UI 编辑模式下 URL 输入框始终可见
- [x] 用户可直接在 URL 输入框中输入 URL 后回车加载页面
- [x] 项目启动后自动填入端口 URL 的逻辑保留
- [x] 底部「元素信息」tab 功能不变（选中元素后自动切换）
- [x] 构建通过
