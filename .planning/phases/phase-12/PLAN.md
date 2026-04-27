---
phase: 12
plan: A
title: "结构化设计稿对比 — DOM vs Sketch JSON 属性级比对"
description: "将截图像素对比替换为 DOM computed styles vs Sketch 图层 JSON 的结构化属性对比，生成精确差异表和自动修复命令"
estimated_effort: medium
dependencies: []
files_to_read:
  - public/inspector-inject.js
  - server.js
  - src/components/VisualEditor/PagePreview.jsx
  - src/components/VisualEditor/ElementInfo.jsx
  - src/i18n.js
  - src/App.jsx
files_to_modify:
  - public/inspector-inject.js
  - server.js
  - src/components/VisualEditor/PagePreview.jsx
  - src/i18n.js
---

# Plan A: 结构化设计稿对比 — DOM vs Sketch JSON 属性级比对

## 目标

选中页面元素后点击对比按钮，自动：
1. 从 iframe 内 DOM 提取选中元素的完整 computed styles
2. 从 Sketch MCP 提取当前选中图层的结构化属性 JSON
3. 属性级对比，生成精确差异表（property → DOM value vs Sketch value）
4. 构建包含结构化差异信息的修复 Prompt，发送到右侧 CC 终端

## 与 Phase 11 的关系

Phase 11 的截图对比 (`handleAutoCompare` + pixelmatch) 将被替换为结构化对比。保留的部分：
- ScreenshotCompare 弹窗（CameraOutlined 按钮触发）
- DiffOutlined 按钮入口（行为从截图对比改为结构化对比）
- `ccv-terminal-send` 事件发送机制
- `/api/sketch-screenshot` API（ScreenshotCompare 仍使用）

## 任务清单

### Task 1: 扩展 inspector-inject.js 的 computedStyle 采集

**文件**: `public/inspector-inject.js`

当前 `getElementInfo` 函数的 `computedStyle` 仅采集 5 个属性。扩展为完整的设计对比属性集。

找到 `computedStyle: {` 块（约 L106-112），替换为：

```javascript
computedStyle: {
  // 布局
  display: computed.display,
  position: computed.position,
  width: computed.width,
  height: computed.height,
  // 文字
  fontSize: computed.fontSize,
  fontWeight: computed.fontWeight,
  fontFamily: computed.fontFamily,
  lineHeight: computed.lineHeight,
  letterSpacing: computed.letterSpacing,
  textAlign: computed.textAlign,
  color: computed.color,
  // 背景
  backgroundColor: computed.backgroundColor,
  backgroundImage: computed.backgroundImage,
  // 间距
  paddingTop: computed.paddingTop,
  paddingRight: computed.paddingRight,
  paddingBottom: computed.paddingBottom,
  paddingLeft: computed.paddingLeft,
  marginTop: computed.marginTop,
  marginRight: computed.marginRight,
  marginBottom: computed.marginBottom,
  marginLeft: computed.marginLeft,
  // 边框
  borderTopWidth: computed.borderTopWidth,
  borderTopColor: computed.borderTopColor,
  borderTopStyle: computed.borderTopStyle,
  borderRadius: computed.borderRadius,
  // 阴影
  boxShadow: computed.boxShadow,
  // 透明度
  opacity: computed.opacity,
},
```

### Task 2: 新增服务端 API `/api/sketch-layer-styles`

**文件**: `server.js`

在 `/api/sketch-screenshot` 路由之前（约 L1100），新增路由。该 API 通过 Sketch MCP `run_code` 提取选中图层的结构化属性 JSON，而非截图。

```javascript
// Sketch 图层结构化样式提取（通过 MCP run_code 提取选中图层属性 JSON）
if (url === '/api/sketch-layer-styles' && method === 'GET') {
  const script = `
const sketch = require('sketch');
const doc = sketch.getSelectedDocument();
if (!doc || doc.selectedLayers.layers.length === 0) {
  console.log(JSON.stringify({ error: 'no_selection' }));
} else {
  const layer = doc.selectedLayers.layers[0];
  const result = { name: layer.name, type: layer.type, frame: { x: layer.frame.x, y: layer.frame.y, width: layer.frame.width, height: layer.frame.height } };

  // 文字图层
  if (layer.type === 'Text') {
    result.text = layer.text;
    result.textStyle = {
      fontSize: layer.style.fontSize,
      fontWeight: layer.style.fontWeight,
      fontFamily: layer.style.fontFamily,
      lineHeight: layer.style.lineHeight,
      letterSpacing: layer.style.kerning,
      textColor: layer.style.textColor,
      alignment: layer.style.alignment
    };
  }

  // 填充
  if (layer.style && layer.style.fills) {
    result.fills = layer.style.fills.filter(function(f) { return f.enabled; }).map(function(f) {
      var info = { fillType: f.fillType, color: f.color };
      if (f.fillType === 'Gradient' && f.gradient) {
        info.gradient = { type: f.gradient.gradientType, stops: f.gradient.stops.map(function(s) { return { color: s.color, position: s.position }; }) };
      }
      return info;
    });
  }

  // 边框
  if (layer.style && layer.style.borders) {
    result.borders = layer.style.borders.filter(function(b) { return b.enabled; }).map(function(b) {
      return { color: b.color, thickness: b.thickness, position: b.position };
    });
  }

  // 阴影
  if (layer.style && layer.style.shadows) {
    result.shadows = layer.style.shadows.filter(function(s) { return s.enabled; }).map(function(s) {
      return { color: s.color, x: s.x, y: s.y, blur: s.blur, spread: s.spread };
    });
  }

  // 圆角
  if (layer.points) {
    var radii = layer.points.map(function(p) { return p.cornerRadius || 0; });
    result.borderRadius = radii;
  }

  // 透明度
  result.opacity = layer.style ? layer.style.opacity : 1;

  // 子图层概要（仅第一层）
  if (layer.layers && layer.layers.length > 0) {
    result.children = layer.layers.map(function(child) {
      return { name: child.name, type: child.type, frame: { x: child.frame.x, y: child.frame.y, width: child.frame.width, height: child.frame.height } };
    });
  }

  console.log(JSON.stringify(result));
}`;

  const postData = JSON.stringify({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: { name: 'run_code', arguments: { script, title: 'extract_layer_styles' } },
    id: Date.now()
  });

  const mcpReq = httpRequest({
    hostname: '127.0.0.1', port: 31126, path: '/mcp', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
    timeout: 10000
  }, (mcpRes) => {
    let body = '';
    mcpRes.on('data', c => { body += c; });
    mcpRes.on('end', () => {
      try {
        const data = JSON.parse(body);
        const content = data?.result?.content;
        const text = Array.isArray(content) ? content.find(c => c.type === 'text') : null;
        if (text?.text) {
          let rawText = text.text;
          if (rawText.startsWith("'") && rawText.endsWith("'")) {
            rawText = rawText.slice(1, -1);
          }
          const parsed = JSON.parse(rawText);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(parsed));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'empty_response' }));
        }
      } catch (parseErr) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'parse_error' }));
      }
    });
  });
  mcpReq.on('error', () => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'mcp_unavailable' }));
  });
  mcpReq.on('timeout', () => { mcpReq.destroy(); });
  mcpReq.write(postData);
  mcpReq.end();
  return;
}
```

**返回数据结构示例:**

```json
{
  "name": "标题文字",
  "type": "Text",
  "frame": { "x": 48, "y": 120, "width": 654, "height": 50 },
  "text": "你有使用中的余额宝服务",
  "textStyle": {
    "fontSize": 40,
    "fontWeight": 6,
    "fontFamily": "PingFang SC",
    "lineHeight": 56,
    "letterSpacing": 0,
    "textColor": "#333333ff",
    "alignment": "center"
  },
  "fills": [{ "fillType": "Color", "color": "#ffffffff" }],
  "borders": [],
  "shadows": [],
  "opacity": 1
}
```

### Task 3: 新增 i18n 条目

**文件**: `src/i18n.js`

替换现有的 `visual.autoCompare` 系列条目，调整措辞以反映结构化对比：

```javascript
"visual.structCompare": {
  zh: "结构化对比设计稿",
  en: "Structural design comparison"
},
"visual.structCompare.needSelection": {
  zh: "请先选中一个页面元素",
  en: "Select an element first"
},
"visual.structCompare.needSketch": {
  zh: "Sketch MCP 未连接",
  en: "Sketch MCP not connected"
},
"visual.structCompare.fetching": {
  zh: "正在提取样式数据...",
  en: "Extracting style data..."
},
"visual.structCompare.noMismatch": {
  zh: "所有属性匹配，无需调整",
  en: "All properties match, no adjustment needed"
},
"visual.structCompare.sent": {
  zh: "已发送结构化差异修复命令到终端",
  en: "Structural diff fix command sent to terminal"
},
"visual.structCompare.sketchError": {
  zh: "Sketch 图层样式提取失败",
  en: "Failed to extract Sketch layer styles"
},
```

### Task 4: 重写 PagePreview.jsx 的 handleAutoCompare

**文件**: `src/components/VisualEditor/PagePreview.jsx`

将现有的截图+pixelmatch 方案替换为结构化属性对比。

#### 4.1 新增样式对比工具函数（在组件外部定义）

在文件顶部 `toProxyUrl` 函数之后，新增：

```javascript
// ---- 结构化样式对比工具 ----

// 将 Sketch 颜色 (#rrggbbaa) 归一化为 CSS rgb/rgba
function normalizeSketchColor(hex) {
  if (!hex || typeof hex !== 'string') return null;
  hex = hex.replace(/^#/, '');
  if (hex.length === 8) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = parseInt(hex.slice(6, 8), 16) / 255;
    return a >= 0.99 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
  }
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgb(${r}, ${g}, ${b})`;
  }
  return hex;
}

// Sketch fontWeight 数字映射 (Sketch: 3=light, 4=regular, 5=medium, 6=semibold, 7=bold)
function normalizeSketchFontWeight(w) {
  const map = { 2: '200', 3: '300', 4: '400', 5: '500', 6: '600', 7: '700', 8: '800', 9: '900' };
  return map[w] || String(w);
}

// Sketch alignment 映射
function normalizeSketchAlignment(a) {
  const map = { left: 'left', right: 'right', center: 'center', justified: 'justify' };
  return map[a] || a;
}

// 构建结构化差异表
function compareStyles(domStyles, sketchData) {
  const diffs = [];

  function addComparison(property, domValue, sketchValue, category) {
    if (!domValue && !sketchValue) return;
    const match = domValue === sketchValue;
    diffs.push({ property, domValue: domValue || '-', sketchValue: sketchValue || '-', match, category });
  }

  // 尺寸对比 (Sketch frame vs DOM width/height)
  if (sketchData.frame) {
    addComparison('width', domStyles.width, sketchData.frame.width + 'px', 'layout');
    addComparison('height', domStyles.height, sketchData.frame.height + 'px', 'layout');
  }

  // 文字样式对比
  if (sketchData.textStyle) {
    const ts = sketchData.textStyle;
    if (ts.fontSize != null) {
      addComparison('font-size', domStyles.fontSize, ts.fontSize + 'px', 'typography');
    }
    if (ts.fontWeight != null) {
      addComparison('font-weight', domStyles.fontWeight, normalizeSketchFontWeight(ts.fontWeight), 'typography');
    }
    if (ts.textColor) {
      addComparison('color', domStyles.color, normalizeSketchColor(ts.textColor), 'typography');
    }
    if (ts.alignment) {
      addComparison('text-align', domStyles.textAlign, normalizeSketchAlignment(ts.alignment), 'typography');
    }
    if (ts.lineHeight != null) {
      addComparison('line-height', domStyles.lineHeight, ts.lineHeight + 'px', 'typography');
    }
    if (ts.letterSpacing != null && ts.letterSpacing !== 0) {
      addComparison('letter-spacing', domStyles.letterSpacing, ts.letterSpacing + 'px', 'typography');
    }
  }

  // 背景/填充对比
  if (sketchData.fills && sketchData.fills.length > 0) {
    const fill = sketchData.fills[0];
    if (fill.fillType === 'Color' && fill.color) {
      addComparison('background-color', domStyles.backgroundColor, normalizeSketchColor(fill.color), 'fill');
    } else if (fill.fillType === 'Gradient' && fill.gradient) {
      const stops = fill.gradient.stops;
      if (stops && stops.length >= 2) {
        const gradientCSS = `linear-gradient(${stops.map(s => normalizeSketchColor(s.color)).join(', ')})`;
        addComparison('background', domStyles.backgroundImage, gradientCSS, 'fill');
      }
    }
  }

  // 边框对比
  if (sketchData.borders && sketchData.borders.length > 0) {
    const border = sketchData.borders[0];
    const sketchBorder = `${border.thickness}px solid ${normalizeSketchColor(border.color)}`;
    const domBorder = `${domStyles.borderTopWidth} ${domStyles.borderTopStyle} ${domStyles.borderTopColor}`;
    addComparison('border', domBorder, sketchBorder, 'border');
  }

  // 圆角对比
  if (sketchData.borderRadius && sketchData.borderRadius.some(r => r > 0)) {
    const sketchRadius = sketchData.borderRadius.length === 1
      ? sketchData.borderRadius[0] + 'px'
      : sketchData.borderRadius.map(r => r + 'px').join(' ');
    addComparison('border-radius', domStyles.borderRadius, sketchRadius, 'border');
  }

  // 阴影对比
  if (sketchData.shadows && sketchData.shadows.length > 0) {
    const s = sketchData.shadows[0];
    const sketchShadow = `${normalizeSketchColor(s.color)} ${s.x}px ${s.y}px ${s.blur}px ${s.spread}px`;
    addComparison('box-shadow', domStyles.boxShadow, sketchShadow, 'shadow');
  }

  // 透明度对比
  if (sketchData.opacity != null && sketchData.opacity < 1) {
    addComparison('opacity', domStyles.opacity, String(sketchData.opacity), 'other');
  }

  return diffs;
}
```

#### 4.2 重写 handleAutoCompare 函数

替换现有的 `handleAutoCompare`（约 L133-248），新版本不再使用 html2canvas 和 pixelmatch：

```javascript
const handleAutoCompare = useCallback(async () => {
  if (!selectedElement?.computedStyle || sketchMcpStatus !== 'connected') return;

  setAutoComparing(true);
  try {
    // Step 1: 从服务端获取 Sketch 图层结构化样式
    const sketchRes = await fetch(apiUrl('/api/sketch-layer-styles')).then(r => r.json());

    if (sketchRes.error) {
      message.warning(t('visual.structCompare.sketchError'));
      return;
    }

    // Step 2: 结构化属性对比
    const diffs = compareStyles(selectedElement.computedStyle, sketchRes);
    const mismatches = diffs.filter(d => !d.match);

    // Step 3: 无差异时提示并返回
    if (mismatches.length === 0) {
      message.success(t('visual.structCompare.noMismatch'));
      return;
    }

    // Step 4: 构建结构化修复 Prompt
    const el = selectedElement;
    const parts = [];
    parts.push('请根据以下结构化对比结果，调整代码使页面元素与 Sketch 设计稿一致：');
    parts.push('');

    // 元素信息
    parts.push(`【元素信息】`);
    parts.push(`标签: <${el.tag}>${el.className ? ' class="' + el.className + '"' : ''}${el.id ? ' id="' + el.id + '"' : ''}`);
    if (el.text) parts.push(`文本: "${el.text.slice(0, 50)}"`);
    if (el.sourceInfo?.fileName) {
      parts.push(`源码: ${el.sourceInfo.fileName}:${el.sourceInfo.lineNumber}`);
    }
    parts.push('');

    // Sketch 图层信息
    parts.push(`【Sketch 图层】`);
    parts.push(`名称: ${sketchRes.name} (${sketchRes.type})`);
    if (sketchRes.frame) {
      parts.push(`尺寸: ${sketchRes.frame.width} × ${sketchRes.frame.height}`);
    }
    parts.push('');

    // 差异表
    parts.push(`【样式差异】共 ${mismatches.length} 项不匹配:`);
    parts.push('');
    parts.push('| 属性 | 当前代码值 | 设计稿值 | 类别 |');
    parts.push('|------|-----------|---------|------|');
    for (const d of mismatches) {
      parts.push(`| ${d.property} | ${d.domValue} | ${d.sketchValue} | ${d.category} |`);
    }
    parts.push('');

    // 修复指令
    parts.push('请逐个修复以上差异项，修改对应的 CSS/Less 文件。每个属性直接使用"设计稿值"列的值。');
    if (sketchRes.textStyle && sketchRes.frame) {
      parts.push(`注意: 如果设计稿基准是 750px 宽度，字体大小需要除以 2 转换到 375px 视口。`);
    }

    const prompt = parts.join('\n');

    // Step 5: 发送到终端
    window.dispatchEvent(new CustomEvent('ccv-terminal-send', { detail: { text: prompt } }));
    message.success(t('visual.structCompare.sent'));

  } catch (err) {
    console.warn('Structural compare failed:', err);
  } finally {
    setAutoComparing(false);
  }
}, [selectedElement, sketchMcpStatus]);
```

#### 4.3 更新 DiffOutlined 按钮 Tooltip 文案

将按钮 Tooltip 中的 `t('visual.autoCompare.*')` 引用改为 `t('visual.structCompare.*')`：

```jsx
{autoComparing ? (
  <LoadingOutlined className={styles.urlRefresh} spin />
) : (
  <Tooltip title={
    !selectedElement ? t('visual.structCompare.needSelection') :
    sketchMcpStatus !== 'connected' ? t('visual.structCompare.needSketch') :
    t('visual.structCompare')
  }>
    <DiffOutlined
      className={`${styles.urlRefresh} ${(!selectedElement || sketchMcpStatus !== 'connected') ? styles.urlBtnDisabled : ''}`}
      onClick={(!selectedElement || sketchMcpStatus !== 'connected') ? undefined : handleAutoCompare}
    />
  </Tooltip>
)}
```

### Task 5: 清理 PagePreview.jsx 中不再需要的截图对比代码

移除 handleAutoCompare 中已不需要的依赖：
- 移除 `html2canvas` 和 `pixelmatch` 的 dynamic import（仅在 handleAutoCompare 中使用的部分）
- 移除 `handleAutoCompare` 内的 `uploadImage` 辅助函数
- 保留 `handleScreenshot` 和 `handleCompareSketch`（ScreenshotCompare 弹窗仍使用）

注意：`html2canvas` 的 import 在 `handleScreenshot` 和 `handleCompareSketch` 中仍在使用，不要移除这些函数中的引用。

### Task 6: 构建验证

运行 `npm run build` 确认无编译错误。

## 验证标准

### 功能验证
- [ ] 未选中元素时，DiffOutlined 禁用，Tooltip 显示"请先选中一个页面元素"
- [ ] Sketch MCP 未连接时，按钮禁用，Tooltip 显示"Sketch MCP 未连接"
- [ ] 选中元素 + Sketch 已连接时，点击触发结构化对比
- [ ] 对比过程中显示 LoadingOutlined

### 服务端 API 验证
- [ ] GET `/api/sketch-layer-styles` 返回图层结构化 JSON
- [ ] Text 图层返回 textStyle 字段（fontSize, fontWeight, textColor, alignment 等）
- [ ] Shape 图层返回 fills, borders, shadows 字段
- [ ] Sketch 无选中图层时返回 `{ error: 'no_selection' }`
- [ ] MCP 不可用时返回 `{ error: 'mcp_unavailable' }`

### 对比逻辑验证
- [ ] DOM computedStyle 与 Sketch JSON 正确对比
- [ ] 颜色格式归一化正确（#rrggbbaa → rgb(r,g,b)）
- [ ] fontWeight 映射正确（Sketch 6 → CSS 600）
- [ ] 所有属性匹配时显示"无需调整"，不发送命令
- [ ] 存在差异时构建 Markdown 差异表格

### 终端命令验证
- [ ] Prompt 包含完整的元素信息、Sketch 图层信息、差异表
- [ ] 通过 ccv-terminal-send 事件成功发送
- [ ] 终端正确接收多行文本（bracketed paste）

### 回归验证
- [ ] CameraOutlined（截图）功能正常
- [ ] ScreenshotCompare 弹窗正常
- [ ] 元素选中/取消选中功能正常
- [ ] `npm run build` 成功
