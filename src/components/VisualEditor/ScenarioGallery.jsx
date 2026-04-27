import React, { useState } from 'react';
import { Button, Typography } from 'antd';
import { DownloadOutlined, CloseOutlined } from '@ant-design/icons';
import { t } from '../../i18n';
import styles from './styles.module.css';

function LightboxModal({ item, onClose }) {
  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = item.dataUrl;
    a.download = `${item.name}.png`;
    a.click();
  };
  return (
    <div className={styles.galleryModal} onClick={onClose}>
      <span className={styles.galleryModalClose} onClick={onClose}>&times;</span>
      <img
        className={styles.galleryModalImg}
        src={item.dataUrl}
        alt={item.name}
        onClick={e => e.stopPropagation()}
      />
      <div className={styles.galleryModalActions} onClick={e => e.stopPropagation()}>
        <Button size="small" icon={<DownloadOutlined />} onClick={handleDownload}>
          {t('visual.scenario.gallery.download')}
        </Button>
        <Button size="small" icon={<CloseOutlined />} onClick={onClose}>
          {t('visual.scenario.gallery.close')}
        </Button>
      </div>
    </div>
  );
}

export default function ScenarioGallery({ screenshots, batchProgress, onBack }) {
  const [lightbox, setLightbox] = useState(null);

  return (
    <div className={styles.galleryContainer}>
      <div className={styles.galleryHeader}>
        <Typography.Text strong>{t('visual.scenario.gallery.title')}</Typography.Text>
        <Button size="small" onClick={onBack}>{t('visual.scenario.gallery.back')}</Button>
      </div>

      {batchProgress && batchProgress.total > 0 && (
        <div className={styles.galleryProgress}>
          {t('visual.scenario.gallery.progress')} {batchProgress.current}/{batchProgress.total}
        </div>
      )}

      {screenshots.length === 0 ? (
        <div className={styles.galleryEmpty}>
          <Typography.Text type="secondary">{t('visual.scenario.gallery.empty')}</Typography.Text>
        </div>
      ) : (
        <div className={styles.galleryGrid}>
          {screenshots.map(item => (
            <div key={item.scenarioId} className={styles.galleryCard} onClick={() => setLightbox(item)}>
              <img className={styles.galleryThumb} src={item.dataUrl} alt={item.name} />
              <div className={styles.galleryCardName}>{item.name}</div>
            </div>
          ))}
        </div>
      )}

      {lightbox && <LightboxModal item={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}
