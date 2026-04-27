# Phase 15: 操作区折叠 + UI 精细化

**目标**: ProjectLauncher 支持折叠/最小化，项目启动后自动折叠，整体 UI 打磨

**依赖**: Phase 14（已完成）

---

## 任务分解

### Task 1: ProjectLauncher 折叠/展开能力

**文件**: `src/components/VisualEditor/ProjectLauncher.jsx`, `src/components/VisualEditor/styles.module.css`

改动:
- 新增 `collapsed` prop 和 `onToggleCollapse` 回调
- 折叠态仅显示一行摘要：项目状态指示灯 + 项目路径 + 展开按钮
- 展开态保持现有完整表单
- 折叠/展开动画用 CSS transition（max-height）

### Task 2: 项目启动成功后自动折叠

**文件**: `src/App.jsx`

改动:
- 新增 state `launcherCollapsed: false`
- 监听 `projectStatus` 变化：当 status 从非 running 变为 running 时，设置 `launcherCollapsed: true`
- 将 collapsed/onToggleCollapse 传入 ProjectLauncher

### Task 3: ElementInfo 在操作区自适应布局

**文件**: `src/App.jsx`, `src/components/VisualEditor/styles.module.css`

改动:
- 操作区改为 flex column 布局
- ProjectLauncher 折叠时 ElementInfo 占满剩余空间
- 展开时两者按内容分配

### Task 4: i18n 条目

**文件**: `src/i18n.js`

新增键:
- `visual.launcher.collapse` — 折叠
- `visual.launcher.expand` — 展开
- `visual.launcher.summary` — 摘要行文案模板

### Task 5: Anti-AI-Slop 审查 + 主题一致性

审查要点:
- 无紫色渐变、无 emoji 图标、无圆角卡片+左侧色条
- 深色/浅色主题下视觉一致
- Pipeline 占位页面样式与整体风格统一

---

## 验收标准

1. ProjectLauncher 可手动折叠/展开
2. 项目启动成功后自动折叠，预览区域空间最大化
3. ElementInfo 在操作区中自适应（Launcher 折叠时获得更多空间）
4. 深色/浅色主题视觉一致
5. 无 AI-Slop 痕迹
