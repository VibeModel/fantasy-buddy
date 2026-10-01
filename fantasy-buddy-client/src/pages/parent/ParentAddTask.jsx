import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneFrame, TopBar, BottomNav } from '../../components/Layout.jsx';
import { Loading, Notice } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { CATEGORY_ORDER, categoryMeta } from '../../constants/meta.js';
import { api } from '../../api.js';

const REWARD_FIELDS = [
  { key: 'fire_fruit', label: '火焰果', icon: '🍖' },
  { key: 'magic_ball', label: '魔法球', icon: '🎾' },
  { key: 'bubble_lotion', label: '泡泡液', icon: '🧴' },
  { key: 'exp', label: '经验值', icon: '⭐' }
];

const DIFFICULTIES = [
  { id: 'easy', label: '⭐ 简单' },
  { id: 'medium', label: '⭐⭐ 中等' },
  { id: 'hard', label: '⭐⭐⭐ 困难' },
  { id: 'challenge', label: '⭐⭐⭐⭐ 挑战' }
];

function Stepper({ value, onChange, min = 0, max = 99 }) {
  return (
    <div className="row" style={{ gap: 8 }}>
      <button className="btn btn--sm btn--ghost" onClick={() => onChange(Math.max(min, value - 1))}>
        −
      </button>
      <span style={{ width: 32, textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{value}</span>
      <button className="btn btn--sm btn--ghost" onClick={() => onChange(Math.min(max, value + 1))}>
        ＋
      </button>
    </div>
  );
}

export default function ParentAddTask() {
  const navigate = useNavigate();
  const toast = useToast();

  const [children, setChildren] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [childId, setChildId] = useState('');
  const [category, setCategory] = useState('study');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [rewards, setRewards] = useState({ fire_fruit: 1, magic_ball: 0, bubble_lotion: 0, exp: 10 });
  const [warnings, setWarnings] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [c, t] = await Promise.all([api.parentChildren(), api.taskTemplates()]);
        setChildren(c.children);
        setTemplates(t.categories);
        if (c.children[0]) setChildId(c.children[0].child_id);
      } catch (err) {
        toast(err.message, 'error');
      }
    })();
  }, [toast]);

  const currentTemplates = useMemo(
    () => templates.find(t => t.category_id === category)?.templates || [],
    [templates, category]
  );

  const applyTemplate = tpl => {
    setName(tpl.name);
    setDescription(tpl.description);
    setDifficulty(tpl.difficulty || 'medium');
    setRewards({
      fire_fruit: tpl.default_rewards?.fire_fruit || 0,
      magic_ball: tpl.default_rewards?.magic_ball || 0,
      bubble_lotion: tpl.default_rewards?.bubble_lotion || 0,
      exp: tpl.default_rewards?.exp || 0
    });
  };

  const save = async () => {
    if (!childId) return toast('请先添加孩子账号', 'error');
    if (!name.trim()) return toast('请输入任务名称', 'error');
    setSaving(true);
    setWarnings(null);
    try {
      const res = await api.addTask({
        child_id: childId,
        name: name.trim(),
        description: description.trim(),
        category,
        difficulty,
        rewards
      });
      toast('任务已添加', 'success');
      setWarnings(res.health_warnings || []);
      setName('');
      setDescription('');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!children) {
    return (
      <PhoneFrame>
        <TopBar title="添加任务" onBack="/parent" />
        <div className="screen">
          <Loading />
        </div>
        <BottomNav role="parent" />
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <TopBar title="📝 添加任务" onBack="/parent" />
      <div className="screen screen--with-nav">
        {children.length === 0 ? (
          <Notice type="warn">请先在控制台添加孩子账号</Notice>
        ) : (
          <>
            <div className="card">
              <label className="field__label">👶 选择孩子</label>
              <select className="select" value={childId} onChange={e => setChildId(e.target.value)}>
                {children.map(c => (
                  <option key={c.child_id} value={c.child_id}>
                    {c.nickname}
                  </option>
                ))}
              </select>
            </div>

            <div className="card">
              <label className="field__label">📂 任务类型</label>
              <div className="row wrap" style={{ gap: 8 }}>
                {CATEGORY_ORDER.map(c => {
                  const meta = categoryMeta(c);
                  return (
                    <button
                      key={c}
                      className={`btn btn--sm ${category === c ? 'btn--primary' : 'btn--ghost'}`}
                      onClick={() => setCategory(c)}
                    >
                      {meta.icon} {meta.name.replace('任务', '')}
                    </button>
                  );
                })}
              </div>

              {currentTemplates.length > 0 && (
                <>
                  <label className="field__label mt-16">⚡ 快速模板</label>
                  <div className="row wrap" style={{ gap: 8 }}>
                    {currentTemplates.map(tpl => (
                      <button key={tpl.template_id} className="btn btn--sm btn--ghost" onClick={() => applyTemplate(tpl)}>
                        {tpl.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="card">
              <label className="field__label">✏️ 任务名称</label>
              <input className="input" placeholder="输入任务名称..." value={name} onChange={e => setName(e.target.value)} />

              <div className="field">
                <label className="field__label">📋 任务描述</label>
                <textarea
                  className="textarea"
                  placeholder="详细描述任务，例如：认真完成语文练习册P20-22"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              <div className="field">
                <label className="field__label">🎯 难度</label>
                <div className="row wrap" style={{ gap: 8 }}>
                  {DIFFICULTIES.map(d => (
                    <button
                      key={d.id}
                      className={`btn btn--sm ${difficulty === d.id ? 'btn--primary' : 'btn--ghost'}`}
                      onClick={() => setDifficulty(d.id)}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <label className="field__label">🎁 奖励设置</label>
              {REWARD_FIELDS.map(f => (
                <div key={f.key} className="row row--between mt-12">
                  <span>
                    {f.icon} {f.label}
                  </span>
                  <Stepper value={rewards[f.key]} onChange={v => setRewards({ ...rewards, [f.key]: v })} />
                </div>
              ))}
            </div>

            {warnings && (
              <div className="mt-16">
                {warnings.length === 0 ? (
                  <Notice type="success">任务已添加，任务结构符合健康要求 👍</Notice>
                ) : (
                  <Notice type="warn">
                    <div style={{ fontWeight: 700 }}>❗ 系统提示</div>
                    {warnings.map((w, i) => (
                      <div key={i}>{w}</div>
                    ))}
                  </Notice>
                )}
              </div>
            )}

            <button className="btn btn--primary btn--block mt-16" disabled={saving} onClick={save}>
              {saving ? '保存中...' : '💾 保存任务'}
            </button>
          </>
        )}
      </div>
      <BottomNav role="parent" />
    </PhoneFrame>
  );
}
