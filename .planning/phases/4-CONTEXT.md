# Phase 4 Context: DOM-源码映射

## 决策摘要

| 决策点 | 决定 | 原因 |
|--------|------|------|
| 主方案 | React Fiber `_debugSource` | 开发模式默认可用，零配置，精确到文件+行号 |
| 降级方案 | 组件名 + 文件搜索 | fiber 无 _debugSource 时通过组件名定位 |
| 数据获取位置 | inspector-inject.js (iframe 内) | 直接访问 DOM → fiber，无需跨域 |
| 服务端辅助 | /api/source-locate 路由 | 根据组件名/文件名在项目目录中搜索源码 |

---

## 技术方案

### 1. React Fiber `_debugSource` (主方案)

**原理:**
- Babel 的 `@babel/plugin-transform-react-jsx-source` 在开发模式自动注入 `__source` prop
- Smallfish/Umi 项目默认启用此插件
- React 将 `__source` 存储在 fiber 节点的 `_debugSource` 属性中
- 从 DOM 元素可以通过 `__reactFiber$*` 或 `__reactInternalInstance$*` 访问 fiber

**实现步骤:**
1. 在 inspector-inject.js 中，选中元素后查找 React fiber
2. 从 fiber 中提取 `_debugSource: { fileName, lineNumber, columnNumber }`
3. 沿 fiber 树向上查找，获取最近的组件名 (`fiber.type.name` 或 `fiber.type.displayName`)
4. 通过 postMessage 发送给父窗口

**获取 fiber 的方法:**
```javascript
function getReactFiber(el) {
  const key = Object.keys(el).find(k =>
    k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
  );
  return key ? el[key] : null;
}
```

### 2. 组件名 + 服务端搜索 (降级方案)

**场景:** `_debugSource` 不可用（生产构建、非 JSX 元素）

**实现:**
1. 从 fiber 树获取组件名
2. 发送到服务端 `/api/source-locate`
3. 服务端在项目目录中搜索匹配的组件定义

### 3. postMessage 协议扩展

```javascript
// inspector → parent (扩展现有 select 消息)
{
  source: 'cc-visual-inspector',
  type: 'select',
   {
    // ...现有 elementInfo 字段
    sourceInfo: {
      fileName: 'src/components/Button.tsx',
      lineNumber: 42,
      columnNumber: 6,
      componentName: 'Button',
      componentStack: ['App', 'Layout', 'Button']  // 组件层级
    }
  }
}
```

---

## 文件修改清单

### 修改文件

| 文件 | 改动 |
|------|------|
| `cc-viewer/public/inspector-inject.js` | 添加 React fiber 读取 + _debugSource 提取 |
| `cc-viewer/server.js` | 添加 /api/source-locate 路由 |
| `cc-viewer/src/components/VisualEditor/ElementInfo.jsx` | 展示源码位置信息 + 点击跳转 |
| `cc-viewer/src/components/VisualEditor/styles.module.css` | 源码信息样式 |
| `cc-viewer/src/i18n.js` | 添加 visual.sourceFile 等 i18n 键 |

---

## 依赖

- Phase 3 完成（元素选择器 + postMessage 通信）
- 目标项目在开发模式下运行（_debugSource 需要 dev 模式）

---

## 风险

| 风险 | 缓解措施 |
|------|----------|
| React 内部 fiber key 名称变化 | 动态查找 `__reactFiber$*` 前缀 |
| 非 React 项目 | 降级提示"无法定位源码" |
| _debugSource 不可用 | 降级到组件名搜索 |
| 生产构建组件名混淆 | 提示用户使用开发模式 |
