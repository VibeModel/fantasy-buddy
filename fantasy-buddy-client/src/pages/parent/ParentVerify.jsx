import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PhoneFrame, TopBar } from '../../components/Layout.jsx';
import { Loading, Notice, CodeInput } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { categoryMeta, rewardEntries } from '../../constants/meta.js';
import { useCountdown } from '../../hooks/useCountdown.js';
import { api } from '../../api.js';

function fmt(seconds) {
  if (seconds <= 0) return '已过期';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}分${String(s).padStart(2, '0')}秒`;
}

export default function ParentVerify() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [task, setTask] = useState(null);
  const [verifyMode, setVerifyMode] = useState('strict');
  const [hasApprovalPin, setHasApprovalPin] = useState(false);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expiresAt, setExpiresAt] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [res, settings] = await Promise.all([
          api.pendingTasks(),
          api.getSettings().catch(() => null)
        ]);
        if (settings?.settings?.verify_mode) setVerifyMode(settings.settings.verify_mode);
        if (settings) setHasApprovalPin(!!settings.has_approval_pin);
        const found = res.tasks.find(t => t.task_id === taskId);
        setTask(found || null);
        if (found) {
          setExpiresAt(new Date(found.expires_at).getTime());
        }
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [taskId, toast]);

  const strict = verifyMode === 'strict';
  const pinMode = verifyMode === 'pin';
  const remaining = useCountdown(expiresAt, strict);

  const approve = async () => {
    setSubmitting(true);
    try {
      const payload = { action: 'approve' };
      if (strict) payload.code = code;
      else if (pinMode) payload.approval_pin = pin;
      await api.verifyTask(taskId, payload);
      toast('验证成功，奖励已发放', 'success');
      navigate('/parent', { replace: true });
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const reject = async () => {
    setSubmitting(true);
    try {
      await api.verifyTask(taskId, { action: 'reject', reject_reason: reason || '家长未通过' });
      toast('已拒绝该任务', 'info');
      navigate('/parent', { replace: true });
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PhoneFrame>
        <TopBar title="验证任务" onBack="/parent" />
        <div className="screen">
          <Loading />
        </div>
      </PhoneFrame>
    );
  }

  if (!task) {
    return (
      <PhoneFrame>
        <TopBar title="验证任务" onBack="/parent" />
        <div className="screen">
          <Notice type="warn">该任务已不在待验证列表中（可能已被处理或过期）</Notice>
          <button className="btn btn--primary btn--block mt-16" onClick={() => navigate('/parent')}>
            返回控制台
          </button>
        </div>
      </PhoneFrame>
    );
  }

  const cat = categoryMeta(task.category);
  const rewards = rewardEntries(task.rewards);

  return (
    <PhoneFrame>
      <TopBar title="🔐 验证任务" onBack="/parent" />
      <div className="screen">
        <div className="card">
          <strong>👦 {task.child_name}</strong>
          <div className="divider" />
          <div className="row" style={{ gap: 6 }}>
            <span>{cat.icon}</span>
            <span>任务：{task.task_name}</span>
          </div>
          {task.task_description && (
            <div className="muted mt-8" style={{ fontSize: 13 }}>
              描述：{task.task_description}
            </div>
          )}
          {task.child_notes && (
            <div className="muted mt-8" style={{ fontSize: 13 }}>
              孩子备注：「{task.child_notes}」
            </div>
          )}
          {task.evidence_url && (
            <div className="mt-12">
              <div className="muted" style={{ fontSize: 13 }}>
                📷 完成证据：
              </div>
              <img
                src={task.evidence_url}
                alt="完成证据"
                style={{ maxWidth: '100%', borderRadius: 12, marginTop: 6 }}
              />
            </div>
          )}
        </div>

        {rewards.length > 0 && (
          <div className="card">
            <strong>🎁 奖励预览</strong>
            <div className="col mt-8">
              {rewards.map(r => (
                <div key={r.type} className="row row--between">
                  <span>
                    {r.icon} {r.name}
                  </span>
                  <span className="pill">x{r.qty}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {strict ? (
          <div className="card">
            <div className="center">
              <div className="muted">🔐 请输入验证码</div>
            </div>
            <div className="mt-12">
              <CodeInput value={code} onChange={setCode} length={6} />
            </div>
            <div className="center mt-12 muted">
              验证码有效期：{remaining === null ? '—' : fmt(remaining)}
            </div>
            <div className="center mt-8 muted" style={{ fontSize: 12 }}>
              孩子端显示的验证码：{task.verification_code}
            </div>
          </div>
        ) : pinMode ? (
          hasApprovalPin ? (
            <div className="card">
              <div className="center">
                <div className="muted">🔑 请输入家长的审批密码</div>
              </div>
              <div className="mt-12">
                <CodeInput value={pin} onChange={setPin} length={6} />
              </div>
            </div>
          ) : (
            <div className="card">
              <Notice type="warn">你还没有设置审批密码，请先去设置。</Notice>
              <button className="btn btn--primary btn--block mt-12" onClick={() => navigate('/parent/settings')}>
                去设置审批密码
              </button>
            </div>
          )
        ) : (
          <div className="card">
            <Notice type="info">当前为「普通模式」，无需验证码，家长确认即可发放奖励。</Notice>
          </div>
        )}

        {!rejecting ? (
          <>
            <button
              className="btn btn--success btn--block mt-16"
              disabled={submitting || (strict && code.length < 6) || (pinMode && (!hasApprovalPin || pin.length < 6))}
              onClick={approve}
            >
              ✅ 确认完成任务
            </button>
            <button className="btn btn--danger btn--block mt-12" onClick={() => setRejecting(true)}>
              ❌ 任务未完成，拒绝
            </button>
          </>
        ) : (
          <div className="card">
            <label className="field__label">拒绝原因</label>
            <textarea
              className="textarea"
              placeholder="例如：任务没有认真完成"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
            <div className="row mt-12">
              <button className="btn btn--ghost grow" onClick={() => setRejecting(false)}>
                取消
              </button>
              <button className="btn btn--danger grow" disabled={submitting} onClick={reject}>
                确认拒绝
              </button>
            </div>
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}
