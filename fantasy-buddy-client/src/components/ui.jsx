import { useRef } from 'react';
import { categoryMeta, rewardEntries, TASK_STATUS_LABEL } from '../constants/meta.js';

export function Loading({ text = '加载中...' }) {
  return (
    <div className="loading">
      <div className="spinner" />
      {text}
    </div>
  );
}

export function Empty({ icon = '📭', text = '暂无内容' }) {
  return (
    <div className="empty">
      <span className="empty__icon">{icon}</span>
      {text}
    </div>
  );
}

export function Notice({ type = 'info', children }) {
  const icon = { info: 'ℹ️', warn: '⚠️', error: '⛔', success: '✅' }[type] || 'ℹ️';
  return (
    <div className={`notice notice--${type}`}>
      <span>{icon}</span>
      <div className="grow">{children}</div>
    </div>
  );
}

export function AttrBar({ icon, label, value, tone = 'success' }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="attr-row">
      <span className="attr-row__label">
        {icon} {label}
      </span>
      <div className="bar grow">
        <div className={`bar__fill bar__fill--${tone}`} style={{ width: `${v}%` }} />
      </div>
      <span className="attr-row__value">{v}</span>
    </div>
  );
}

const STATUS_PILL = {
  pending: { cls: 'pill--info', text: '📌 待开始' },
  proposed: { cls: 'pill--info', text: '💡 等爸妈同意' },
  awaiting_verification: { cls: 'pill--warning', text: '⏳ 待爸妈验证' },
  verified: { cls: 'pill--success', text: '✅ 已通过' },
  rejected: { cls: 'pill--danger', text: '❌ 未通过' }
};

export function TaskCard({ task, onComplete, onOpen, onClaim }) {
  const cat = categoryMeta(task.category);
  const pill = STATUS_PILL[task.status] || { cls: '', text: TASK_STATUS_LABEL[task.status] || task.status };
  const rewards = rewardEntries(task.rewards);

  return (
    <div className="task-card" onClick={onOpen} style={onOpen ? { cursor: 'pointer' } : undefined}>
      <div className="row row--between">
        <div className="task-card__name">
          {cat.icon} {task.name}
        </div>
        <span className={`pill ${pill.cls}`}>{pill.text}</span>
      </div>

      {task.description && <div className="task-card__desc">{task.description}</div>}

      <div className="task-card__rewards">
        {rewards.map(r => (
          <span key={r.type} className="pill">
            {r.icon} {r.name} x{r.qty}
          </span>
        ))}
      </div>

      {task.status === 'pending' && onComplete && (
        <button className="btn btn--primary btn--block mt-12" onClick={e => { e.stopPropagation(); onComplete(task); }}>
          🎯 我完成了！
        </button>
      )}

      {task.status === 'awaiting_verification' && (
        <div className="notice notice--warn mt-12">⏳ 等待爸妈输入验证码中...</div>
      )}

      {task.status === 'verified' && task.can_claim && onClaim && (
        <button className="btn btn--success btn--block mt-12" onClick={e => { e.stopPropagation(); onClaim(task); }}>
          🎁 领取奖励
        </button>
      )}
    </div>
  );
}

export function LevelBadge({ stage, level }) {
  const stageLabel = { egg: '蛋', baby: '幼崽', adult: '成体', legendary: '传说' }[stage] || stage;
  return (
    <span className="badge-level">
      Lv.{level} {stageLabel}
    </span>
  );
}

export function CodeInput({ value, onChange, length = 6 }) {
  const refs = useRef([]);
  const chars = value.padEnd(length, ' ').slice(0, length).split('');

  const handleChange = (idx, raw) => {
    const digit = raw.replace(/\D/g, '').slice(-1);
    if (!digit) return;
    const arr = value.padEnd(length, ' ').split('');
    arr[idx] = digit;
    onChange(arr.join('').replace(/\s+$/, ''));
    if (idx < length - 1) refs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const arr = value.padEnd(length, ' ').split('');
      if (arr[idx] && arr[idx] !== ' ') {
        arr[idx] = ' ';
      } else if (idx > 0) {
        arr[idx - 1] = ' ';
        refs.current[idx - 1]?.focus();
      }
      onChange(arr.join('').replace(/\s+$/, ''));
    }
  };

  return (
    <div className="code-box">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={el => (refs.current[i] = el)}
          className="code-input"
          inputMode="numeric"
          maxLength={1}
          value={chars[i]?.trim() || ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onFocus={e => e.target.select()}
        />
      ))}
    </div>
  );
}
