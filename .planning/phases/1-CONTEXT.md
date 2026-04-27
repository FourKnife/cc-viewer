# Phase 1 Context: 基于 cc-viewer 的架构分析与规划

## 决策摘要

| 决策点 | 决定 | 原因 |
|--------|------|------|
| 基础代码库 | Fork cc-viewer | 已有完整的 Claude 代理、服务器、UI 框架 |
| 集成策略 | 提取核心 + 扩展 | 保留代理/通信层，按需改造 UI |
| 现有功能处理 | 保留核心功能 | 对话界面、文件操作、Diff 视图有复用价值 |
| 新功能入口 | 新建 "Visual Editor" Tab | 不破坏现有功能，独立开发 |
| 项目启动器 | 复用 pty-manager | 已有成熟的进程管理能力 |

---

## 源代码库：cc-viewer

**仓库**: https://github.com/FourKnife/cc-viewer (用户 Fork)

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 18 + JSX |
| 构建工具 | Vite 6 |
| UI 库 | Ant Design 5 |
| 代码编辑器 | CodeMirror 6 |
| 终端 | xterm.js |
| 后端 | Node.js (ESM) |
| 通信 | WebSocket + SSE |

### 关键文件映射

```
cc-viewer/
├── proxy.js              # Claude API 代理 → 直接复用
├── pty-manager.js        # 进程管理 → 扩展用于项目启动
├── server.js             # REST/WS 服务 → 添加新路由
├── interceptor.js        # 请求拦截 → 可能需要调整
├── src/
│   ├── App.jsx           # 主应用 → 添加新 Tab
│   ├── components/
│   │   ├── ChatView/     # 对话界面 → 复用
│   │   ├── DiffView/     # Diff 展示 → 复用
│   │   ├── TerminalPanel/# 终端面板 → 复用
│   │   └── [新增]/
│   │       ├── VisualEditor/      # 可视化编辑器 Tab
│   │       ├── ProjectLauncher/   # 项目启动器
│   │       ├── PagePreview/       # 页面预览 iframe
│   │       └── ElementInspector/  # 元素选择器
```

---

## 复用组件清单

### 直接复用（不改动）

1. **proxy.js** - Claude API 代理
   - 自动端口选择
   - 请求转发和拦截
   - 配置文件读取

2. **ChatView + ChatMessage** - 对话界面
   - Markdown 渲染
   - 代码高亮
   - 流式响应

3. **DiffView** - 代码差异展示
   - 并排/统一视图
   - 语法高亮

### 扩展复用（需改动）

1. **pty-manager.js** - 进程管理
   - 现有：启动 Claude CLI
   - 扩展：启动任意 npm 命令
   - 新增：项目状态追踪

2. **server.js** - 后端服务
   - 新增路由：`/api/project/start`, `/api/project/stop`
   - 新增路由：`/api/proxy/:port/*` (项目代理)
   - 新增路由：`/api/source-map` (源码映射)

3. **App.jsx** - 主应用
   - 新增 Tab：Visual Editor
   - 新增状态：当前项目配置

---

## 新增模块规划

### 1. VisualEditor Tab (前端)

**路径**: `src/components/VisualEditor/`

**子组件**:
- `ProjectLauncher.jsx` - 项目配置和启动
- `PagePreview.jsx` - iframe 页面嵌入
- `ElementInspector.jsx` - 元素选择器覆盖层
- `ElementInfo.jsx` - 选中元素信息面板
- `PromptInput.jsx` - AI 修改指令输入

### 2. 项目管理模块 (后端)

**路径**: `lib/project-manager.js`

**功能**:
- 启动项目进程
- 代理项目端口
- 监控项目状态
- 热更新检测

### 3. 元素选择注入脚本

**路径**: `public/inspector-inject.js`

**功能**:
- 注入到 iframe 页面
- 鼠标悬停高亮
- 点击选择通信
- DOM 路径生成

### 4. Source Map 解析器

**路径**: `lib/source-mapper.js`

**功能**:
- 解析 .map 文件
- DOM 选择器 → 文件位置
- React 组件名提取

---

## Phase 1 重新定义

**原目标**: 从零搭建项目骨架

**新目标**: 分析 cc-viewer + 制定改造计划

### Phase 1 任务清单

1. **Fork 并运行 cc-viewer**
   - Fork 仓库到本地
   - 安装依赖并运行
   - 验证基础功能正常

2. **深入分析关键模块**
   - 阅读 proxy.js 理解代理机制
   - 阅读 pty-manager.js 理解进程管理
   - 阅读 server.js 理解 API 结构
   - 阅读 App.jsx 理解 UI 路由

3. **制定详细改造清单**
   - 列出需要修改的文件
   - 列出需要新增的文件
   - 确定模块依赖关系

4. **创建项目分支**
   - 创建 `feature/visual-editor` 分支
   - 设置基础开发环境

---

## 风险和缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| cc-viewer 代码复杂度高 | 理解成本大 | 聚焦核心模块，渐进式理解 |
| 现有功能耦合紧密 | 改动影响范围大 | 新功能独立 Tab，最小化改动 |
| React 版本/依赖冲突 | 构建失败 | 使用现有依赖，不引入新框架 |
| iframe 跨域限制 | 元素选择失效 | 统一代理域名 |

---

## 下一步行动

1. 用户手动 Fork https://github.com/FourKnife/cc-viewer
2. Clone 到 cleffa 目录（或作为子目录）
3. 运行 `/gsd:plan-phase 1` 生成详细执行计划
