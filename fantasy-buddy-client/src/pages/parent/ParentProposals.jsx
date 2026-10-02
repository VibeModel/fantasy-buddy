import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneFrame, TopBar, BottomNav } from '../../components/Layout.jsx';
import { Loading, Empty, Notice } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { categoryMeta, rewardEntries } from '../../constants/meta.js';
import { api } from '../../api.js';

const REWARD_FIELDS = [
  { key: 'exp', label: '经验值', icon: '⭐' },
  { key: 'fire_fruit', label: '火焰果', icon: '🍖' },
  { key: 'magic_ball', label: '魔法球', icon: '🎾' },
  { key: 'bubble_lotion', label: '泡泡液', icon: '🧴' }
];

function RewardStepper({ rewards, onChange }) {
  return (
    <div>
      {REWARD_FIELDS.map(f => (
        <div key={f.key} className="row row--between mt-12">
          <span>
            {f.icon} {f.label}
          </span>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn--sm btn--ghost" onClick={() => onChange(s => ({ ...s, [f.key]: Math.max(0, (s[f.key] || 0) - 1) }))}>
              −
            </button>
            <span style={{ width: 32, textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              {rewards[f.key] || 0}
            </span>
            <button className="btn btn--sm btn--ghost" onClick={() => onChange(s => ({ ...s, [f.key]: Math.min(99, (s[f.key] || 0) + 1) }))}>
              ＋
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ParentProposals() {
  const navigate = useNavigate();
  const toast = useToast();

  const [list, setList] = useState(null);
  const [editing, setEditing] = useState(null); // { task, rewards, reason, busy, mode }
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.proposals();
      setList(res.tasks);
    } catch (err) {
      toast(err.message, 'error');
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openApprove = task => setEditing({ task, mode: 'approve', rewards: { ...task.rewards }, reason: '', busy: false });
  const openReject = task => setEditing({ task, mode: 'reject', rewards: { ...task.rewards }, reason: '', busy: false });

  const doApprove = async () => {
    if (!editing) return;
    setEditing(e => ({ ...e, busy: true }));
    try {
      await api.decideProposal(editing.task.task_id, { action: 'approve', rewards: editing.rewards });
      toast('已同意，任务已加入孩子今日清单', 'success');
      setEditing(null);
      await load();
    } catch (err) {
      toast(err.message, 'error');
      setEditing(e => ({ ...e, busy: false }));
    }
  };

  const doReject = async () => {
    if (!editing) return;
    setEditing(e => ({ ...e, busy: true }));
    try {
      await api.decideProposal(editing.task.task_id, { action: 'reject', reject_reason: rejectReason.trim() });
      toast('已拒绝该提议', 'success');
      setEditing(null);
      setRejectReason('');
      await load();
    } catch (err) {
      toast(err.message, 'error');
      setEditing(e => ({ ...e, busy: false }));
    }
  };

  if (list === null) {
    return (
      <PhoneFrame>
        <TopBar title="📝 孩子提议的任务" onBack="/parent" />
        <div className="screen">
          <Loading />
        </div>
        <BottomNav role="parent" />
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <TopBar title="📝 孩子提议的任务" onBack="/parent" />
      <div className="screen screen--with-nav">
        {list.length === 0 ? (
          <Empty icon="💡" text="孩子还没有提议新任务" />
        ) : (
          list.map(t => {
            const cat = categoryMeta(t.category);
            return (
              <div key={t.task_id} className="card">
                <div className="row row--between">
                  <strong>
                    {cat.icon} {t.name}
                  </strong>
                  <span className="muted">{t.child_name}</span>
                </div>
                {t.description && <div className="muted mt-8" style={{ fontSize: 13 }}>{t.description}</div>}
                <div className="task-card__rewards mt-12">
                  {rewardEntries(t.rewards).map(r => (
                    <span key={r.type} className="pill">
                      {r.icon} {r.name} x{r.qty}
                    </span>
                  ))}
                </div>
                <div className="row mt-12" style={{ gap: 8 }}>
                  <button className="btn btn--success btn--block" onClick={() => openApprove(t)}>
                    ✅ 同意
                  </button>
                  <button className="btn btn--danger btn--block" onClick={() => openReject(t)}>
                    ❌ 拒绝
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {editing && editing.mode === 'approve' && (
        <div className="modal-mask" onClick={() => !editing.busy && setEditing(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__title">确认奖励并发给 {editing.task.child_name}</div>
            <div className="muted">任务「{editing.task.name}」通过后，会进入孩子今日清单，TA 完成后即可领取：</div>
            <div className="card mt-12">
              <RewardStepper
                rewards={editing.rewards}
                onChange={updater => setEditing(e => ({ ...e, rewards: updater(e.rewards) }))}
              />
            </div>
            <div className="row mt-16" style={{ gap: 8 }}>
              <button className="btn btn--ghost btn--block" disabled={editing.busy} onClick={() => setEditing(null)}>
                取消
              </button>
              <button className="btn btn--success btn--block" disabled={editing.busy} onClick={doApprove}>
                {editing.busy ? '处理中...' : '✅ 同意并发放'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && editing.mode === 'reject' && (
        <div className="modal-mask" onClick={() => !editing.busy && setEditing(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__title">拒绝「{editing.task.name}」</div>
            <div className="field mt-12">
              <label className="field__label">告诉孩子的原因（选填）</label>
              <textarea
                className="textarea"
                rows={2}
                placeholder="比如：这个先和爸爸商量一下~"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />
            </div>
            <div className="row mt-16" style={{ gap: 8 }}>
              <button className="btn btn--ghost btn--block" disabled={editing.busy} onClick={() => setEditing(null)}>
                取消
              </button>
              <button className="btn btn--danger btn--block" disabled={editing.busy} onClick={doReject}>
                {editing.busy ? '处理中...' : '❌ 拒绝'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav role="parent" />
    </PhoneFrame>
  );
}
