---
phase: 06-e2e-test-optimization
plan: 01
type: execute
wave: 1
depends_on: [05-01]
files_modified:
  - cc-viewer/src/components/VisualEditor/PagePreview.jsx
  - cc-viewer/src/components/VisualEditor/PromptInput.jsx
  - cc-viewer/src/components/VisualEditor/ProjectLauncher.jsx
  - cc-viewer/src/components/VisualEditor/styles.module.css
  - cc-viewer/src/i18n.js
autonomous: true
requirements: [FR-006]
must_haves:
  truths:
    - "核心流程端到端可跑通"
    - "关键错误场景有提示信息"
    - "UI 交互流畅无明显卡顿"
---

<objective>
完整流程测试，修复问题，优化 Visual Editor 体验。

Purpose: 确保 MVP 可用，关键路径无阻塞
Output: 稳定可用的 Visual Editor 功能
</objective>

<execution_context>
@.planning/phases/6-CONTEXT.md
</execution_context>

<tasks>

<task type="auto">
  <name>Task 1: 代理加载错误处理</name>
  <files>cc-viewer/src/components/VisualEditor/PagePreview.jsx</files>
  <action>
给 PagePreview 添加 iframe 加载错误处理:

1. 检测 iframe 加载超时（10 秒）
2. 代理 502 错误时显示友好提示
3. 添加手动刷新重试按钮

在 iframe 上添加 onError 处理，并用 setTimeout 检测超时:

```jsx
const [loadError, setLoadError] = useState('');
const loadTimerRef = useRef(null);

// iframe 加载开始时设置超时
useEffect(() => {
  if (iframeSrc) {
    setLoadError('');
    loadTimerRef.current = setTimeout(() => {
      setLoadError(t('visual.loadTimeout'));
    }, 15000);
  }
  return () => { if (loadTimerRef.current) clearTimeout(loadTimerRef.current); };
}, [iframeSrc, iframeKey]);

// iframe onLoad 时清除超时
<iframe onLoad={() => clearTimeout(loadTimerRef.current)} />

// 显示错误信息
{loadError && <div className={styles.iframeError}>{loadError}</div>}
```
  </action>
  <verify>
    <automated>grep -q "loadError" cc-viewer/src/components/VisualEditor/PagePreview.jsx && echo "Error handling added"</automated>
  </verify>
  <done>
- iframe 加载超时检测
- 错误提示显示
  </done>
</task>

<task type="auto">
  <name>Task 2: PromptInput 无 PTY 提示</name>
  <files>cc-viewer/src/components/VisualEditor/PromptInput.jsx</files>
  <action>
当 disabled（PTY 未连接）时，显示更友好的提示信息:

```jsx
if (disabled) {
  return (
    <div className={styles.promptEmpty}>
      <Typography.Text type="secondary">{t('visual.noClaude')}</Typography.Text>
    </div>
  );
}
```
  </action>
  <verify>
    <automated>grep -q "noClaude" cc-viewer/src/components/VisualEditor/PromptInput.jsx && echo "No PTY hint added"</automated>
  </verify>
  <done>
- PTY 未连接时显示提示
  </done>
</task>

<task type="auto">
  <name>Task 3: 左侧面板滚动优化</name>
  <files>cc-viewer/src/components/VisualEditor/styles.module.css, cc-viewer/src/App.jsx</files>
  <action>
左侧 sidebar 内容较多时需要滚动：
1. visualSidebar 添加 overflow-y: auto
2. 确保滚动区域有合适的 padding

检查 App.module.css 中 visualSidebar 样式，添加:
```css
.visualSidebar {
  overflow-y: auto;
  padding: 12px;
}
```
  </action>
  <verify>
    <automated>grep -q "visualSidebar" cc-viewer/src/App.module.css && echo "Sidebar scroll exists"</automated>
  </verify>
  <done>
- 左侧面板支持滚动
  </done>
</task>

<task type="auto">
  <name>Task 4: i18n 补充 + 构建验证</name>
  <files>cc-viewer/src/i18n.js</files>
  <action>
添加缺失的 i18n 键:
- visual.loadTimeout: 页面加载超时，请检查项目是否已启动
- visual.noClaude: 请先在终端中启动 Claude Code

运行 `npm run build` 验证。
  </action>
  <verify>
    <automated>cd /Users/duanrong/yuyan/duanrong/cleffa/cc-viewer && npm run build 2>&1 | tail -3</automated>
  </verify>
  <done>
- i18n 键补充
- 构建通过
  </done>
</task>

</tasks>

<verification>
## Phase 6 完成检查

1. **错误处理**
   - [ ] 代理加载失败时显示友好提示
   - [ ] PTY 未连接时 PromptInput 显示提示
   - [ ] iframe 加载超时有提示

2. **UI 优化**
   - [ ] 左侧面板内容多时可滚动
   - [ ] 各组件之间间距合理

3. **构建**
   - [ ] npm run build 成功
</verification>

<success_criteria>
1. 错误场景有友好提示
2. UI 交互流畅
3. npm run build 成功
</success_criteria>
