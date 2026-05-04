import React, { createContext } from 'react';
import { apiUrl } from '../utils/apiUrl';
import { setLang } from '../i18n';
import { setClaudeConfigDir } from '../utils/tClaude';

// 集中管理 /api/claude-settings 与 /api/preferences,消除多组件重复 fetch。
// AppBase 通过 contextType 直接消费;ChatView/TerminalPanel/AppHeader 等子组件
// 走 props drill 接收 settings 与 updater 回调,避免与 TerminalWsContext 的 contextType 冲突。
//
// 数据更新走纯 React 渠道:updatePreferences 内 setState → preferences 引用变化 →
// ChatView/TerminalPanel.componentDidUpdate 接力调用 _loadPresets 等。
// 不再用 'ccv-presets-changed' window event,避免 props 驱动 + 事件驱动双重触发。

export const SettingsContext = createContext({
  claudeSettings: null,
  preferences: null,
  _prefsReady: Promise.resolve({}),
  _claudeSettingsReady: Promise.resolve({}),
  updatePreferences: () => Promise.resolve(null),
  updateClaudeSettings: () => Promise.resolve(null),
});

export class SettingsProvider extends React.Component {
  constructor(props) {
    super(props);
    this.state = { claudeSettings: null, preferences: null };
    this._unmounted = false;

    // constructor 里立即 fire,确保 AppBase.componentDidMount 时 Promise 已可用。
    // 全局副作用(setLang / setClaudeConfigDir)在 then 内执行,与原 AppBase 行为等价。
    this._prefsReady = fetch(apiUrl('/api/preferences'))
      .then(res => res.json())
      .then(data => {
        if (typeof data.claudeConfigDir === 'string') setClaudeConfigDir(data.claudeConfigDir);
        if (data.lang) setLang(data.lang);
        if (!this._unmounted) this.setState({ preferences: data });
        return data;
      })
      .catch(() => ({}));

    this._claudeSettingsReady = fetch(apiUrl('/api/claude-settings'))
      .then(res => res.ok ? res.json() : {})
      .then(data => {
        if (!this._unmounted) this.setState({ claudeSettings: data });
        return data;
      })
      .catch(() => ({}));
  }

  componentWillUnmount() {
    this._unmounted = true;
  }

  updatePreferences = (patch) => {
    // 乐观写本地缓存(与原 fire-and-forget 等价,不做回滚)。
    // setState 触发 Provider re-render → 子树拿到新 preferences 引用 → componentDidUpdate 接力 reload。
    if (!this._unmounted) {
      this.setState(prev => ({ preferences: { ...(prev.preferences || {}), ...patch } }));
    }
    return fetch(apiUrl('/api/preferences'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).then(r => r.ok ? r.json() : null).catch(() => null);
  };

  updateClaudeSettings = (patch) => {
    if (!this._unmounted) {
      this.setState(prev => ({ claudeSettings: { ...(prev.claudeSettings || {}), ...patch } }));
    }
    return fetch(apiUrl('/api/claude-settings'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).then(r => r.ok ? r.json() : null).catch(() => null);
  };

  render() {
    const value = {
      claudeSettings: this.state.claudeSettings,
      preferences: this.state.preferences,
      _prefsReady: this._prefsReady,
      _claudeSettingsReady: this._claudeSettingsReady,
      updatePreferences: this.updatePreferences,
      updateClaudeSettings: this.updateClaudeSettings,
    };
    return (
      <SettingsContext.Provider value={value}>
        {this.props.children}
      </SettingsContext.Provider>
    );
  }
}
