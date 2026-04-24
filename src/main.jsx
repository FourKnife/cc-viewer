// import './tokenInterceptor'; // 文件不存在，暂时注释
import React from 'react';
import ReactDOM from 'react-dom/client';
import './global.css';
import { isMobile } from './env';
import { reloadOnStaleChunk } from './utils/lazyWithReload';

const root = ReactDOM.createRoot(document.getElementById('root'));

// 入口 chunk 加载失败：部署后陈旧 entry（index-*.js 缓存住了，App-*.js 哈希已变）触发整页 reload，
// 5 分钟时间窗内不重复。这里没法 toast、没法 i18n —— antd 和 i18n 模块都在没加载下来的 App chunk 里；
// reload 失败次数超限时退回英文静态文案让用户手动刷。
const onLoadError = (err) => {
  console.error('Failed to load app module:', err);
  if (reloadOnStaleChunk(isMobile ? 'Mobile' : 'App')) return;
  document.getElementById('root').textContent = 'Loading failed. Please refresh the page.';
};

if (isMobile) {
  import('./Mobile').then(({ default: Mobile }) => {
    root.render(<Mobile />);
  }).catch(onLoadError);
} else {
  import('./App').then(({ default: App }) => {
    root.render(<App />);
  }).catch(onLoadError);
}
