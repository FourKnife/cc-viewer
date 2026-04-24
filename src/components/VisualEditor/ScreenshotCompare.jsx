import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CloseOutlined } from '@ant-design/icons';
import { t } from '../../i18n';
import { apiUrl } from '../../utils/apiUrl';
import MarkdownBlock from '../MarkdownBlock';
import styles from './ScreenshotCompare.module.css';

export default function ScreenshotCompare({ imageA, imageB, sketchError, onClose }) {
  const [mode, setMode] = useState('slide');
  const [sliderPos, setSliderPos] = useState(50);
  const [diffImage, setDiffImage] = useState(null);
  const [diffPercent, setDiffPercent] = useState(null);
  const dragging = useRef(false);
  const containerRef = useRef(null);

  // AI 分析状态
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const aiRequestIdRef = useRef(null);

  const computeDiff = useCallback(async (imgA, imgB) => {
    if (!imgA || !imgB) return;
    try {
      const [a, b] = await Promise.all([loadImage(imgA), loadImage(imgB)]);
      const w = Math.max(a.width, b.width);
      const h = Math.max(a.height, b.height);

      const canvasA = drawToCanvas(a, w, h);
      const canvasB = drawToCanvas(b, w, h);
      const dataA = canvasA.getContext('2d').getImageData(0, 0, w, h);
      const dataB = canvasB.getContext('2d').getImageData(0, 0, w, h);

      const diffCanvas = document.createElement('canvas');
      diffCanvas.width = w;
      diffCanvas.height = h;
      const diffCtx = diffCanvas.getContext('2d');
      const diffData = diffCtx.createImageData(w, h);

      const pixelmatch = (await import('pixelmatch')).default;
      const numDiff = pixelmatch(dataA.data, dataB.data, diffData.data, w, h, { threshold: 0.1 });
      diffCtx.putImageData(diffData, 0, 0);

      setDiffImage(diffCanvas.toDataURL());
      setDiffPercent(((numDiff / (w * h)) * 100).toFixed(1));
    } catch (err) {
      console.warn('pixelmatch diff failed:', err);
    }
  }, []);

  useEffect(() => {
    if (imageA && imageB) computeDiff(imageA, imageB);
  }, [imageA, imageB, computeDiff]);

  const handleMouseMove = useCallback((e) => {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  }, []);

  const handleMouseUp = useCallback(() => { dragging.current = false; }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // 监听 SSE 广播的 AI 分析结果
  useEffect(() => {
    function handleAnalysis(e) {
      const { requestId, text, error, done } = e.detail;
      if (requestId !== aiRequestIdRef.current) return;
      if (error) { setAiError(error); setAiLoading(false); return; }
      if (text) setAiText(text);
      if (done) setAiLoading(false);
    }
    window.addEventListener('compare-analysis', handleAnalysis);
    return () => window.removeEventListener('compare-analysis', handleAnalysis);
  }, []);

  // 触发 AI 分析
  const handleStartAiAnalysis = useCallback(async () => {
    if (!imageA || !imageB) return;
    setAiText('');
    setAiError(null);
    setAiLoading(true);
    try {
      const res = await fetch(apiUrl('/api/compare-analyze'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageA, imageB }),
      });
      const data = await res.json();
      if (data.error) {
        setAiError(data.error === 'no_api_key' ? t('visual.compare.aiUnavailable') : data.error);
        setAiLoading(false);
      } else {
        aiRequestIdRef.current = data.requestId;
      }
    } catch (err) {
      setAiError(err.message);
      setAiLoading(false);
    }
  }, [imageA, imageB]);

  const hasBoth = imageA && imageB;

  return (
    <div className={styles.overlay}>
      <div className={styles.header}>
        <div className={styles.tabs}>
          {hasBoth && <>
            <button className={`${styles.tab} ${mode === 'slide' ? styles.tabActive : ''}`} onClick={() => setMode('slide')}>{t('visual.compare.slide')}</button>
            <button className={`${styles.tab} ${mode === 'side' ? styles.tabActive : ''}`} onClick={() => setMode('side')}>{t('visual.compare.side')}</button>
            <button className={`${styles.tab} ${mode === 'diff' ? styles.tabActive : ''}`} onClick={() => setMode('diff')}>{t('visual.compare.diff')}</button>
            <button className={`${styles.tab} ${mode === 'ai' ? styles.tabActive : ''}`} onClick={() => { setMode('ai'); if (!aiText && !aiLoading && !aiError) handleStartAiAnalysis(); }}>{t('visual.compare.aiAnalysis')}</button>
          </>}
          {!hasBoth && <span className={styles.singleLabel}>{t('visual.compare.single')}</span>}
        </div>
        {diffPercent != null && mode !== 'ai' && <span className={styles.diffBadge}>{diffPercent}% {t('visual.compare.different')}</span>}
        <CloseOutlined className={styles.closeBtn} onClick={onClose} />
      </div>

      <div className={styles.body} ref={containerRef}>
        {mode === 'slide' && hasBoth && (
          <>
            <img src={imageA} className={styles.imgFull} alt="A" />
            <div className={styles.slideClip} style={{ width: `${sliderPos}%` }}>
              <img src={imageB} className={styles.imgFull} alt="B" />
            </div>
            <div className={styles.sliderLine} style={{ left: `${sliderPos}%` }} onMouseDown={() => { dragging.current = true; }}>
              <div className={styles.sliderHandle} />
            </div>
          </>
        )}
        {mode === 'side' && hasBoth && (
          <div className={styles.sideView}>
            <div className={styles.sidePanel}><img src={imageA} className={styles.imgContain} alt="A" /><span className={styles.sideLabel}>iframe</span></div>
            <div className={styles.sidePanel}><img src={imageB} className={styles.imgContain} alt="B" /><span className={styles.sideLabel}>Sketch</span></div>
          </div>
        )}
        {mode === 'diff' && hasBoth && diffImage && (
          <img src={diffImage} className={styles.imgFull} alt="diff" />
        )}
        {mode === 'ai' && hasBoth && (
          <div className={styles.aiPanel}>
            {aiLoading && !aiText && (
              <div className={styles.aiLoading}>{t('visual.compare.aiAnalyzing')}</div>
            )}
            {aiText && (
              <div className={styles.aiContent}>
                <MarkdownBlock text={aiText} trailingCursor={aiLoading} />
              </div>
            )}
            {aiError && <div className={styles.errorBanner}>{aiError}</div>}
            {!aiLoading && (aiText || aiError) && (
              <button className={styles.retryBtn} onClick={handleStartAiAnalysis}>
                {t('visual.compare.retryAiAnalysis')}
              </button>
            )}
          </div>
        )}
        {!hasBoth && imageA && (
          <div className={styles.singleContainer}>
            <img src={imageA} className={styles.imgContain} alt="screenshot" />
            {sketchError && (
              <div className={styles.errorBanner}>
                {t(`visual.compare.error.${sketchError}`) || sketchError}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawToCanvas(img, w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.getContext('2d').drawImage(img, 0, 0);
  return c;
}
