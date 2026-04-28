import React from 'react';
import { ConfigProvider, Layout, theme, Modal, Button, Checkbox, Spin, Alert, message } from 'antd';
import { UploadOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import AppBase, { styles } from './AppBase';
import { isMobile, setViewMode } from './env';
import TerminalPanel, { uploadFileAndGetPath } from './components/TerminalPanel';
import AppHeader from './components/AppHeader';
import RequestList from './components/RequestList';
import DetailPanel from './components/DetailPanel';
import ChatView from './components/ChatView';
import PanelResizer from './components/PanelResizer';
import OpenFolderIcon from './components/OpenFolderIcon';
import CountryFlag from './components/CountryFlag';
import { t } from './i18n';
import { filterRelevantRequests, findPrevMainAgentTimestamp } from './utils/helpers';
import { isMainAgent } from './utils/contentFilter';
import { classifyRequest } from './utils/requestType';
import { apiUrl } from './utils/apiUrl';
import { parseAvailablePages } from './utils/parseAvailablePages';
import { stripAnsi } from './utils/stripAnsi';
import ProjectLauncher from './components/VisualEditor/ProjectLauncher';
import PagePreview from './components/VisualEditor/PagePreview';
import ElementInfo from './components/VisualEditor/ElementInfo';
import StatusBar from './components/VisualEditor/StatusBar';
import SideMenu from './components/VisualEditor/SideMenu';
import BottomTabPanel from './components/VisualEditor/BottomTabPanel';
import ScenarioPanel from './components/VisualEditor/ScenarioPanel';
import ScenarioGallery from './components/VisualEditor/ScenarioGallery';

class App extends AppBase {
  constructor(props) {
    super(props);
    // PC 专属 state
    Object.assign(this.state, {
      leftPanelWidth: 380,
      terminalVisible: true,
      currentTab: 'context',
      pendingCacheHighlight: null,
      visualPendingImages: [],
      visualMenuKey: 'ui-edit',
      visualOperationHeight: 220,
      bottomPanelCollapsed: false,
      activeBottomTab: 'element',   // 'element' only — launcher is now a SideMenu entry
      previewUrl: '',          // persisted across viewMode switches
      availablePages: [],
      pendingScenario: null,
      scenarioProgress: null,
      batchQueue: null,       // array of scenarios to run in batch
      batchProgress: null,    // { current, total }
      batchScreenshots: [],   // [{ scenarioId, name, dataUrl }]
      showGallery: false,
      pinnedScenario: null,  // { id, name, url, storage, steps }
      isRecording: false,
      recordedSteps: [],
    });
    this.appHeaderRef = React.createRef();
    this._getTokenStatsContent = () => this.appHeaderRef.current?.renderTokenStats?.() ?? null;
    this.visualCenterRef = React.createRef();
    this._screenshotFn = null; // set by PagePreview via onScreenshotReady
  }

  componentDidMount() {
    super.componentDidMount();
    // 窗口宽度 < 600px 时提示切换到侧边栏模式
    this._mqlNarrow = window.matchMedia('(max-width: 600px)');
    this._modeSwitchDialog = null;
    this._onNarrowChange = (e) => {
      if (e.matches) {
        this._modeSwitchDialog = Modal.confirm({
          title: t('ui.modeSwitchTitle'),
          content: t('ui.modeSwitchToSidebar'),
          okText: t('ui.ok'),
          onOk: () => { this._modeSwitchDialog = null; setViewMode('pad'); },
          onCancel: () => { this._modeSwitchDialog = null; },
        });
      } else if (this._modeSwitchDialog) {
        this._modeSwitchDialog.destroy();
        this._modeSwitchDialog = null;
      }
    };
    this._mqlNarrow.addEventListener('change', this._onNarrowChange);
  }

  componentWillUnmount() {
    if (this._mqlNarrow) {
      this._mqlNarrow.removeEventListener('change', this._onNarrowChange);
    }
    if (this._modeSwitchDialog) {
      this._modeSwitchDialog.destroy();
      this._modeSwitchDialog = null;
    }
    super.componentWillUnmount();
  }

  componentDidUpdate(prevProps, prevState) {
    // 当 projectOutput 更新时，解析 Available Pages（不依赖 visualMenuKey）
    if (this.state.projectOutput !== prevState.projectOutput && this.state.projectOutput) {
      const cleanOutput = stripAnsi(this.state.projectOutput);
      const pages = parseAvailablePages(cleanOutput);
      if (JSON.stringify(pages) !== JSON.stringify(this.state.availablePages)) {
        this.setState({ availablePages: pages });
      }
    }

    // 仅在 ui-edit 模式下自动管理底部面板
    if (this.state.visualMenuKey !== 'ui-edit') return;

    // 项目启动成功后自动折叠底部面板
    const prevStatus = prevState.projectStatus?.status;
    const curStatus = this.state.projectStatus?.status;
    if (prevStatus !== 'running' && curStatus === 'running') {
      this.setState({ bottomPanelCollapsed: true });
    }
    // 项目停止后自动展开
    if (prevStatus === 'running' && curStatus !== 'running') {
      this.setState({ bottomPanelCollapsed: false });
    }

    // selectedElement 从 null 变为非 null 时，展开并切换到元素信息 Tab
    const prevEl = prevState.selectedElement;
    const curEl = this.state.selectedElement;
    if (!prevEl && curEl) {
      this.setState({ activeBottomTab: 'element', bottomPanelCollapsed: false });
    }
  }

  // ─── PC 专属方法 ───────────────────────────────────────

  handleVerticalResizeStart = (e) => {
    e.preventDefault();
    const onMouseMove = (ev) => {
      const center = this.visualCenterRef.current;
      if (!center) return;
      const rect = center.getBoundingClientRect();
      let h = rect.bottom - ev.clientY;
      const maxH = rect.height * 0.6;
      if (h < 120) h = 120;
      if (h > maxH) h = maxH;
      this.setState({ visualOperationHeight: h });
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  handlePreviewUrlChange = (url) => {
    this.setState({ previewUrl: url });
  };

  handleQrClick = async (pageName) => {
    try {
      await fetch('/api/project/stdin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `sim ${pageName}\n` }),
      });
    } catch (_) {
      // 静默忽略网络错误
    }
  };

  handleRunScenario = (scenario) => {
    this.setState({ pendingScenario: scenario, visualMenuKey: 'ui-edit' });
  };

  handlePinScenario = (scenario) => {
    this.setState(prev => ({
      pinnedScenario: prev.pinnedScenario?.id === scenario?.id ? null : scenario,
    }));
  };

  handleStartRecording = () => {
    this.setState({ isRecording: true, recordedSteps: [], visualMenuKey: 'ui-edit' });
  };

  handleStopRecording = () => {
    this.setState({ isRecording: false });
  };

  handleRecordedStep = (step) => {
    this.setState(prev => ({ recordedSteps: [...prev.recordedSteps, step] }));
  };

  handleStepProgress = (current, total) => {
    this.setState({ scenarioProgress: total > 0 ? { current, total } : null });
  };

  handleScreenshotReady = (fn) => {
    this._screenshotFn = fn;
  };

  handleBatchRun = async (scenarios) => {
    if (!scenarios || scenarios.length === 0) return;
    this.setState({
      showGallery: true,
      batchScreenshots: [],
      batchProgress: { current: 0, total: scenarios.length },
      batchQueue: scenarios,
      visualMenuKey: 'ui-edit',
    });
    // Run sequentially — each scenario triggers onScenarioDone which advances the queue
    this._batchScenarios = scenarios;
    this._batchIndex = 0;
    this._runNextBatchScenario();
  };

  _runNextBatchScenario = () => {
    const scenarios = this._batchScenarios;
    if (!scenarios || this._batchIndex >= scenarios.length) {
      this._batchScenarios = null;
      this._batchIndex = 0;
      return;
    }
    const scenario = scenarios[this._batchIndex];
    this.setState({ pendingScenario: scenario, visualMenuKey: 'ui-edit' });
  };

  handleBatchScenarioDone = async () => {
    const scenarios = this._batchScenarios;
    if (!scenarios) {
      this.setState({ pendingScenario: null });
      return;
    }
    const scenario = scenarios[this._batchIndex];
    // Take screenshot
    let dataUrl = null;
    if (this._screenshotFn) {
      // Small delay to let the page settle after steps complete
      await new Promise(r => setTimeout(r, 500));
      dataUrl = await this._screenshotFn();
    }
    const newShot = dataUrl ? { scenarioId: scenario.id, name: scenario.name, dataUrl } : null;
    this._batchIndex++;
    const current = this._batchIndex;
    const total = scenarios.length;
    this.setState(prev => ({
      pendingScenario: null,
      scenarioProgress: null,
      batchProgress: { current, total },
      batchScreenshots: newShot ? [...prev.batchScreenshots, newShot] : prev.batchScreenshots,
    }), () => {
      if (this._batchIndex < scenarios.length) {
        // Small delay before running next scenario
        setTimeout(() => this._runNextBatchScenario(), 300);
      } else {
        this._batchScenarios = null;
        this._batchIndex = 0;
      }
    });
  };

  handleViewRequest = (index) => {
    this.setState({ viewMode: 'raw', selectedIndex: index, scrollCenter: true });
  };

  handleViewInChat = () => {
    this.setState(prev => {
      const filteredRequests = prev.showAll ? prev.requests : filterRelevantRequests(prev.requests);
      const selectedReq = filteredRequests[prev.selectedIndex];
      if (!selectedReq) return null;
      let targetTs = null;
      if (isMainAgent(selectedReq) && selectedReq.timestamp) {
        targetTs = selectedReq.timestamp;
      } else {
        const cls = classifyRequest(selectedReq);
        if ((cls.type === 'SubAgent' || cls.type === 'Teammate') && selectedReq.timestamp) {
          targetTs = selectedReq.timestamp;
        } else {
          const idx = prev.requests.indexOf(selectedReq);
          if (idx >= 0) {
            targetTs = findPrevMainAgentTimestamp(prev.requests, idx);
          }
        }
        if (!targetTs) {
          message.info(t('ui.cannotMap'));
        }
      }
      return { viewMode: 'chat', chatScrollToTs: targetTs };
    });
  };

  handleToggleViewMode = () => {
    this.setState(prev => {
      // 从 visual 模式回到 chat
      if (prev.viewMode === 'visual') return { viewMode: 'chat' };
      const newMode = prev.viewMode === 'raw' ? 'chat' : 'raw';
      if (newMode === 'raw') {
        if (prev.selectedIndex === null) {
          const filtered = prev.showAll ? prev.requests : filterRelevantRequests(prev.requests);
          return {
            viewMode: newMode,
            selectedIndex: filtered.length > 0 ? filtered.length - 1 : null,
            scrollCenter: true,
          };
        }
        return { viewMode: newMode, scrollCenter: true };
      }
      const filtered = prev.showAll ? prev.requests : filterRelevantRequests(prev.requests);
      const selectedReq = prev.selectedIndex != null ? filtered[prev.selectedIndex] : null;
      if (selectedReq) {
        let targetTs = null;
        if (isMainAgent(selectedReq) && selectedReq.timestamp) {
          targetTs = selectedReq.timestamp;
        } else {
          const cls = classifyRequest(selectedReq);
          if ((cls.type === 'SubAgent' || cls.type === 'Teammate') && selectedReq.timestamp) {
            targetTs = selectedReq.timestamp;
          } else {
            const idx = prev.requests.indexOf(selectedReq);
            if (idx >= 0) {
              targetTs = findPrevMainAgentTimestamp(prev.requests, idx);
            }
            if (!targetTs) {
              message.info(t('ui.cannotMap'));
            }
          }
        }
        return { viewMode: newMode, chatScrollToTs: targetTs };
      }
      return { viewMode: newMode, chatScrollToTs: null };
    }, () => {
      if (this.state.viewMode === 'chat' && this.state.terminalVisible && this.state.cliMode && !isMobile) {
        requestAnimationFrame(() => {
          const ta = document.querySelector('.xterm-helper-textarea');
          if (ta) ta.focus();
        });
      }
    });
  };

  handleTabChange = (key) => {
    this.setState({ currentTab: key });
  };

  handleCacheHighlightDone = () => { this.setState({ pendingCacheHighlight: null }); };

  handleNavigateCacheMsg = (msgIdx) => {
    const filteredRequests = this.state.showAll ? this.state.requests : filterRelevantRequests(this.state.requests);
    let targetIdx = -1;
    for (let i = filteredRequests.length - 1; i >= 0; i--) {
      if (isMainAgent(filteredRequests[i])) { targetIdx = i; break; }
    }
    if (targetIdx < 0) return;
    this.setState({ selectedIndex: targetIdx, scrollCenter: true, currentTab: 'kv-cache-text', pendingCacheHighlight: { msgIdx, key: Date.now() } });
  };

  handleResize = (clientX) => {
    const container = this.mainContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const newWidth = clientX - rect.left;
    if (newWidth >= 250 && newWidth <= 800) {
      this.setState({ leftPanelWidth: newWidth });
    }
  };

  // ─── 文件处理 & 拖拽 ────────────────────────────────────

  handleLoadLocalJsonlFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.jsonl';
    input.multiple = true;
    input.onchange = (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;
      const totalSize = files.reduce((s, f) => s + f.size, 0);
      if (totalSize > 500 * 1024 * 1024) {
        message.error(t('ui.fileTooLarge'));
        return;
      }
      this.setState({ fileLoading: true, fileLoadingCount: 0 });
      let readCount = 0;
      const allEntries = [];
      const fileNames = [];
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const content = ev.target.result;
            const entries = content.split('\n---\n').filter(line => line.trim()).map(entry => {
              try { return JSON.parse(entry); } catch { return null; }
            }).filter(Boolean);
            allEntries.push(...entries);
            fileNames.push(file.name);
          } catch {}
          readCount++;
          if (readCount === files.length) {
            this._finishLocalLoad(allEntries, fileNames);
          }
        };
        reader.readAsText(file);
      });
    };
    input.click();
  };

  _processJsonlFiles = (files) => {
    if (!files || files.length === 0) return;
    const totalSize = files.reduce((s, f) => s + f.size, 0);
    if (totalSize > 500 * 1024 * 1024) {
      message.error(t('ui.fileTooLarge'));
      return;
    }
    this.setState({ fileLoading: true, fileLoadingCount: 0 });
    let readCount = 0;
    const allEntries = [];
    const fileNames = [];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const content = ev.target.result;
          const entries = content.split('\n---\n').filter(line => line.trim()).map(entry => {
            try { return JSON.parse(entry); } catch { return null; }
          }).filter(Boolean);
          allEntries.push(...entries);
          fileNames.push(file.name);
        } catch {}
        readCount++;
        if (readCount === files.length) {
          this._finishLocalLoad(allEntries, fileNames);
        }
      };
      reader.readAsText(file);
    });
  };

  _isInternalDrag = (e) => e.dataTransfer.types.includes('text/x-preset-reorder');

  _onDragOver = (e) => {
    e.preventDefault();
    if (this._isInternalDrag(e)) return;
    // FileExplorer 区域不显示全屏 overlay，由 FileExplorer 自己处理外部拖入反馈
    const overFileExplorer = e.target.closest && e.target.closest('[data-file-explorer]');
    if (overFileExplorer) {
      if (this.state.isDragging) this.setState({ isDragging: false });
      return;
    }
    if (!this.state.isDragging) this.setState({ isDragging: true });
  };

  _onDragLeave = (e) => {
    const layout = this._layoutRef.current;
    if (layout && !layout.contains(e.relatedTarget)) {
      this.setState({ isDragging: false });
    }
  };

  _onDrop = (e) => {
    e.preventDefault();
    if (this._isInternalDrag(e)) return;
    this.setState({ isDragging: false });
    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;
    Promise.all(
      files.map(file =>
        uploadFileAndGetPath(file).then(path => ({ name: file.name, path }))
          .catch(err => { message.error(`${file.name}: ${err.message}`); return null; })
      )
    ).then(results => {
      const paths = results.filter(Boolean).map(r => `"${r.path}"`);
      if (paths.length > 0) {
        this.setState(prev => ({
          pendingUploadPaths: [...(prev.pendingUploadPaths || []), ...paths],
        }));
      }
    });
  };

  handleUploadPathsConsumed = () => {
    this.setState({ pendingUploadPaths: [] });
  };

  // ─── PC 渲染 ──────────────────────────────────────────

  render() {
    const { filteredRequests, selectedRequest, fileLoading, fileLoadingCount, mainAgentSessions, viewMode } = this.renderPrepare();
    const { selectedIndex, leftPanelWidth, currentTab } = this.state;

    // 工作区选择器模式
    if (this.state.workspaceMode) {
      return this.renderWorkspaceMode();
    }

    return (
      <ConfigProvider theme={this.themeConfig}>
        {fileLoading && (
          <div className={styles.loadingOverlay}>
            <div className={styles.loadingText}>Loading...({fileLoadingCount})</div>
          </div>
        )}
        {this.state.isDragging && (
          <div className={styles.dragOverlay}>
            <div className={styles.dragOverlayContent}>
              <UploadOutlined className={styles.dragIcon} />
              <p>{t('ui.dragDropHint')}</p>
            </div>
          </div>
        )}
        <Layout className={styles.layout} ref={this._layoutRef} onDragOver={this._onDragOver} onDragLeave={this._onDragLeave} onDrop={this._onDrop}>
          <Layout.Header className={styles.header}>
            <AppHeader
              ref={this.appHeaderRef}
              requestCount={filteredRequests.length}
              requests={filteredRequests}
              viewMode={viewMode}
              cacheExpireAt={this.state.cacheExpireAt}
              cacheType={this.state.cacheType}
              onToggleViewMode={this.handleToggleViewMode}
              onLangChange={this.handleLangChange}
              onImportLocalLogs={this.handleImportLocalLogs}
              isLocalLog={!!this._isLocalLog}
              localLogFile={this._localLogFile}
              projectName={this.state.projectName}
              collapseToolResults={this.state.collapseToolResults}
              onCollapseToolResultsChange={this.handleCollapseToolResultsChange}
              expandThinking={this.state.expandThinking}
              onExpandThinkingChange={this.handleExpandThinkingChange}
              showFullToolContent={this.state.showFullToolContent}
              onShowFullToolContentChange={this.handleShowFullToolContentChange}
              expandDiff={this.state.expandDiff}
              onExpandDiffChange={this.handleExpandDiffChange}
              filterIrrelevant={!this.state.showAll}
              onFilterIrrelevantChange={this.handleFilterIrrelevantChange}
              logDir={this.state.logDir}
              onLogDirChange={this.handleLogDirChange}
              updateInfo={this.state.updateInfo}
              onDismissUpdate={() => this.setState({ updateInfo: null })}
              cliMode={this.state.cliMode}
              sdkMode={this.state.sdkMode}
              terminalVisible={this.state.sdkMode ? false : this.state.terminalVisible}
              onToggleTerminal={() => this.setState(prev => ({ terminalVisible: !prev.terminalVisible }))}
              onReturnToWorkspaces={this.state.cliMode ? this.handleReturnToWorkspaces : null}
              contextWindow={this.state.contextWindow}
              contextBarOptimistic={this.state.contextBarOptimistic}
              onNavigateCacheMsg={this.handleNavigateCacheMsg}
              serverCachedContent={this.state.serverCachedContent || this._lastKvCacheContent}
              resumeAutoChoice={this.state.resumeAutoChoice}
              onResumeAutoChoiceToggle={this.handleResumeAutoChoiceToggle}
              onResumeAutoChoiceChange={this.handleResumeAutoChoiceChange}
              themeColor={this.state.themeColor}
              onThemeColorChange={this.handleThemeColorChange}
              autoApproveSeconds={this.state.autoApproveSeconds}
              onAutoApproveChange={this.handleAutoApproveChange}
              proxyProfiles={this.state.proxyProfiles}
              activeProxyId={this.state.activeProxyId}
              defaultConfig={this.state.defaultConfig}
              onProxyProfileChange={this.handleProxyProfileChange}
              onSetViewMode={(mode) => this.setState({ viewMode: mode })}
            />
          </Layout.Header>
          {this.state.claudeMissing && (
            <Alert
              type="warning"
              showIcon
              banner
              message={t('ui.claudeMissing.title')}
              description={<span>{t('ui.claudeMissing.desc')}<br /><code style={{ background: 'var(--bg-code)', padding: '2px 6px', borderRadius: 3 }}>npm install -g @anthropic-ai/claude-code</code> <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>{t('ui.claudeMissing.or')}</span> <a href="https://claude.ai/download" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary-light)' }}>{t('ui.claudeMissing.native')}</a></span>}
            />
          )}
          <Layout.Content className={`${styles.content}${viewMode === 'visual' ? ' ' + styles.contentVisual : ''}`}>
            {viewMode === 'raw' && (
              filteredRequests.length === 0 ? (
                <div className={styles.guideContainer}>
                  <div className={styles.guideContent}>
                    <h2 className={styles.guideTitle}>{t('ui.guide.title')}</h2>

                    <div className={styles.guideStep}>
                      <div className={styles.guideStepNum}>1</div>
                      <div className={styles.guideStepBody}>
                        <p className={styles.guideText}>{t('ui.guide.step1')}</p>
                        <code className={styles.guideCode}>{t('ui.guide.exampleQuestion')}</code>
                      </div>
                    </div>

                    <div className={styles.guideStep}>
                      <div className={styles.guideStepNum}>2</div>
                      <div className={styles.guideStepBody}>
                        <p className={styles.guideText}>{t('ui.guide.step2')}</p>
                        <code className={styles.guideCode}>{t('ui.guide.troubleshootCmd')}</code>
                      </div>
                    </div>

                    <div className={styles.guideStep}>
                      <div className={styles.guideStepNum}>3</div>
                      <div className={styles.guideStepBody}>
                        <p className={styles.guideText}>{t('ui.guide.step3')}</p>
                        <code className={styles.guideCode}>npm install -g @anthropic-ai/claude-code</code>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
              <div
                ref={this.mainContainerRef}
                className={styles.mainContainer}
              >
                <div className={styles.leftPanel} style={{ width: leftPanelWidth }}>
                  <div className={styles.leftPanelHeader}>
                    <span>{t('ui.requestList')}</span>
                    <span className={styles.leftPanelCount}>{t('ui.totalRequests', { count: filteredRequests.length })}</span>
                  </div>
                  <div className={styles.leftPanelBody}>
                    <RequestList
                      requests={filteredRequests}
                      selectedIndex={selectedIndex}
                      scrollCenter={this.state.scrollCenter}
                      onSelect={this.handleSelectRequest}
                      onScrollDone={this.handleScrollDone}
                      cacheLossMap={this._cacheLossMap}
                    />
                  </div>
                </div>

                <PanelResizer onResize={this.handleResize} />

                <div className={styles.rightPanel}>
                  <DetailPanel
                    request={selectedRequest}
                    requests={filteredRequests}
                    allRequests={this.state.requests}
                    selectedIndex={selectedIndex}
                    currentTab={currentTab}
                    onTabChange={this.handleTabChange}
                    onViewInChat={this.handleViewInChat}
                    expandDiff={this.state.expandDiff}
                    pendingCacheHighlight={this.state.pendingCacheHighlight}
                    onCacheHighlightDone={this.handleCacheHighlightDone}
                  />
                </div>
              </div>
              )
            )}
            {viewMode === 'visual' && (
              <div className={styles.visualMain}>
                <SideMenu
                  activeKey={this.state.visualMenuKey}
                  onSelect={(key) => this.setState({ visualMenuKey: key })}
                />
                <div className={styles.visualCenter} ref={this.visualCenterRef}>
                  <StatusBar
                    sketchMcpStatus={this.state.sketchMcpStatus}
                    selectedElement={this.state.selectedElement}
                    sketchSelectedLayer={this.state.sketchSelectedLayer}
                    onAuthenticate={this.handleSketchAuthenticate}
                  />
                  {this.state.visualMenuKey === 'launcher' ? (
                    <div className={styles.visualLauncherArea}>
                      <ProjectLauncher
                        status={this.state.projectStatus}
                        output={this.state.projectOutput}
                        onStart={this.handleStartProject}
                        onStop={this.handleStopProject}
                        defaultPath={this.state.projectDir}
                        availablePages={this.state.availablePages}
                        onPreviewUrlChange={this.handlePreviewUrlChange}
                        onSelectMenu={(key) => this.setState({ visualMenuKey: key })}
                        onQrClick={this.handleQrClick}
                      />
                    </div>
                  ) : this.state.visualMenuKey === 'ui-edit' ? (
                    <>
                      <div className={styles.visualPreviewArea}>
                        <PagePreview
                          port={this.state.projectStatus?.port}
                          previewUrl={this.state.previewUrl}
                          onPreviewUrlChange={this.handlePreviewUrlChange}
                          onElementHover={(el) => {}}
                          onElementSelect={(el) => this.setState({ selectedElement: el })}
                          onElementDeselect={() => this.setState({ selectedElement: null, visualPendingImages: [] })}
                          selectedElement={this.state.selectedElement}
                          sketchMcpStatus={this.state.sketchMcpStatus}
                          onElementScreenshot={this.handleElementScreenshot}
                          pendingScenario={this.state.pendingScenario}
                          onScenarioDone={this._batchScenarios ? this.handleBatchScenarioDone : () => this.setState({ pendingScenario: null })}
                          onStepProgress={this.handleStepProgress}
                          onScreenshotReady={this.handleScreenshotReady}
                          pinnedScenario={this.state.pinnedScenario}
                          onUnpinScenario={() => this.setState({ pinnedScenario: null })}
                          isRecording={this.state.isRecording}
                          onRecordedStep={this.handleRecordedStep}
                        />
                      </div>
                      {/* 折叠时隐藏 resizer */}
                      {!this.state.bottomPanelCollapsed && (
                        <div
                          className={styles.visualHResizer}
                          onMouseDown={this.handleVerticalResizeStart}
                        />
                      )}
                      <div
                        className={styles.visualOperationArea}
                        style={{
                          height: this.state.bottomPanelCollapsed
                            ? 33
                            : this.state.visualOperationHeight,
                        }}
                      >
                        <BottomTabPanel
                          tabs={[
                            { key: 'element', labelKey: 'visual.tabElement' },
                            { key: 'scenario', labelKey: 'visual.tabScenario' },
                          ]}
                          activeTab={this.state.activeBottomTab}
                          collapsed={this.state.bottomPanelCollapsed}
                          onTabClick={(key) => {
                            this.setState({ activeBottomTab: key, bottomPanelCollapsed: false });
                          }}
                          onCollapse={() => this.setState(prev => ({ bottomPanelCollapsed: !prev.bottomPanelCollapsed }))}
                        >
                          {{
                            element: (
                              <ElementInfo element={this.state.selectedElement} />
                            ),
                            scenario: (
                              <ScenarioPanel
                                compact
                                onRunScenario={this.handleRunScenario}
                                scenarioProgress={this.state.scenarioProgress}
                                onBatchRun={this.handleBatchRun}
                                pinnedScenarioId={this.state.pinnedScenario?.id || null}
                                onPinScenario={this.handlePinScenario}
                                isRecording={this.state.isRecording}
                                onStartRecording={this.handleStartRecording}
                                onStopRecording={this.handleStopRecording}
                                recordedSteps={this.state.recordedSteps}
                              />
                            ),
                          }}
                        </BottomTabPanel>
                      </div>
                    </>
                  ) : this.state.visualMenuKey === 'scenarios' ? (
                    <div className={styles.visualPreviewArea}>
                      {this.state.showGallery ? (
                        <ScenarioGallery
                          screenshots={this.state.batchScreenshots}
                          batchProgress={this.state.batchProgress}
                          onBack={() => this.setState({ showGallery: false })}
                        />
                      ) : (
                        <ScenarioPanel
                          onRunScenario={this.handleRunScenario}
                          scenarioProgress={this.state.scenarioProgress}
                          onBatchRun={this.handleBatchRun}
                          pinnedScenarioId={this.state.pinnedScenario?.id || null}
                          onPinScenario={this.handlePinScenario}
                          isRecording={this.state.isRecording}
                          onStartRecording={this.handleStartRecording}
                          onStopRecording={this.handleStopRecording}
                          recordedSteps={this.state.recordedSteps}
                        />
                      )}
                    </div>
                  ) : (
                    <div className={styles.visualPipelinePlaceholder}>
                      {t('visual.pipelineComingSoon')}
                    </div>
                  )}
                </div>
                <div className={styles.visualTerminalWrapper}>
                  {this.state.selectedElement && (
                    <div className={styles.visualElementTag}>
                      <span>&lt;{this.state.selectedElement.tag}&gt;</span>
                      {this.state.selectedElement.className && (
                        <span className={styles.visualElementTagClass}>
                          .{this.state.selectedElement.className.split(' ').slice(0, 2).join(' .')}
                        </span>
                      )}
                      <span
                        className={styles.visualElementTagSend}
                        onClick={() => {
                          const el = this.state.selectedElement;
                          if (!el) return;
                          const parts = [`<${el.tag}>`];
                          if (el.className) parts.push(`.${el.className.split(' ').slice(0, 2).join('.')}`);
                          if (el.id) parts.push(`#${el.id}`);
                          if (el.textContent) parts.push(`text="${el.textContent.slice(0, 50)}"`);
                          window.dispatchEvent(new CustomEvent('ccv-terminal-send', { detail: { text: parts.join(' ') } }));
                        }}
                        title="Send to terminal"
                      >&#x27a4;</span>
                      <span className={styles.visualElementTagClose} onClick={() => this.setState({ selectedElement: null })}>&times;</span>
                    </div>
                  )}
                  <TerminalPanel
                    pendingImages={this.state.visualPendingImages}
                    onFilePath={() => {}}
                    onRemovePendingImage={(i) => this.setState(prev => ({ visualPendingImages: prev.visualPendingImages.filter((_, idx) => idx !== i) }))}
                    onClearPendingImages={() => this.setState({ visualPendingImages: [] })}
                    modelName={this.state.contextWindow?.model}
                    selectedElement={this.state.selectedElement}
                  />
                </div>
              </div>
            )}
            {viewMode !== 'visual' && (
            <div className={styles.chatViewWrapper} style={{ display: viewMode === 'chat' ? 'flex' : 'none' }}>
              <ChatView compact={false} getTokenStatsContent={this._getTokenStatsContent} requests={filteredRequests} mainAgentSessions={mainAgentSessions} streamingLatest={this.state.streamingLatest} userProfile={this.state.userProfile} collapseToolResults={this.state.collapseToolResults} expandThinking={this.state.expandThinking} showFullToolContent={this.state.showFullToolContent} showThinkingSummaries={this.state.showThinkingSummaries} onViewRequest={this.handleViewRequest} scrollToTimestamp={this.state.chatScrollToTs} onScrollTsDone={this.handleScrollTsDone} cliMode={this._isLocalLog ? false : this.state.cliMode} sdkMode={this._isLocalLog ? false : this.state.sdkMode} terminalVisible={this._isLocalLog ? false : (this.state.sdkMode ? false : this.state.terminalVisible)} onToggleTerminal={() => this.setState(prev => ({ terminalVisible: !prev.terminalVisible }))} pendingUploadPaths={this.state.pendingUploadPaths} onUploadPathsConsumed={this.handleUploadPathsConsumed} fileLoading={this.state.fileLoading} isStreaming={this.state.isStreaming} hasMoreHistory={this.state.hasMoreHistory} loadingMore={this.state.loadingMore} onLoadMoreHistory={() => this.loadMoreHistory()} loadingSessionId={this.state.loadingSessionId} onLoadSession={(sid) => this.loadSession(sid)} lang={this.state.lang} autoApproveSeconds={this.state.autoApproveSeconds} onAutoApproveChange={this.handleAutoApproveChange} onClearContextOptimistic={this.handleClearContextOptimistic} />
            </div>
            )}
          </Layout.Content>
          <div className={styles.footer}>
            <CountryFlag />
            <div className={styles.footerRight}>
              <a href="https://github.com/weiesky/cc-viewer" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>
                <svg className={styles.footerIcon} viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" /></svg>
                GitHub{this.state.githubStars != null ? ` ★ ${this.state.githubStars}` : ''}
              </a>
              <span className={styles.footerSep}>|</span>
              <span className={`${styles.footerVersion}${this.state.updateInfo ? ` ${styles.footerVersionNew}` : ''}`} onClick={() => this.setState({ updateModalVisible: true })} style={{ cursor: 'pointer' }}>
                v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : ''}
                {this.state.updateInfo && (
                  <svg className={styles.newBadge} width="28" height="12" viewBox="0 0 28 12">
                    <rect width="28" height="12" rx="3" fill="currentColor" opacity="0.25" />
                    <text x="14" y="9" textAnchor="middle" fill="currentColor" fontSize="8" fontWeight="600" fontFamily="system-ui">NEW</text>
                  </svg>
                )}
              </span>
            </div>
          </div>
        </Layout>

        <Modal
          title={t('ui.update.title')}
          open={this.state.updateModalVisible}
          onCancel={() => this.setState({ updateModalVisible: false })}
          footer={null}
          width={480}
        >
          <div style={{ lineHeight: 1.8 }}>
            <p><strong>{t('ui.update.current')}:</strong> v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : ''}</p>
            {this.state.updateInfo && <p><strong>{t('ui.update.latest')}:</strong> v{this.state.updateInfo.version}</p>}
            <p style={{ marginTop: 12 }}><strong>{t('ui.update.npm')}</strong></p>
            <code style={{ display: 'block', background: 'var(--bg-code)', padding: '8px 12px', borderRadius: 6, fontSize: 13 }}>npm update -g cc-viewer</code>
            {typeof window !== 'undefined' && window.electronAPI && (<>
              <p style={{ marginTop: 16 }}><strong>{t('ui.update.electron')}</strong></p>
              <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>{t('ui.update.electronDesc')}</p>
              <ol style={{ color: 'var(--text-tertiary)', fontSize: 13, paddingLeft: 20, margin: '6px 0' }}>
                <li>{t('ui.update.step1')}</li>
                <li>{t('ui.update.step2')}</li>
                <li>{t('ui.update.step3')}</li>
              </ol>
            </>)}
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <Button type="primary" href="https://github.com/weiesky/cc-viewer/releases" target="_blank" rel="noopener noreferrer">
                {t('ui.update.goReleases')}
              </Button>
            </div>
          </div>
        </Modal>
        <Modal
          title={t('ui.resume.title')}
          open={this.state.resumeModalVisible}
          closable={false}
          maskClosable={false}
          keyboard={false}
          footer={
            <div>
              <div className={styles.resumeFooterRight}>
                <Button key="continue" type="primary" onClick={() => this.handleResumeChoice('continue')} className={styles.btnMarginRight}>
                  {t('ui.resume.continue')}
                </Button>
                <Button key="new" onClick={() => this.handleResumeChoice('new')}>
                  {t('ui.resume.new')}
                </Button>
              </div>
              <div className={styles.resumeFooterLeft}>
                <Checkbox
                  checked={this.state.resumeRememberChoice}
                  onChange={(e) => this.setState({ resumeRememberChoice: e.target.checked })}
                  className={styles.resumeCheckboxOpacity}
                >
                  <span className={styles.resumeCheckboxOpacity}>{t('ui.resume.remember')}</span>
                </Checkbox>
              </div>
            </div>
          }
        >
          <p>{t('ui.resume.message', { file: this.state.resumeFileName })}</p>
        </Modal>

        <Modal
          title={<span className={styles.modalTitleInline}><OpenFolderIcon apiEndpoint={apiUrl('/api/open-log-dir')} title={t('ui.openLogDir')} size={16} />{t('ui.importLocalLogs')}</span>}
          open={this.state.importModalVisible}
          onCancel={this.handleCloseImportModal}
          footer={null}
          width={1000}
          styles={{ body: { overflow: 'hidden' } }}
        >
          <div className={styles.modalActions}>
            <Button icon={<UploadOutlined />} onClick={this.handleLoadLocalJsonlFile}>
              {t('ui.loadLocalJsonl')}
            </Button>
            <Button
              size="small"
              type={this.state.selectedLogs.size > 1 ? 'primary' : 'default'}
              disabled={this.state.selectedLogs.size < 2}
              onClick={this.handleMergeLogs}
              className={styles.btnMarginLeft}
            >
              {t('ui.mergeLogs')}
            </Button>
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={this.state.selectedLogs.size === 0}
              onClick={this.handleDeleteLogs}
              className={styles.btnMarginLeft}
            >
              {t('ui.deleteLogs')}
            </Button>
            <Button
              size="small"
              icon={<ReloadOutlined spin={this.state.refreshingStats} />}
              loading={this.state.refreshingStats}
              onClick={this.handleRefreshStats}
              className={styles.btnMarginLeft}
            >
              {t('ui.refreshStats')}
            </Button>
          </div>
          {this.state.localLogsLoading ? (
            <div className={styles.spinCenter}><Spin /></div>
          ) : (() => {
            const currentLogs = this.state.localLogs[this.state.currentProject];
            if (!currentLogs || currentLogs.length === 0) {
              return (
                <div className={styles.emptyCenter}>
                  {t('ui.noLogs')}
                </div>
              );
            }
            return (
              <div className={styles.logListContainer}>
                {this.renderLogTable(currentLogs, false)}
              </div>
            );
          })()}
        </Modal>
      </ConfigProvider>
    );
  }
}

export default App;
