import React, { useState, useEffect, useCallback } from 'react';
import { Button, Input, Space, Typography, message } from 'antd';
import { PlusOutlined, DeleteOutlined, PlayCircleOutlined, EditOutlined, MinusCircleOutlined, CameraOutlined, PushpinOutlined, PushpinFilled } from '@ant-design/icons';
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

function StepsEditor({ steps, onChange }) {
  const addStep = () => onChange([...steps, { type: 'click', selector: '' }]);
  const removeStep = (i) => onChange(steps.filter((_, idx) => idx !== i));
  const updateStep = (i, field, val) => {
    const next = steps.map((s, idx) => idx === i ? { ...s, [field]: val } : s);
    onChange(next);
  };
  return (
    <div>
      {steps.map((s, i) => (
        <Space key={i} style={{ display: 'flex', marginBottom: 4, alignItems: 'center' }}>
          <select
            value={s.type}
            onChange={e => updateStep(i, 'type', e.target.value)}
            style={{ fontSize: 12, padding: '1px 4px', height: 24 }}
          >
            <option value="click">{t('visual.scenario.stepClick')}</option>
            <option value="wait">{t('visual.scenario.stepWait')}</option>
            <option value="fill">{t('visual.scenario.stepFill')}</option>
          </select>
          {s.type === 'wait' ? (
            <Input size="small" type="number" placeholder={t('visual.scenario.stepMs')} value={s.ms || ''} onChange={e => updateStep(i, 'ms', Number(e.target.value))} style={{ width: 80 }} />
          ) : (
            <Input size="small" placeholder={t('visual.scenario.stepSelector')} value={s.selector || ''} onChange={e => updateStep(i, 'selector', e.target.value)} style={{ width: 140 }} />
          )}
          {s.type === 'fill' && (
            <Input size="small" placeholder={t('visual.scenario.stepValue')} value={s.value || ''} onChange={e => updateStep(i, 'value', e.target.value)} style={{ width: 100 }} />
          )}
          <MinusCircleOutlined onClick={() => removeStep(i)} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} />
        </Space>
      ))}
      <Button size="small" icon={<PlusOutlined />} onClick={addStep} type="dashed" style={{ marginTop: 4 }}>
        {t('visual.scenario.steps')}
      </Button>
    </div>
  );
}

function ScenarioForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || '');
  const [url, setUrl] = useState(initial?.url || '');
  const [pairs, setPairs] = useState(
    Object.entries(initial?.storage || {}).map(([key, value]) => ({ key, value }))
  );
  const [steps, setSteps] = useState(initial?.steps || []);

  const handleSave = () => {
    if (!name.trim() || !url.trim()) { message.warning('Name and URL are required'); return; }
    const storage = {};
    pairs.forEach(p => { if (p.key.trim()) storage[p.key.trim()] = p.value; });
    onSave({ name: name.trim(), url: url.trim(), storage, steps });
  };

  return (
    <div className={styles.scenarioForm}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Input size="small" placeholder={t('visual.scenario.name')} value={name} onChange={e => setName(e.target.value)} />
        <Input size="small" placeholder={t('visual.scenario.url')} value={url} onChange={e => setUrl(e.target.value)} />
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('visual.scenario.storage')}</Typography.Text>
        <StorageEditor pairs={pairs} onChange={setPairs} />
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('visual.scenario.steps')}</Typography.Text>
        <StepsEditor steps={steps} onChange={setSteps} />
        <Space>
          <Button size="small" type="primary" onClick={handleSave}>{t('visual.scenario.save')}</Button>
          <Button size="small" onClick={onCancel}>{t('visual.scenario.cancel')}</Button>
        </Space>
      </Space>
    </div>
  );
}

export default function ScenarioPanel({ onRunScenario, scenarioProgress, onBatchRun, pinnedScenarioId, onPinScenario }) {
  const [scenarios, setScenarios] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);

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
        <Typography.Text strong>{t('visual.menuScenarios')}</Typography.Text>
        <Space size={4}>
          {scenarios.length > 0 && (
            <Button size="small" icon={<CameraOutlined />} onClick={() => onBatchRun?.(scenarios)}>
              {t('visual.scenario.batchRun')}
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

      {showAdd && (
        <ScenarioForm onSave={handleAdd} onCancel={() => setShowAdd(false)} />
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
                  <ScenarioForm initial={s} onSave={(data) => handleEdit(s.id, data)} onCancel={() => setEditingId(null)} />
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
