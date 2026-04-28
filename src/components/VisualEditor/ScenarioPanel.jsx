import React, { useState, useEffect, useCallback } from 'react';
import { Button, Input, Space, Typography, message } from 'antd';
import { PlusOutlined, DeleteOutlined, PlayCircleOutlined, EditOutlined, MinusCircleOutlined, CameraOutlined, PushpinOutlined, PushpinFilled, CopyOutlined, AimOutlined, HolderOutlined } from '@ant-design/icons';
import { t } from '../../i18n';
import { getScenarios, createScenario, updateScenario, deleteScenario } from '../../utils/scenarioStorage';
import styles from './styles.module.css';

function StorageEditor({ pairs, onChange }) {
  const addRow = () => onChange([...pairs, { key: '', value: '' }]);
  const removeRow = (i) => onChange(pairs.filter((_, idx) => idx !== i));
  const updateRow = (i, field, val) => {
    const next = pairs.map((p, idx) => idx === i ? { ...p, [field]: val } : p);
    onChange(next);
  };
  return (
    <div>
      {pairs.map((p, i) => (
        <Space key={i} style={{ display: 'flex', marginBottom: 4 }}>
          <Input
            size="small"
            placeholder={t('visual.scenario.storageKey')}
            value={p.key}
            onChange={e => updateRow(i, 'key', e.target.value)}
            style={{ width: 120 }}
          />
          <Input
            size="small"
            placeholder={t('visual.scenario.storageValue')}
            value={p.value}
            onChange={e => updateRow(i, 'value', e.target.value)}
            style={{ width: 180 }}
          />
          <MinusCircleOutlined onClick={() => removeRow(i)} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} />
        </Space>
      ))}
      <Button size="small" icon={<PlusOutlined />} onClick={addRow} type="dashed" style={{ marginTop: 4 }}>
        {t('visual.scenario.storageKey')}
      </Button>
    </div>
  );
}

function StepsEditor({ steps, onChange, onPickElement }) {
  const dragIndex = useRef(null);

  const addStep = () => onChange([...steps, { type: 'click', selector: '' }]);
  const removeStep = (i) => onChange(steps.filter((_, idx) => idx !== i));
  const copyStep = (i) => onChange([...steps.slice(0, i + 1), { ...steps[i] }, ...steps.slice(i + 1)]);
  const updateStep = (i, field, val) => {
    onChange(steps.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  };

  const hasSelector = (type) => ['click', 'fill', 'hover', 'keyboard', 'select', 'assert'].includes(type);

  return (
    <div>
      {steps.map((s, i) => (
        <div
          key={i}
          draggable
          onDragStart={() => { dragIndex.current = i; }}
          onDragOver={e => e.preventDefault()}
          onDrop={() => {
            const from = dragIndex.current;
            if (from === null || from === i) return;
            const next = [...steps];
            const [removed] = next.splice(from, 1);
            next.splice(i, 0, removed);
            dragIndex.current = null;
            onChange(next);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, flexWrap: 'wrap' }}
        >
          <HolderOutlined style={{ cursor: 'grab', color: 'var(--text-muted)', flexShrink: 0 }} />
          <select
            value={s.type}
            onChange={e => updateStep(i, 'type', e.target.value)}
            style={{ fontSize: 12, padding: '1px 4px', height: 24 }}
          >
            <option value="click">{t('visual.scenario.stepClick')}</option>
            <option value="wait">{t('visual.scenario.stepWait')}</option>
            <option value="fill">{t('visual.scenario.stepFill')}</option>
            <option value="scroll">{t('visual.scenario.stepScroll')}</option>
            <option value="keyboard">{t('visual.scenario.stepKeyboard')}</option>
            <option value="hover">{t('visual.scenario.stepHover')}</option>
            <option value="select">{t('visual.scenario.stepSelect')}</option>
            <option value="assert">{t('visual.scenario.stepAssert')}</option>
          </select>

          {hasSelector(s.type) && (
            <>
              <Input
                size="small"
                placeholder={t('visual.scenario.stepSelector')}
                value={s.selector || ''}
                onChange={e => updateStep(i, 'selector', e.target.value)}
                style={{ width: 130 }}
              />
              {onPickElement && (
                <AimOutlined
                  title={t('visual.scenario.pickElement')}
                  style={{ cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0 }}
                  onClick={() => onPickElement(selector => updateStep(i, 'selector', selector))}
                />
              )}
            </>
          )}

          {s.type === 'wait' && (
            <Input size="small" type="number" placeholder={t('visual.scenario.stepMs')} value={s.ms || ''} onChange={e => updateStep(i, 'ms', Number(e.target.value))} style={{ width: 80 }} />
          )}
          {s.type === 'fill' && (
            <Input size="small" placeholder={t('visual.scenario.stepValue')} value={s.value || ''} onChange={e => updateStep(i, 'value', e.target.value)} style={{ width: 90 }} />
          )}
          {s.type === 'scroll' && (
            <>
              <Input size="small" type="number" placeholder={t('visual.scenario.stepX')} value={s.x || ''} onChange={e => updateStep(i, 'x', Number(e.target.value))} style={{ width: 60 }} />
              <Input size="small" type="number" placeholder={t('visual.scenario.stepY')} value={s.y || ''} onChange={e => updateStep(i, 'y', Number(e.target.value))} style={{ width: 60 }} />
            </>
          )}
          {s.type === 'keyboard' && (
            <Input size="small" placeholder={t('visual.scenario.stepKey')} value={s.key || ''} onChange={e => updateStep(i, 'key', e.target.value)} style={{ width: 90 }} />
          )}
          {s.type === 'select' && (
            <Input size="small" placeholder={t('visual.scenario.stepValue')} value={s.value || ''} onChange={e => updateStep(i, 'value', e.target.value)} style={{ width: 90 }} />
          )}
          {s.type === 'assert' && (
            <Input size="small" placeholder={t('visual.scenario.stepExpected')} value={s.expected || ''} onChange={e => updateStep(i, 'expected', e.target.value)} style={{ width: 110 }} />
          )}

          <CopyOutlined
            title={t('visual.scenario.stepCopy')}
            style={{ cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}
            onClick={() => copyStep(i)}
          />
          <MinusCircleOutlined onClick={() => removeStep(i)} style={{ cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }} />
        </div>
      ))}
      <Button size="small" icon={<PlusOutlined />} onClick={addStep} type="dashed" style={{ marginTop: 4 }}>
        {t('visual.scenario.steps')}
      </Button>
    </div>
  );
}

function ScenarioForm({ initial, onSave, onCancel, onPickElement }) {
  const [name, setName] = useState(initial?.name || '');
  const [url, setUrl] = useState(initial?.url || '');
  const [pairs, setPairs] = useState(
    Object.entries(initial?.storage || {}).map(([key, value]) => ({ key, value }))
  );
  const [steps, setSteps] = useState(initial?.steps || []);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiInput, setShowAiInput] = useState(false);

  const handleSave = () => {
    if (!name.trim() || !url.trim()) { message.warning('Name and URL are required'); return; }
    const storage = {};
    pairs.forEach(p => { if (p.key.trim()) storage[p.key.trim()] = p.value; });
    onSave({ name: name.trim(), url: url.trim(), storage, steps });
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/generate-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: aiPrompt, url: url }),
      });
      const data = await res.json();
      if (data.error) {
        message.error(t('visual.scenario.aiError'));
      } else {
        setSteps(data.steps || []);
        setShowAiInput(false);
        setAiPrompt('');
        message.success(`已生成 ${(data.steps || []).length} 个步骤`);
      }
    } catch (e) {
      message.error(t('visual.scenario.aiError'));
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className={styles.scenarioForm}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Input size="small" placeholder={t('visual.scenario.name')} value={name} onChange={e => setName(e.target.value)} />
        <Input size="small" placeholder={t('visual.scenario.url')} value={url} onChange={e => setUrl(e.target.value)} />
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('visual.scenario.storage')}</Typography.Text>
        <StorageEditor pairs={pairs} onChange={setPairs} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('visual.scenario.steps')}</Typography.Text>
          <Button size="small" type="dashed" onClick={() => setShowAiInput(v => !v)}>
            {t('visual.scenario.aiGenerate')}
          </Button>
        </div>
        {showAiInput && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Input.TextArea
              size="small"
              rows={2}
              placeholder={t('visual.scenario.aiPrompt')}
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
            />
            <Button size="small" type="primary" loading={aiLoading} onClick={handleAiGenerate}>
              {aiLoading ? t('visual.scenario.aiGenerating') : t('visual.scenario.aiGenerate')}
            </Button>
          </Space>
        )}
        <StepsEditor steps={steps} onChange={setSteps} onPickElement={onPickElement} />
        <Space>
          <Button size="small" type="primary" onClick={handleSave}>{t('visual.scenario.save')}</Button>
          <Button size="small" onClick={onCancel}>{t('visual.scenario.cancel')}</Button>
        </Space>
      </Space>
    </div>
  );
}

export default function ScenarioPanel({ compact = false, onRunScenario, scenarioProgress, onBatchRun, pinnedScenarioId, onPinScenario, isRecording, onStartRecording, onStopRecording, recordedSteps, onPickElement }) {
  const [scenarios, setScenarios] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showRecordSave, setShowRecordSave] = useState(false);
  const [pendingRecordedSteps, setPendingRecordedSteps] = useState([]);

  const handleStopAndSave = () => {
    onStopRecording?.();
    setPendingRecordedSteps(recordedSteps || []);
    setShowRecordSave(true);
    setShowAdd(false);
    setEditingId(null);
  };

  const handleSaveRecorded = async (data) => {
    await createScenario(data);
    setShowRecordSave(false);
    setPendingRecordedSteps([]);
    load();
  };

  const load = useCallback(async () => {
    try {
      const list = await getScenarios();
      setScenarios(list);
    } catch (err) {
      console.warn('Failed to load scenarios:', err);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (data) => {
    await createScenario(data);
    setShowAdd(false);
    load();
  };

  const handleEdit = async (id, data) => {
    await updateScenario(id, data);
    setEditingId(null);
    load();
  };

  const handleDelete = async (id) => {
    await deleteScenario(id);
    load();
  };

  return (
    <div className={styles.scenarioPanel}>
      <div className={styles.scenarioPanelHeader}>
        {!compact && <Typography.Text strong>{t('visual.menuScenarios')}</Typography.Text>}
        <Space size={4}>
          {!compact && scenarios.length > 0 && (
            <Button size="small" icon={<CameraOutlined />} onClick={() => onBatchRun?.(scenarios)}>
              {t('visual.scenario.batchRun')}
            </Button>
          )}
          {isRecording ? (
              <Button size="small" danger onClick={handleStopAndSave}>
                {t('visual.scenario.stopRecord')}
              </Button>
            ) : (
              <Button size="small" icon={<span style={{color:'#ff4d4f'}}>●</span>} onClick={() => { onStartRecording?.(); setShowAdd(false); setEditingId(null); }}>
                {t('visual.scenario.record')}
              </Button>
            )}
            <Button size="small" icon={<PlusOutlined />} onClick={() => { setShowAdd(v => !v); setEditingId(null); }}>
              {t('visual.scenario.add')}
            </Button>
        </Space>
      </div>

      {scenarioProgress && scenarioProgress.total > 0 && (
        <div style={{ padding: '4px 12px', fontSize: 12, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-primary)' }}>
          {t('visual.scenario.running')} {scenarioProgress.current}/{scenarioProgress.total}
        </div>
      )}

      {isRecording && (
        <div style={{ padding: '6px 12px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>
          <Typography.Text type="danger" style={{ fontSize: 12 }}>● {t('visual.scenario.recording')} ({(recordedSteps || []).length} {t('visual.scenario.steps')})</Typography.Text>
          <div style={{ maxHeight: 120, overflowY: 'auto', marginTop: 4 }}>
            {(recordedSteps || []).map((s, i) => (
              <div key={i} style={{ fontSize: 11, color: 'var(--text-muted)', padding: '1px 0' }}>
                {i + 1}. [{s.type}] {s.selector}{s.value ? ` = "${s.value}"` : ''}
              </div>
            ))}
          </div>
        </div>
      )}
      {showRecordSave && (
        <ScenarioForm
          initial={{ steps: pendingRecordedSteps }}
          onSave={handleSaveRecorded}
          onCancel={() => { setShowRecordSave(false); setPendingRecordedSteps([]); }}
          onPickElement={onPickElement}
        />
      )}
      {showAdd && (
        <ScenarioForm onSave={handleAdd} onCancel={() => setShowAdd(false)} onPickElement={onPickElement} />
      )}

      {scenarios.length === 0 && !showAdd ? (
        <div className={styles.scenarioEmpty}>
          <Typography.Text type="secondary">{t('visual.scenario.empty')}</Typography.Text>
        </div>
      ) : (
        <div className={styles.scenarioList}>
          {scenarios.map(s => {
            const isPinned = pinnedScenarioId === s.id;
            return (
              <div key={s.id} className={`${styles.scenarioItem}${isPinned ? ' ' + styles.scenarioItemPinned : ''}`}>
                {editingId === s.id ? (
                  <ScenarioForm initial={s} onSave={(data) => handleEdit(s.id, data)} onCancel={() => setEditingId(null)} onPickElement={onPickElement} />
                ) : (
                  <>
                    <div className={styles.scenarioItemInfo}>
                      <Typography.Text strong style={{ fontSize: 13 }}>{s.name}</Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 11 }}>{s.url}</Typography.Text>
                    </div>
                    <Space size={4}>
                      <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={() => onRunScenario?.(s)}>
                        {t('visual.scenario.run')}
                      </Button>
                      <Button
                        size="small"
                        icon={isPinned ? <PushpinFilled /> : <PushpinOutlined />}
                        type={isPinned ? 'primary' : 'default'}
                        onClick={() => onPinScenario?.(s)}
                        title={isPinned ? t('visual.scenario.unpin') : t('visual.scenario.pin')}
                      />
                      <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingId(s.id); setShowAdd(false); }}>
                        {t('visual.scenario.edit')}
                      </Button>
                      <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(s.id)}>
                        {t('visual.scenario.delete')}
                      </Button>
                    </Space>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
