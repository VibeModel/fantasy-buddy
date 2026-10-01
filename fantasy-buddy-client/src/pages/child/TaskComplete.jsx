import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { PhoneFrame, TopBar } from '../../components/Layout.jsx';
import { Notice } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { rewardEntries } from '../../constants/meta.js';
import { useCountdown } from '../../hooks/useCountdown.js';
import { api } from '../../api.js';

function fmt(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function TaskComplete() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [code, setCode] = useState(location.state?.code || '');
  const [rewards] = useState(location.state?.rewards || {});
  const [taskName] = useState(location.state?.taskName || '任务');
  const [verifyMode, setVerifyMode] = useState(location.state?.verifyMode || 'strict');
  const [expiresAt, setExpiresAt] = useState(() => {
    const iso = location.state?.codeExpiresAt;
    return iso ? new Date(iso).getTime() : null;
  });
  const [status, setStatus] = useState('pending');
  const [rejectReason, setRejectReason] = useState('');
  const [resending, setResending] = useState(false);

  // 轮询验证状态
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const res = await api.verificationStatus(taskId);
        if (!alive) return;
        setStatus(res.status);
        if (res.verification_mode) setVerifyMode(res.verification_mode);
        if (res.expires_at) setExpiresAt(new Date(res.expires_at).getTime());
        if (res.reject_reason) setRejectReason(res.reject_reason);
      } catch {
        /* 忽略轮询错误 */
      }
    };
    poll();
    const timer = setInterval(() => {
      if (status === 'pending' || status === 'expired') poll();
    }, 3000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [taskId, status]);

  const resend = async () => {
    setResending(true);
    try {
      const res = await api.resendCode(taskId);
      setCode(res.code);
      if (res.expires_at) setExpiresAt(new Date(res.expires_at).getTime());
      setStatus('pending');
      toast('新验证码已生成，请告诉爸爸妈妈', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setResending(false);
    }
  };

  const rewardList = rewardEntries(rewards);
  const digits = code ? code.split('') : [];
  const strict = verifyMode === 'strict';
  const remaining = useCountdown(expiresAt, status === 'pending' || status === 'expired');
  const expired = status === 'expired' || (remaining !== null && remaining <= 0);

  return (
    <PhoneFrame>
      <TopBar title="完成任务" onBack="/child/tasks" />
      <div className="screen">
        <div className="center mt-8">
          <div style={{ fontSize: 34, fontWeight: 800 }}>✨ 太棒了！✨</div>
          <div className="muted mt-8">你完成了「{taskName}」</div>
        </div>

        {rewardList.length > 0 && (
          <div className="card mt-16">
            <strong>🎉 奖励预览</strong>
            <div className="col mt-12">
              {rewardList.map(r => (
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

        {status === 'verified' ? (
          <div className="card mt-16 reward-pop">
            <div className="center">
              <div style={{ fontSize: 40 }}>🎊</div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>
                {strict ? '爸爸妈妈验证通过啦！' : '爸爸妈妈确认完成啦！'}
              </div>
              <button
                className="btn btn--success btn--block mt-16"
                onClick={() => navigate(`/child/reward/${taskId}`)}
              >
                🎁 去领取奖励
              </button>
            </div>
          </div>
        ) : status === 'rejected' ? (
          <div className="card mt-16">
            <Notice type="error">这次没有通过验证：{rejectReason || '家长未通过'}</Notice>
            <button className="btn btn--ghost btn--block mt-16" onClick={() => navigate('/child/tasks')}>
              返回任务列表
            </button>
          </div>
        ) : !strict ? (
          <div className="card mt-16">
            <div className="center">
              <div style={{ fontSize: 36 }}>📨</div>
              <div style={{ fontWeight: 700 }}>已提交，等待爸爸妈妈确认</div>
              <div className="muted mt-8" style={{ fontSize: 13 }}>
                不用验证码，爸爸妈妈确认后你就能领取奖励啦~
              </div>
            </div>
          </div>
        ) : (
          <div className="card mt-16">
            <div className="center muted">📨 请告诉爸爸妈妈</div>

            <div className="code-box mt-16">
              {digits.length > 0 ? (
                digits.map((d, i) => (
                  <div key={i} className="code-box__cell">
                    {d}
                  </div>
                ))
              ) : (
                <div className="muted">验证码已隐藏，请点击下方重新获取</div>
              )}
            </div>

            {remaining !== null && (
              <div className="center mt-12 muted">⏱ {expired ? '已过期' : `${fmt(remaining)} 后过期`}</div>
            )}

            <div className="mt-12">
              <Notice type="warn">
                {expired
                  ? '验证码已过期，点下面的按钮重新获取，再告诉爸爸妈妈~'
                  : '让爸爸妈妈在家长端输入上面的验证码，就能发放奖励啦~'}
              </Notice>
            </div>

            <button className="btn btn--ghost btn--block mt-16" disabled={resending} onClick={resend}>
              {resending ? '生成中...' : '🔄 重新获取验证码'}
            </button>
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}
