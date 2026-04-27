# Phase 9 — Context

## Phase Goal
ProjectLauncher 默认值优化：项目路径自动填充 CWD，启动命令默认 `npm run mock`

## Requirements Traced
- FR-201: ProjectLauncher 默认值优化

## Current State Analysis

### 服务端
- `/api/project-dir` (server.js:970) 已存在，返回 `{ dir: process.env.CCV_PROJECT_DIR || process.cwd() }`
- 无需新建 API

### 前端 — ProjectLauncher.jsx
- `projectPath` 初始值为空字符串 `''`
- `command` 初始值为 `'npm run dev'`
- 需要从服务端获取 CWD 并设为 projectPath 默认值

### 前端 — AppBase.jsx
- `componentDidMount` 中已调用 `/api/project-name` 和 `/api/project-dir`（用于文件浏览器）
- 可在同一时机获取 CWD 并存入 state

## Key Files
| File | Role |
|------|------|
| `cc-viewer/src/components/VisualEditor/ProjectLauncher.jsx` | 接收 defaultPath prop |
| `cc-viewer/src/AppBase.jsx` | 获取 CWD 并传递 |
| `cc-viewer/src/App.jsx` | 将 CWD 传给 ProjectLauncher |

## Assumptions
1. `/api/project-dir` 返回的路径可直接用作项目启动路径
2. 默认命令改为 `npm run mock` 是硬编码变更，无需配置化
