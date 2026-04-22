import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Space, Typography, Alert } from 'antd';
import { PlayCircleOutlined, StopOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { t } from '../../i18n';
import styles from './styles.module.css';

export default function ProjectLauncher({ status, output, onStart, onStop }) {
  const [projectPath, setProjectPath] = useState('');
  const [command, setCommand] = useState('npm run dev');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const logRef = useRef(null);

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

  return (
    <div className={styles.launcher}>
      <Typography.Title level={5}>{t('visual.projectLauncher')}</Typography.Title>

      <Space direction="vertical" style={{ width: '100%' }}>
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
