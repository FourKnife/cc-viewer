# Phase 19 Summary — XML 结构化元素上下文

## 目标

将 `buildElementContext()` 的输出从纯文本格式重写为结构化 XML，将截图路径通过 `screenshotPaths` 参数内嵌为 `<screenshot>` 标签，并同步更新 TerminalPanel.jsx 的 Enter handler。

---

## 修改文件

### 1. `src/utils/elementContext.js` — 完整重写

**旧格式（纯文本）：**
```
请修改以下 React 组件中的元素:

文件: src/components/Button.jsx:42
组件: Button
元素: <button class="btn-primary large">
选择器: button.btn-primary
```

**新格式（结构化 XML）：**
```xml
<selected-element>
  <tag>button</tag>
  <component>Button</component>
  <file>src/components/Button.jsx:42</file>
  <class>btn-primary large</class>
  <id></id>
  <selector>button.btn-primary</selector>
  <text>提交</text>
  <styles>
    <color>rgb(255,255,255)</color>
    <background-color>rgb(24,144,255)</background-color>
    <font-size>14px</font-size>
    <font-weight>500</font-weight>
    <border-radius>6px</border-radius>
    <padding>8px 16px</padding>
  </styles>
</selected-element>
```

**关键变更：**
- 新增 `screenshotPaths` 参数（默认 `[]`），每个路径生成一个 `<screenshot>` 标签
- padding 自动折叠为 1值/2值/4值简写（all-equal → `8px`；top=bottom && left=right → `8px 16px`；其他 → `1px 2px 3px 4px`）
- `<id>` 标签在 id 为空时仍输出（`<id></id>`），保持结构完整性
- computedStyle 字段缺失时输出空标签（`<color></color>`）而非省略
- sourceInfo 为 null 时优雅降级，不输出 `<component>` / `<file>` 标签

### 2. `src/components/TerminalPanel.jsx` — Enter handler 更新

**旧逻辑：**
- 先调用 `buildElementContext(element)`（无截图参数）
- 用 shell 引号转义拼接 `imagePaths`（`'path1' 'path2' `）
- fullPrompt = `imagePaths + context（压缩单行）+ ' 用户要求: ' + userInput`

**新逻辑：**
- 收集 `screenshotPaths = pending?.map(img => img.path) ?? []`
- 调用 `buildElementContext(element, screenshotPaths)`（路径内嵌于 XML）
- fullPrompt = `context + '\n用户要求: ' + userInput`（保留 XML 多行结构）
- 移除了旧的 `if (context) {` 外层判断（context 只在 element 为 null 时为空，而此处 element 已确保存在）

### 3. `test/elementContext.test.js` — 新建单元测试（TDD）

13 个测试用例，覆盖：
- null/undefined 输入返回空字符串
- 根标签包裹
- 基础字段顺序与内容
- 无截图时无 `<screenshot>` 标签
- 单/多截图路径生成
- 6 个样式属性
- padding 3 种折叠规则
- computedStyle 字段缺失的空标签
- sourceInfo 为 null 的优雅降级

---

## 测试结果

```
✔ buildElementContext (13/13 pass)
✓ built in 8.62s
```

全部 13 个单元测试通过，生产构建无错误。

---

## 边界情况记录

1. **`<id></id>` 必须始终输出**：即使 `element.id` 为空字符串，结构完整性要求标签存在
2. **padding 折叠顺序**：先检查全等（1值），再检查 top=bottom && left=right（2值），否则输出4值；任意一侧缺失时 filter+join
3. **截图路径无需 shell 转义**：路径内嵌于 XML 标签，服务端直接读取，不经过 shell 展开
4. **context 永不为空（当 element 存在时）**：移除了旧的 `if (context)` 判断，简化控制流
