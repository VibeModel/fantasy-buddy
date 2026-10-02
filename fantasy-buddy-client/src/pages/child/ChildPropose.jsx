import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneFrame, TopBar, BottomNav } from '../../components/Layout.jsx';
import { useToast } from '../../components/Toast.jsx';
import { CATEGORY_ORDER, categoryMeta, materialMeta } from '../../constants/meta.js';
import { api } from '../../api.js';

const REWARD_FIELDS = [
  { key: 'exp', label: '经验值', icon: '⭐' },
  { key: 'fire_fruit', label: '火焰果', icon: '🍖' },
  { key: 'magic_ball', label: '魔法球', icon: '🎾' },
  { key: 'bubble_lotion', label: '泡泡液', icon: '🧴' }
];

function Stepper({ value, onChange, min = 0, max = 99 }) {
  return (
    <div className="row" style={{ gap: 8 }}>
      <button className="btn btn--sm btn--ghost" onClick={() => onChange(Math.max(min, value - 1))}>
        −
      </button>
      <span style={{ width: 32, textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
        {value}
      </span>
      <button className="btn btn--sm btn--ghost" onClick={() => onChange(Math.min(max, value + 1))}>
        ＋
      </button>
    </div>
  );
}

export default function ChildPropose() {
  const navigate = useNavigate();
  const toast = useToast();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('study');
  const [description, setDescription] = useState('');
  const [rewards, setRewards] = useState({ exp: 10, fire_fruit: 1, magic_ball: 0, bubble_lotion: 0 });
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!name.trim()) return toast('先给任务起个名字吧~', 'error');
    setSubmitting(true);
    try {
      await api.proposeTask({
        name: name.trim(),
        category,
        description: description.trim(),
        rewards
      });
      toast('已经告诉爸爸妈妈啦，等 TA 同意就能做~', 'success');
      navigate('/child', { replace: true });
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PhoneFrame>
      <TopBar title="✨ 我想领个新任务" onBack="/child" />
      <div className="screen screen--with-nav">
        <div className="card">
          <div className="muted">
            想一想：今天你想完成一件什么事，做完能让宝宝（小伙伴）得到什么奖励？
            写好交给爸爸妈妈，TA 同意了就能去做啦~
          </div>
        </div>

        <div className="section-title">📝 任务内容</div>
        <div className="card">
          <div className="field">
            <label className="field__label">任务名字</label>
            <input
              className="input"
              placeholder="例如：自己整理书包"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={20}
            />
          </div>
          <div className="field">
            <label className="field__label">想对爸妈说（选填）</label>
            <textarea
              className="textarea"
              placeholder="比如：我会很认真地做！"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              maxLength={80}
            />
          </div>
        </div>

        <div className="section-title">🏷️ 任务类型</div>
        <div className="card">
          <div className="chip-row">
            {CATEGORY_ORDER.map(cat => {
              const m = categoryMeta(cat);
              const active = category === cat;
              return (
                <button
                  key={cat}
                  className={`chip ${active ? 'chip--active' : ''}`}
                  onClick={() => setCategory(cat)}
                >
                  {m.icon} {m.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="section-title">🎁 希望得到的奖励</div>
        <div className="card">
          <div className="muted mt-8 mb-12">完成后宝宝能拿到的奖励，爸爸妈妈会看情况确认~</div>
          {REWARD_FIELDS.map(f => (
            <div key={f.key} className="row row--between mt-12">
              <span>
                {f.icon} {f.label}
              </span>
              <Stepper value={rewards[f.key] || 0} onChange={v => setRewards(s => ({ ...s, [f.key]: v }))} />
            </div>
          ))}
        </div>

        <button className="btn btn--primary btn--block mt-16" disabled={submitting || !name.trim()} onClick={submit}>
          {submitting ? '提交中...' : '📨 交给爸爸妈妈'}
        </button>
      </div>
      <BottomNav role="child" />
    </PhoneFrame>
  );
}
