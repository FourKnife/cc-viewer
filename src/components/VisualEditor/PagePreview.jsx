import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Input, Empty, Tooltip } from 'antd';
import { ReloadOutlined, LinkOutlined, ArrowRightOutlined, AimOutlined } from '@ant-design/icons';
import { t } from '../../i18n';
import { apiUrl } from '../../utils/apiUrl';
import styles from './styles.module.css';

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

export default function PagePreview({ port, onElementHover, onElementSelect, onElementDeselect }) {
  const [urlInput, setUrlInput] = useState('');
  const [iframeSrc, setIframeSrc] = useState('');
  const [iframeKey, setIframeKey] = useState(0);
  const [inspecting, setInspecting] = useState(true);
  const [loadError, setLoadError] = useState('');
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
  }, [port]);

  // 端口变化时设置默认 URL 并自动导航
  useEffect(() => {
    if (port && !navigatedRef.current) {
      const defaultUrl = `http://localhost:${port}/`;
      setUrlInput(defaultUrl);
      handleNavigate(defaultUrl);
      navigatedRef.current = true;
    }
  }, [port, handleNavigate]);

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

  // 监听 inspector postMessage
  useEffect(() => {
    function handleMessage(e) {
      if (!e.data || e.data.source !== 'cc-visual-inspector') return;
      switch (e.data.type) {
        case 'hover': onElementHover?.(e.data.data); break;
        case 'select': onElementSelect?.(e.data.data); break;
        case 'deselect': onElementDeselect?.(); break;
        case 'ready': sendInspectorCmd(inspecting); break;
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onElementHover, onElementSelect, onElementDeselect, sendInspectorCmd, inspecting]);

  const handleRefresh = useCallback(() => {
    setIframeKey(k => k + 1);
  }, []);

  // 无端口且无已加载页面时显示空状态
  if (!port && !iframeSrc) {
    return (
      <div className={styles.emptyPreview}>
        <Empty description={t('visual.noProject')} />
      </div>
    );
  }

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
    </div>
  );
}
