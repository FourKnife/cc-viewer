# Phase 10: 可视化模式右侧终端替换

## 目标
将可视化编辑模式右侧的 ChatView 替换为 TerminalPanel（xterm 终端），使用户可以直接在终端中与 Claude Code 交互。

---

## Plan 10.1: 替换 Visual 模式右侧面板

**目标**: 将 visual 模式布局中的 ChatView 替换为 TerminalPanel，保留选中元素 Tag 功能

### 任务

#### 10.1.1 修改 Visual 模式布局 — 替换 ChatView 为 TerminalPanel
**文件**: `cc-viewer/src/App.jsx`

当前 visual 模式布局（第 452-476 行）：
```
visualMain
  ├── visualSidebar (280px): ProjectLauncher + ElementInfo
  ├── visualPreview (flex:1): PagePreview
  └── chatViewWrapper (400px): ChatView compact=true
```

改为：
```
visualMain
  ├── visualSidebar (280px): ProjectLauncher + ElementInfo
  ├── visualPreview (flex:1): PagePreview
  └── terminalWrapper (400px): 选中元素 Tag + TerminalPanel
```

具体修改：
1. 在 App.jsx 顶部新增 `import TerminalPanel from './components/TerminalPanel';`（已有 `uploadFileAndGetPath` 导入，需改为同时导入 TerminalPanel）
2. 将第 472-474 行的 `<ChatView compact={true} ...>` 替换为：
   ```jsx
   <div className={styles.visualTerminalWrapper}>
     {this.state.selectedElement && (
       <div className={styles.visualElementTag}>
         <span>&lt;{this.state.selectedElement.tag}&gt;</span>
         {this.state.selectedElement.className && (
           <span className={styles.visualElementTagClass}>
             .{this.state.selectedElement.className.split(' ').slice(0, 2).join(' .')}
           </span>
         )}
         <span className={styles.visualElementTagClose} onClick={() => this.setState({ selectedElement: null })}>&times;</span>
       </div>
     )}
     <TerminalPanel
       pendingImages={[]}
       onFilePath={(path) => {}}
       modelName={this.state.contextWindow?.model}
     />
   </div>
   ```
3. 移除 visual 模式 ChatView 的所有相关 props（filteredRequests, mainAgentSessions, streamingLatest 等）
4. 保留非 visual 模式的 ChatView 不变（第 477-481 行）

#### 10.1.2 选中元素信息注入终端
**文件**: `cc-viewer/src/App.jsx`

当选中元素变化时，通过已有的 `ccv-terminal-send` 自定义事件机制将元素上下文信息自动注入到终端输入行：

1. 在 visual 模式下，当用户选中页面元素后，构建元素上下文字符串（复用 ChatView 中的 `buildElementContext` 逻辑思路）
2. 不自动发送 — 仅在用户需要时通过"发送到终端"按钮手动触发，避免干扰用户正在输入的内容
3. 在选中元素 Tag 旁添加"发送到终端"小按钮，点击后 dispatch `ccv-terminal-send` 事件

TerminalPanel 已有 `ccv-terminal-send` 监听器（TerminalPanel.jsx 第 137-140 行），无需修改 TerminalPanel 本身。

#### 10.1.3 添加布局样式
**文件**: `cc-viewer/src/App.module.css`

新增样式：
```css
.visualTerminalWrapper {
  display: flex;
  flex-direction: column;
  width: 400px;
  min-width: 400px;
  border-left: 1px solid var(--border-primary);
}

.visualElementTag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-base-alt);
  border-bottom: 1px solid var(--border-light);
  font-family: monospace;
}

.visualElementTagClass {
  color: var(--text-muted);
}

.visualElementTagClose {
  cursor: pointer;
  padding: 0 4px;
  color: var(--text-muted);
  margin-left: auto;
}

.visualElementTagClose:hover {
  color: var(--text-primary);
}
```

#### 10.1.4 清理 Visual 模式下不再需要的 ChatView 逻辑
**文件**: `cc-viewer/src/App.jsx`

- 移除 visual 模式区块中的 `<ChatView>` 组件及其所有 props
- 保留 `ChatView` import（非 visual 模式仍在使用）
- 保留 `PromptInput 已移除` 注释（历史记录）

**验收标准**:
- [ ] visual 模式右侧显示 xterm 终端而非 ChatView
- [ ] 终端可正常输入输出、连接 WebSocket PTY
- [ ] 终端工具栏（上传、Agent Team、UltraPlan、设置）正常显示
- [ ] 选中页面元素后，Tag 显示在终端上方
- [ ] 点击"发送到终端"按钮可将元素上下文注入终端
- [ ] 点击 Tag 的 × 可取消选中
- [ ] 非 visual 模式的 ChatView 不受影响
- [ ] TerminalPanel 在 400px 宽度下正常渲染和自适应（ResizeObserver + FitAddon）

---

## 风险

| 风险 | 影响 | 缓解 |
|------|------|------|
| TerminalPanel 在 400px 窄面板中列数过少 | 终端显示拥挤 | FitAddon 会自动计算列数，xterm 支持窄宽度；实测确认 |
| 移除 ChatView 后丢失选中元素上下文注入能力 | 用户无法带元素信息提问 | 通过 ccv-terminal-send 事件 + Tag 按钮实现等效功能 |
| WebSocket 多实例（chat 模式和 visual 模式各有 TerminalPanel） | PTY 会话冲突 | 同一时间只有一个模式激活，TerminalPanel 只在 visual 模式渲染 |

## 执行顺序

1. 10.1.3 — 先添加 CSS 样式
2. 10.1.1 — 替换布局组件
3. 10.1.2 — 添加元素信息注入
4. 10.1.4 — 清理旧代码
5. 构建验证 (`npm run build`)
