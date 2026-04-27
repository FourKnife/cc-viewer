# Phase 9 — Plan: ProjectLauncher 默认值优化

## Goal
项目路径自动填充为启动 ccv 时的 CWD，启动命令默认为 `npm run mock`

## Steps

### Step 1: AppBase 获取 CWD 并存入 state

**File**: `cc-viewer/src/AppBase.jsx`

1. 在 state 初始化中添加 `projectDir: ''`
2. 在 `componentDidMount` 中，找到已有的 `/api/project-dir` 调用或新增一个，将结果存入 `this.setState({ projectDir: data.dir })`

**验证**: AppBase state 中 projectDir 被正确赋值

### Step 2: App.jsx 传递 defaultPath 给 ProjectLauncher

**File**: `cc-viewer/src/App.jsx`

1. 在 visual 模式的 `<ProjectLauncher>` 组件上添加 `defaultPath={this.state.projectDir}` prop

**验证**: ProjectLauncher 收到 defaultPath prop

### Step 3: ProjectLauncher 使用默认值

**File**: `cc-viewer/src/components/VisualEditor/ProjectLauncher.jsx`

1. 组件接收 `defaultPath` prop
2. 将 `command` 的 useState 默认值从 `'npm run dev'` 改为 `'npm run mock'`
3. 添加 useEffect：当 `defaultPath` 变化且 projectPath 为空时，自动填充 `setProjectPath(defaultPath)`

**验证**: 打开可视化模式后，路径和命令已自动填充

## Estimated Changes
- 3 files modified, ~10 lines changed
- No new files, no new dependencies

## Success Criteria
1. 打开可视化编辑模式后，项目路径已自动显示为 CWD
2. 启动命令显示为 `npm run mock`
3. 用户仍可手动修改路径和命令
4. `npm run build` 通过
