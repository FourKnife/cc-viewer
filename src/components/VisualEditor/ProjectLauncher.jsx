import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Space, Typography, Alert, Tooltip } from 'antd';
import { PlayCircleOutlined, StopOutlined, FolderOpenOutlined, QrcodeOutlined } from '@ant-design/icons';
import { t } from '../../i18n';
import { stripAnsi } from '../../utils/stripAnsi';
import styles from './styles.module.css';

export default function ProjectLauncher({
  status,
  output,
  onStart,
  onStop,
  defaultPath,
  availablePages = [],
  onPreviewUrlChange,
  onSelectMenu,
  onQrClick,
}) {
  const [projectPath, setProjectPath] = useState('');
  const [command, setCommand] = useState('npm run mock');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const logRef = useRef(null);

  // defaultPath 变化时自动填充项目路径
  useEffect(() => {
    if (defaultPath && !projectPath) {
      setProjectPath(defaultPath);
    }
  }, [defaultPath]);

  // 日志自动滚到底部
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [output]);

  const handleStart = async () => {
    if (!projectPath) return;
    setLoading(true);
    setError(null);
    try {
      await onStart(projectPath, command);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isRunning = status?.status === 'running';
  const isStarting = status?.status === 'starting';
  const showLog = output && (isStarting || isRunning || error);

  const handlePageClick = (page) => {
    onPreviewUrlChange?.(page.url);
    onSelectMenu?.('ui-edit');
  };

  return (
    <div className={styles.launcher}>
      <div className={styles.launcherHeader}>
        <Typography.Title level={5} style={{ margin: 0 }}>{t('visual.projectLauncher')}</Typography.Title>
      </div>

      <Space direction="vertical" style={{ width: '100%', marginTop: 8 }}>
        <div>
          <Typography.Text type="secondary">{t('visual.projectPath')}</Typography.Text>
          <Input
            placeholder="/path/to/react-project"
            value={projectPath}
            onChange={e => setProjectPath(e.target.value)}
            disabled={isRunning || isStarting}
            prefix={<FolderOpenOutlined />}
          />
        </div>

        <div>
          <Typography.Text type="secondary">{t('visual.startCommand')}</Typography.Text>
          <Input
            placeholder="npm run dev"
            value={command}
            onChange={e => setCommand(e.target.value)}
            disabled={isRunning || isStarting}
          />
        </div>

        {error && <Alert type="error" message={error} showIcon />}

        {isRunning && (
          <Alert
            type="success"
            message={t('visual.running', { port: status.port })}
            showIcon
          />
        )}

        <Space>
          {!isRunning ? (
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleStart}
              loading={loading || isStarting}
              disabled={!projectPath}
            >
              {isStarting ? t('visual.starting') : t('visual.start')}
            </Button>
          ) : (
            <Button
              danger
              icon={<StopOutlined />}
              onClick={onStop}
            >
              {t('visual.stop')}
            </Button>
          )}
        </Space>

        {/* Available Pages 快捷导航 */}
        {availablePages.length > 0 && (
          <div>
            <Typography.Text type="secondary">{t('visual.launcher.pages')}</Typography.Text>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {availablePages.map((page) => (
                <span key={page.url} style={{ display: 'inline-flex', gap: 2 }}>
                  <Button
                    size="small"
                    type="default"
                    onClick={() => handlePageClick(page)}
                  >
                    {page.name}
                  </Button>
                  <Tooltip title={t('visual.launcher.qrTooltip')}>
                    <Button
                      size="small"
                      type="text"
                      icon={<QrcodeOutlined />}
                      disabled={!isRunning}
                      onClick={() => onQrClick?.(page.name)}
                    />
                  </Tooltip>
                </span>
              ))}
            </div>
          </div>
        )}

        {showLog && (
          <div className={styles.logPanel}>
            <Typography.Text type="secondary" className={styles.logTitle}>
              {t('visual.log')}
            </Typography.Text>
            <pre ref={logRef} className={styles.logContent}>
              {stripAnsi(output)}
            </pre>
          </div>
        )}
      </Space>
    </div>
  );
}
