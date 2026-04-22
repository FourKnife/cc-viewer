import React from 'react';
import { Layout } from 'antd';
import ProjectLauncher from './ProjectLauncher';
import PagePreview from './PagePreview';
import styles from './styles.module.css';

export default function VisualEditor({ projectStatus, projectOutput, onStartProject, onStopProject }) {
  return (
    <Layout className={styles.container}>
      <Layout.Sider width={320} className={styles.sider}>
        <ProjectLauncher
          status={projectStatus}
          output={projectOutput}
          onStart={onStartProject}
          onStop={onStopProject}
        />
      </Layout.Sider>
      <Layout.Content className={styles.content}>
        <PagePreview port={projectStatus?.port} />
      </Layout.Content>
    </Layout>
  );
}
