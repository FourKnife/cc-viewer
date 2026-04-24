import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Space, Typography, Alert } from 'antd';
import { PlayCircleOutlined, StopOutlined, FolderOpenOutlined, UpOutlined, DownOutlined } from '@ant-design/icons';
import { t } from '../../i18n';
import styles from './styles.module.css';

export default function ProjectLauncher({ status, output, onStart, onStop, defaultPath, collapsed, onToggleCollapse }) {
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

  // 折叠态：仅显示摘要行
  if (collapsed) {
    return (
      <div className={styles.launcher}>
        <div className={styles.launcherSummary}>
          <span className={`${styles.launcherDot} ${isRunning ? styles.launcherDotRunning : ''}`} />
          <span className={styles.launcherSummaryPath}>
            {projectPath || '/—'}
          </span>
          {isRunning && status?.port && (
            <span className={styles.launcherSummaryPort}>:{status.port}</span>
          )}
          <span className={styles.launcherSummaryStatus}>
            {isRunning ? t('visual.launcher.running') : t('visual.launcher.stopped')}
          </span>
          {isRunning && (
            <Button
              size="small"
              danger
              icon={<StopOutlined />}
              onClick={onStop}
              className={styles.launcherSummaryBtn}
            />
          )}
          <span
            className={styles.launcherToggle}
            onClick={onToggleCollapse}
            title={t('visual.launcher.expand')}
          >
            <DownOutlined />
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.launcher}>
      <div className={styles.launcherHeader}>
        <Typography.Title level={5} style={{ margin: 0 }}>{t('visual.projectLauncher')}</Typography.Title>
        <span
          className={styles.launcherToggle}
          onClick={onToggleCollapse}
          title={t('visual.launcher.collapse')}
        >
          <UpOutlined />
        </span>
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

        {showLog && (
          <div className={styles.logPanel}>
            <Typography.Text type="secondary" className={styles.logTitle}>
              {t('visual.log')}
            </Typography.Text>
            <pre ref={logRef} className={styles.logContent}>
              {output}
            </pre>
          </div>
        )}
      </Space>
    </div>
  );
}
