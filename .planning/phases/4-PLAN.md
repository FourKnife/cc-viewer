---
phase: 04-dom-source-mapping
plan: 01
type: execute
wave: 1
depends_on: [03-01]
files_modified:
  - cc-viewer/public/inspector-inject.js
  - cc-viewer/server.js
  - cc-viewer/src/components/VisualEditor/ElementInfo.jsx
  - cc-viewer/src/components/VisualEditor/styles.module.css
  - cc-viewer/src/i18n.js
autonomous: true
requirements: [FR-004]
must_haves:
  truths:
    - "选中 React 元素后显示源码文件路径和行号"
    - "显示 React 组件名和组件层级"
    - "点击文件路径可复制完整路径"
    - "_debugSource 不可用时优雅降级"
  artifacts:
    - path: "cc-viewer/public/inspector-inject.js"
      provides: "React fiber 读取 + _debugSource 提取"
    - path: "cc-viewer/server.js"
      provides: "/api/source-locate 搜索路由"
  key_links:
    - from: "inspector-inject.js"
      to: "ElementInfo.jsx"
      via: "postMessage sourceInfo"
---

<objective>
将选中的 DOM 元素映射到源代码位置（文件+行号+组件名）。

Purpose: 为 Phase 5 的 AI 修改提供精确的源码定位上下文
Output: 选中元素 → 源码文件/行号/组件名 → ElementInfo 面板展示
</objective>

<execution_context>
@.planning/phases/4-CONTEXT.md
@.planning/phases/3-CONTEXT.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: inspector-inject.js 添加 React fiber 源码提取</name>
  <files>cc-viewer/public/inspector-inject.js</files>
  <action>
在 inspector-inject.js 中扩展 `getElementInfo` 函数，添加源码定位逻辑：

1. 添加 `getReactFiber(el)` — 从 DOM 元素查找 React fiber 节点
2. 添加 `getSourceInfo(el)` — 从 fiber 提取 _debugSource + 组件名
3. 在 `getElementInfo` 返回值中增加 `sourceInfo` 字段

```javascript
function getReactFiber(el) {
  if (!el) return null;
  var key = Object.keys(el).find(function(k) {
    return k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$');
  });
  return key ? el[key] : null;
}

function getSourceInfo(el) {
  var fiber = getReactFiber(el);
  if (!fiber) return null;

  var source = null;
  var componentName = null;
  var componentStack = [];

  // 沿 fiber 树向上查找 _debugSource 和组件名
  var current = fiber;
  while (current) {
    // 获取组件名（函数组件或类组件）
    if (current.type && typeof current.type === 'function') {
      var name = current.type.displayName || current.type.name;
      if (name && name !== '_c') {
        if (!componentName) componentName = name;
        componentStack.push(name);
      }
    }
    // 获取 _debugSource
    if (!source && current._debugSource) {
      source = {
        fileName: current._debugSource.fileName,
        lineNumber: current._debugSource.lineNumber,
        columnNumber: current._debugSource.columnNumber || 0,
      };
    }
    // 两者都找到则停止
    if (source && componentName) break;
    current = current.return;
  }

  if (!source && !componentName) return null;

  return {
    fileName: source ? source.fileName : null,
    lineNumber: source ? source.lineNumber : null,
    columnNumber: source ? source.columnNumber : 0,
    componentName: componentName,
    componentStack: componentStack.slice(0, 10),
  };
}
```

在 `getElementInfo` 返回对象中添加:
```javascript
sourceInfo: getSourceInfo(el),
```
  </action>
  <verify>
    <automated>grep -q "getReactFiber" cc-viewer/public/inspector-inject.js && grep -q "_debugSource" cc-viewer/public/inspector-inject.js && echo "Fiber extraction added"</automated>
  </verify>
  <done>
- getReactFiber() 查找函数
- getSourceInfo() 提取 _debugSource + 组件名
- getElementInfo 返回 sourceInfo 字段
  </done>
</task>

<task type="auto">
  <name>Task 2: 添加 /api/source-locate 服务端路由</name>
  <files>cc-viewer/server.js</files>
  <action>
添加服务端路由，根据组件名或文件名在项目目录中搜索源码位置（作为 _debugSource 的降级方案）。

路由: `GET /api/source-locate?file=xxx&component=xxx`

逻辑:
1. 如果提供了 `file` 参数，检查文件是否存在，返回绝对路径
2. 如果只有 `component` 参数，在项目目录中搜索匹配的导出
3. 返回 `{ found: true, filePath, lineNumber }` 或 `{ found: false }`

```javascript
// GET /api/source-locate
if (url === '/api/source-locate' && method === 'GET') {
  const fileName = parsedUrl.searchParams.get('file');
  const component = parsedUrl.searchParams.get('component');
  const projectDir = projectManager.getStatus()?.projectPath || process.cwd();

  if (fileName) {
    // 尝试解析文件路径
    const candidates = [
      join(projectDir, fileName),
      // _debugSource 可能返回完整绝对路径
      fileName,
    ];
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ found: true, filePath: candidate }));
        return;
      }
    }
    // 尝试模糊匹配（去掉路径前缀）
    const baseName = basename(fileName);
    try {
      const { execSync } = require('child_process');
      const result = execSync(
        `find ${JSON.stringify(projectDir)} -name ${JSON.stringify(baseName)} -not -path "*/node_modules/*" -not -path "*/.umi/*" | head -5`,
        { encoding: 'utf-8', timeout: 3000 }
      ).trim();
      if (result) {
        const firstMatch = result.split('\n')[0];
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ found: true, filePath: firstMatch }));
        return;
      }
    } catch {}
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ found: false }));
  return;
}
```

放在 `/api/project/status` 路由之后、`/inspector-inject.js` 路由之前。
  </action>
  <verify>
    <automated>grep -q "source-locate" cc-viewer/server.js && echo "Source locate route added"</automated>
  </verify>
  <done>
- /api/source-locate 路由添加
- 支持 file 精确查找 + 模糊匹配
- 返回 { found, filePath }
  </done>
</task>

<task type="auto">
  <name>Task 3: ElementInfo 面板展示源码信息</name>
  <files>cc-viewer/src/components/VisualEditor/ElementInfo.jsx, cc-viewer/src/components/VisualEditor/styles.module.css</files>
  <action>
扩展 ElementInfo 组件，展示源码位置信息：

1. 显示组件名（带图标）
2. 显示文件路径 + 行号
3. 显示组件层级（可折叠）
4. 点击文件路径复制到剪贴板
5. sourceInfo 不可用时不显示此区域

```jsx
// 在 ElementInfo 中添加源码信息区域
{element.sourceInfo && (
  <div className={styles.sourceInfo}>
    <Typography.Title level={5}>{t('visual.sourceLocation')}</Typography.Title>
    {element.sourceInfo.componentName && (
      <div className={styles.elementRow}>
        <span className={styles.elementLabel}>Component</span>
        <Tag color="blue">{element.sourceInfo.componentName}</Tag>
      </div>
    )}
    {element.sourceInfo.fileName && (
      <div className={styles.sourceFile} onClick={() => {
        const text = `${element.sourceInfo.fileName}:${element.sourceInfo.lineNumber}`;
        navigator.clipboard.writeText(text);
        message.success(t('visual.copied'));
      }}>
        <span className={styles.sourceFileName}>
          {element.sourceInfo.fileName.split('/').pop()}
        </span>
        <span className={styles.sourceLineNumber}>
          :{element.sourceInfo.lineNumber}
        </span>
      </div>
    )}
    {element.sourceInfo.componentStack?.length > 1 && (
      <div className={styles.componentStack}>
        <span className={styles.elementLabel}>Stack</span>
        <span className={styles.elementValue}>
          {element.sourceInfo.componentStack.join(' → ')}
        </span>
      </div>
    )}
  </div>
)}
```

CSS 样式:
```css
.sourceInfo {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--border-color, #333);
}
.sourceFile {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  background: var(--bg-code, #1a1a1a);
  border: 1px solid var(--border-color, #333);
  border-radius: 4px;
  cursor: pointer;
  font-family: monospace;
  font-size: 12px;
  margin: 4px 0;
  transition: border-color 0.2s;
}
.sourceFile:hover {
  border-color: var(--color-primary-light, #1668dc);
}
.sourceFileName {
  color: var(--color-primary-light, #1668dc);
}
.sourceLineNumber {
  color: var(--text-muted, #666);
}
.componentStack {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-top: 4px;
  font-size: 11px;
}
```
  </action>
  <verify>
    <automated>grep -q "sourceInfo" cc-viewer/src/components/VisualEditor/ElementInfo.jsx && echo "Source info display added"</automated>
  </verify>
  <done>
- 源码位置信息展示
- 组件名 + 文件路径 + 行号
- 组件层级堆栈
- 点击复制路径
  </done>
</task>

<task type="auto">
  <name>Task 4: 添加 i18n 键 + 构建验证</name>
  <files>cc-viewer/src/i18n.js</files>
  <action>
添加源码映射相关的 i18n 键:
- visual.sourceLocation: 源码位置
- visual.copied: 已复制
- visual.noSource: 无法定位源码

运行 `npm run build` 验证构建通过。
  </action>
  <verify>
    <automated>cd /Users/duanrong/yuyan/duanrong/cleffa/cc-viewer && npm run build 2>&1 | tail -3</automated>
  </verify>
  <done>
- i18n 键添加
- 构建通过
  </done>
</task>

</tasks>

<verification>
## Phase 4 完成检查

1. **React Fiber 读取**
   - [ ] 选中 React 组件时能获取到 fiber 节点
   - [ ] 从 fiber 中提取 _debugSource 信息

2. **源码信息展示**
   - [ ] 选中 React 元素后面板显示组件名
   - [ ] 显示文件路径和行号
   - [ ] 显示组件层级堆栈

3. **交互**
   - [ ] 点击文件路径复制到剪贴板
   - [ ] _debugSource 不可用时面板不显示源码区域

4. **降级**
   - [ ] 非 React 元素不报错
   - [ ] 生产构建组件名不可用时优雅处理

5. **端到端**
   - [ ] 启动 Smallfish 项目 → 选中按钮 → 看到组件名和文件路径 → 点击复制 → 粘贴验证
</verification>

<success_criteria>
1. 选中 React 元素后 ElementInfo 面板显示 componentName
2. 显示 fileName:lineNumber（来自 _debugSource）
3. 组件层级堆栈正确显示
4. 非 React 元素 / 无 _debugSource 时不报错
5. npm run build 成功
</success_criteria>
