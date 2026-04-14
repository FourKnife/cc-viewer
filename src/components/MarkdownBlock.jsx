import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Tooltip, message } from 'antd';
import { CopyOutlined, DownloadOutlined, CameraOutlined } from '@ant-design/icons';
import { renderMarkdown } from '../utils/markdown';
import { isMobile, isPad } from '../env';
import { t } from '../i18n';
import styles from './MarkdownBlock.module.css';

function MarkdownBlock({ text, className, style }) {
  const [hovered, setHovered] = useState(false);
  const timerRef = useRef(null);
  const wrapRef = useRef(null);
  const savingRef = useRef(false);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const html = useMemo(() => text ? renderMarkdown(text) : '', [text]);

  if (!text) return null;

  const handleCopy = useCallback((e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text)
      .then(() => message.success(t('ui.copySuccess')))
      .catch(() => {});
  }, [text]);

  const handleSaveAs = useCallback(async (e) => {
    e.stopPropagation();
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const defaultName = `content-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.md`;
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: defaultName,
          types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [text]);

  const handleSaveAsImage = useCallback((e) => {
    e.stopPropagation();
    if (savingRef.current) return;
    const el = wrapRef.current;
    if (!el) return;
    savingRef.current = true;
    // 向上查找 bubble 容器，包含 padding/border-radius 出血区域
    const target = el.closest('[class*="bubble"]') || el;
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    import('html2canvas').then(({ default: html2canvas }) => {
      html2canvas(target, {
        backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
        scale: 2,
        useCORS: true,
      }).then(canvas => {
        canvas.toBlob(blob => {
          if (!blob) { savingRef.current = false; return; }
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `content-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          canvas.width = 0;
          canvas.height = 0;
          savingRef.current = false;
        }, 'image/png');
      }).catch((err) => { console.warn('html2canvas render failed:', err); savingRef.current = false; });
    }).catch((err) => { console.warn('html2canvas load failed:', err); savingRef.current = false; });
  }, []);

  const handleMouseEnter = useCallback(() => {
    clearTimeout(timerRef.current);
    setHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    timerRef.current = setTimeout(() => setHovered(false), 150);
  }, []);

  return (
    <div
      ref={wrapRef}
      className={styles.mdBlockWrapper}
      onMouseEnter={(isMobile && !isPad) ? undefined : handleMouseEnter}
      onMouseLeave={(isMobile && !isPad) ? undefined : handleMouseLeave}
    >
      <div
        className={`chat-md ${className || ''}`}
        style={style}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {(!isMobile || isPad) && hovered && (
        <div className={styles.actionBar} data-html2canvas-ignore>
          <Tooltip title={t('ui.copy')} mouseEnterDelay={0.3}>
            <span className={styles.actionBtn} onClick={handleCopy}>
              <CopyOutlined />
            </span>
          </Tooltip>
          <Tooltip title={t('ui.saveAs')} mouseEnterDelay={0.3}>
            <span className={styles.actionBtn} onClick={handleSaveAs}>
              <DownloadOutlined />
            </span>
          </Tooltip>
          <Tooltip title={t('ui.saveAsImage')} mouseEnterDelay={0.3}>
            <span className={styles.actionBtn} onClick={handleSaveAsImage}>
              <CameraOutlined />
            </span>
          </Tooltip>
        </div>
      )}
    </div>
  );
}

export default React.memo(MarkdownBlock);
