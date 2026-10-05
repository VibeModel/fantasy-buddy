import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneFrame, TopBar } from '../../components/Layout.jsx';
import { useToast } from '../../components/Toast.jsx';
import { CREATURE_META } from '../../constants/meta.js';
import { api } from '../../api.js';

const TYPES = ['dragon', 'unicorn', 'turtle', 'butterfly', 'lion'];

export default function ChildSetup() {
  const navigate = useNavigate();
  const toast = useToast();

  const [type, setType] = useState('dragon');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const meta = CREATURE_META[type];

  const submit = async () => {
    const clean = name.trim();
    if (!clean) return toast('请给小伙伴起个名字', 'error');
    setSaving(true);
    try {
      await api.createCreature({ creature_type: type, name: clean });
      toast('小伙伴诞生啦！', 'success');
      navigate('/child', { replace: true });
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PhoneFrame>
      <TopBar title="选择你的小伙伴" />
      <div className="screen">
        <div className="center muted">挑一只喜欢的，再给它起个名字吧~</div>
        <div className="center muted" style={{ fontSize: 13 }}>🥚 每个小伙伴都会从一颗蛋开始孵化哦</div>

        <div className="creature-hero">
          <span className="creature-hero__emoji">{meta.icon}</span>
          <div className="creature-name">{name.trim() || meta.name}</div>
        </div>

        <div className="section-title">🐾 选择种类</div>
        <div className="action-grid">
          {TYPES.map(t => {
            const m = CREATURE_META[t];
            const active = t === type;
            return (
              <button
                key={t}
                className="action-tile"
                style={active ? { outline: '2px solid var(--c-primary)' } : undefined}
                onClick={() => setType(t)}
              >
                <div className="action-tile__icon">{m.icon}</div>
                <div className="action-tile__label">{m.name}</div>
              </button>
            );
          })}
        </div>

        <div className="card mt-16">
          <label className="field__label">✏️ 给它起个名字</label>
          <input
            className="input"
            placeholder="最多 12 个字"
            value={name}
            maxLength={12}
            onChange={e => setName(e.target.value)}
          />
          <button className="btn btn--primary btn--block mt-16" disabled={saving || !name.trim()} onClick={submit}>
            {saving ? '创建中...' : '✨ 就是它了！'}
          </button>
        </div>
      </div>
    </PhoneFrame>
  );
}
