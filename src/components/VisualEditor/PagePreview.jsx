import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Input, Tooltip, message } from 'antd';
import { ReloadOutlined, LinkOutlined, ArrowRightOutlined, AimOutlined, CameraOutlined, LoadingOutlined } from '@ant-design/icons';
import { t } from '../../i18n';
import { apiUrl } from '../../utils/apiUrl';
import ScreenshotCompare from './ScreenshotCompare';
import styles from './styles.module.css';

// Sketch 品牌图标（替代 DiffOutlined）
function SketchSvgIcon({ className, onClick }) {
  return (
    <span role="img" className={className} onClick={onClick} style={{ lineHeight: 0, display: 'inline-flex', alignItems: 'center' }}>
      <svg viewBox="0 0 1024 1024" width="1em" height="1em" fill="currentColor">
        <path d="M55 324.4L18 374.2h181l13.8-261.4-157.8 211.6zM792.6 91.4L535.4 64l271.4 294.4-14.2-267zM224.4 436.6l-22.4-44H19.8L469.6 916z m4-62.4h568l-163-177L512.6 66z m594.6 18.2L555.2 916l449.6-523.4h-181.8zM830.8 138L812 112.8l1.8 34.6 12.2 226.8h180.6zM227 187l-9.2 171.2L489.4 64 232.2 91.4z m575.4 205.4h-580l84.8 165.8L512.6 960l289.8-567.6z" />
      </svg>
    </span>
  );
}

// 将 http://localhost:PORT/path 转为代理 URL /api/proxy/PORT/path
// 代理会注入 inspector-inject.js 脚本并移除 CSP 限制
function toProxyUrl(url) {
  try {
    const u = new URL(url);
    const targetPort = u.port || (u.protocol === 'https:' ? '443' : '80');
    const path = u.pathname + u.search + u.hash;
    return apiUrl(`/api/proxy/${targetPort}${path}`);
  } catch {
    return url;
  }
}

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

export default function PagePreview({ port, previewUrl: externalUrl, onPreviewUrlChange, onElementHover, onElementSelect, onElementDeselect, selectedElement, sketchMcpStatus, onElementScreenshot }) {
  const [urlInput, setUrlInput] = useState(externalUrl || '');
  const [iframeSrc, setIframeSrc] = useState('');
  const [iframeKey, setIframeKey] = useState(0);
  const [inspecting, setInspecting] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [screenshotData, setScreenshotData] = useState(null);
  const [autoComparing, setAutoComparing] = useState(false);
  const navigatedRef = useRef(false);
  const iframeRef = useRef(null);
  const loadTimerRef = useRef(null);

  const handleNavigate = useCallback((value) => {
    const input = (value || '').trim();
    if (!input) return;

    // 确保是完整 URL
    let displayUrl = input;
    if (!/^https?:\/\//i.test(input)) {
      const p = port || '3000';
      const path = input.startsWith('/') ? input : '/' + input;
      displayUrl = `http://localhost:${p}${path}`;
    }

    setUrlInput(displayUrl);
    setIframeSrc(toProxyUrl(displayUrl));
    setIframeKey(k => k + 1);
    setLoadError('');
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    loadTimerRef.current = setTimeout(() => setLoadError(t('visual.loadTimeout')), 15000);
    onPreviewUrlChange?.(displayUrl);   // persist in App state
  }, [port, onPreviewUrlChange]);

  // 端口变化时设置默认 URL 并自动导航
  useEffect(() => {
    if (port && !navigatedRef.current) {
      const defaultUrl = `http://localhost:${port}/`;
      setUrlInput(defaultUrl);
      handleNavigate(defaultUrl);
      navigatedRef.current = true;
    }
  }, [port, handleNavigate]);

  // 同步外部 previewUrl（viewMode 切换后 App state 下发）
  useEffect(() => {
    if (externalUrl && externalUrl !== urlInput) {
      setUrlInput(externalUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalUrl]);

  // 组件重新挂载时若有已持久化的 URL，自动重新加载
  useEffect(() => {
    if (externalUrl && !iframeSrc) {
      handleNavigate(externalUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount only

  // 向 iframe 发送 inspector 开关指令
  const sendInspectorCmd = useCallback((enabled) => {
    const iframe = iframeRef.current;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(
        { source: 'cc-visual-parent', type: enabled ? 'enable' : 'disable' },
        '*'
      );
    }
  }, []);

  const toggleInspecting = useCallback(() => {
    setInspecting(prev => {
      const next = !prev;
      sendInspectorCmd(next);
      if (!next) onElementDeselect?.();
      return next;
    });
  }, [sendInspectorCmd, onElementDeselect]);

  // 截取 iframe 内选中元素区域
  const captureElementScreenshot = useCallback(async (elementData) => {
    const frame = iframeRef.current;
    if (!frame?.contentDocument?.documentElement || !elementData?.rect) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { x, y, width, height } = elementData.rect;
      const canvas = await html2canvas(frame.contentDocument.documentElement, {
        useCORS: true, scale: 2, allowTaint: true,
        width: frame.clientWidth, height: frame.clientHeight,
        x: 0, y: 0,
      });
      // 裁剪出元素区域
      const cropped = document.createElement('canvas');
      const dpr = 2;
      cropped.width = width * dpr;
      cropped.height = height * dpr;
      const ctx = cropped.getContext('2d');
      ctx.drawImage(canvas, x * dpr, y * dpr, width * dpr, height * dpr, 0, 0, width * dpr, height * dpr);
      cropped.toBlob(blob => {
        if (blob) onElementScreenshot?.(blob, elementData);
      }, 'image/png');
    } catch (err) {
      console.warn('Element screenshot failed:', err);
    }
  }, [onElementScreenshot]);

  // 监听 inspector postMessage
  useEffect(() => {
    function handleMessage(e) {
      if (!e.data || e.data.source !== 'cc-visual-inspector') return;
      switch (e.data.type) {
        case 'hover': onElementHover?.(e.data.data); break;
        case 'select':
          onElementSelect?.(e.data.data);
          captureElementScreenshot(e.data.data);
          break;
        case 'deselect': onElementDeselect?.(); break;
        case 'ready': sendInspectorCmd(inspecting); break;
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onElementHover, onElementSelect, onElementDeselect, sendInspectorCmd, inspecting, captureElementScreenshot]);

  const handleRefresh = useCallback(() => {
    setIframeKey(k => k + 1);
  }, []);

  const handleScreenshot = useCallback(async () => {
    const frame = iframeRef.current;
    if (!frame?.contentDocument?.documentElement) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(frame.contentDocument.documentElement, { useCORS: true, scale: 2, allowTaint: true, width: frame.clientWidth, height: frame.clientHeight });
      setScreenshotData({ imageA: canvas.toDataURL('image/png') });
    } catch (err) {
      console.warn('Screenshot failed:', err);
    }
  }, []);

  const handleCompareSketch = useCallback(async () => {
    const frame = iframeRef.current;
    if (!frame?.contentDocument?.documentElement) return;
    try {
      const [html2canvas, sketchRes] = await Promise.all([
        import('html2canvas').then(m => m.default),
        fetch(apiUrl('/api/sketch-screenshot')).then(r => r.json()),
      ]);
      const canvas = await html2canvas(frame.contentDocument.documentElement, { useCORS: true, scale: 2, allowTaint: true, width: frame.clientWidth, height: frame.clientHeight });
      const imageA = canvas.toDataURL('image/png');
      const imageB = sketchRes.error ? null : sketchRes.image;
      const sketchError = sketchRes.error || null;
      setScreenshotData({ imageA, imageB, sketchError });
    } catch (err) {
      console.warn('Compare failed:', err);
    }
  }, []);

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

  return (
    <div className={styles.previewContainer}>
      <div className={styles.urlBar}>
        <Tooltip title={inspecting ? t('visual.inspectorOn') : t('visual.inspectorOff')}>
          <AimOutlined
            className={`${styles.urlInspect} ${inspecting ? styles.urlInspectActive : ''}`}
            onClick={toggleInspecting}
          />
        </Tooltip>
        <LinkOutlined className={styles.urlIcon} />
        <Input
          className={styles.urlInput}
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          onPressEnter={e => handleNavigate(e.target.value)}
          placeholder="http://localhost:3001/page.html"
          size="small"
        />
        <ArrowRightOutlined className={styles.urlGo} onClick={() => handleNavigate(urlInput)} />
        <ReloadOutlined className={styles.urlRefresh} onClick={handleRefresh} />
        <Tooltip title={t('visual.screenshot')}>
          <CameraOutlined className={styles.urlRefresh} onClick={handleScreenshot} />
        </Tooltip>
        {autoComparing ? (
          <LoadingOutlined className={styles.urlRefresh} spin />
        ) : (
          <Tooltip title={
            !selectedElement ? t('visual.structCompare.needSelection') :
            sketchMcpStatus !== 'connected' ? t('visual.structCompare.needSketch') :
            t('visual.structCompare')
          }>
            <SketchSvgIcon
              className={`${styles.urlRefresh} ${(!selectedElement || sketchMcpStatus !== 'connected') ? styles.urlBtnDisabled : ''}`}
              onClick={(!selectedElement || sketchMcpStatus !== 'connected') ? undefined : handleAutoCompare}
            />
          </Tooltip>
        )}
      </div>
      {loadError && <div className={styles.iframeError}>{loadError}</div>}
      <div className={styles.iframeArea}>
        <div className={styles.mobileFrame}>
          {iframeSrc && (
            <iframe
              ref={iframeRef}
              key={iframeKey}
              src={iframeSrc}
              className={styles.iframe}
              title="Project Preview"
              onLoad={() => { if (loadTimerRef.current) { clearTimeout(loadTimerRef.current); loadTimerRef.current = null; } setLoadError(''); }}
            />
          )}
        </div>
      </div>
      {screenshotData && (
        <ScreenshotCompare
          imageA={screenshotData.imageA}
          imageB={screenshotData.imageB || null}
          sketchError={screenshotData.sketchError || null}
          onClose={() => setScreenshotData(null)}
        />
      )}
    </div>
  );
}
