import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PhoneFrame, TopBar } from '../../components/Layout.jsx';
import { Loading, Notice, CodeInput } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { api, DATA_SOURCE } from '../../api.js';
import { useParentGate } from '../../parentGate.jsx';

export default function ParentUnlock() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { unlocked, unlock, unlockSkipped } = useParentGate();

  const from = location.state?.from || '/parent';

  const [loading, setLoading] = useState(true);
  const [hasPin, setHasPin] = useState(false);
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const s = await api.getSettings();
        setHasPin(!!s.has_approval_pin);
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  useEffect(() => {
    // 服务端模式不做门禁，直接进入
    if (DATA_SOURCE === 'server') navigate(from, { replace: true });
  }, [from, navigate]);

  useEffect(() => {
    if (!loading && unlocked) navigate(from, { replace: true });
  }, [loading, unlocked, from, navigate]);

  const doUnlock = async () => {
    setSubmitting(true);
    try {
      await unlock(pin);
      toast('已进入家长端', 'success');
      navigate(from, { replace: true });
    } catch (err) {
      toast(err.message, 'error');
      setPin('');
    } finally {
      setSubmitting(false);
    }
  };

  const setupPin = async () => {
    if (pin !== pin2) {
      toast('两次输入的 PIN 不一致', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.updateSettings({ approval_pin: pin });
      await unlock(pin);
      toast('家长 PIN 已设置', 'success');
      navigate(from, { replace: true });
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const skip = () => {
    unlockSkipped();
    navigate(from, { replace: true });
  };

  return (
    <PhoneFrame>
      <TopBar title="🔒 家长验证" onBack="/" />
      <div className="screen">
        {loading ? (
          <Loading />
        ) : hasPin ? (
          <>
            <div className="card">
              <div className="center">
                <div className="muted">请输入家长 PIN 进入家长端</div>
              </div>
              <div className="mt-12">
                <CodeInput value={pin} onChange={setPin} length={6} />
              </div>
              <div className="center mt-8 muted" style={{ fontSize: 12 }}>
                连续输错 5 次将锁定 5 分钟
              </div>
            </div>
            <button
              className="btn btn--primary btn--block mt-16"
              disabled={submitting || pin.length < 6}
              onClick={doUnlock}
            >
              进入家长端
            </button>
          </>
        ) : (
          <>
            <Notice type="warn">
              你还没有设置家长 PIN。设置后，孩子将无法自己进入家长端审批任务。
            </Notice>
            <div className="card">
              <label className="field__label">设置 6 位家长 PIN</label>
              <CodeInput value={pin} onChange={setPin} length={6} />
              <label className="field__label mt-16">再输一次确认</label>
              <CodeInput value={pin2} onChange={setPin2} length={6} />
            </div>
            <button
              className="btn btn--primary btn--block mt-16"
              disabled={submitting || pin.length < 6 || pin2.length < 6}
              onClick={setupPin}
            >
              设置并进入
            </button>
            <button className="btn btn--ghost btn--block mt-12" disabled={submitting} onClick={skip}>
              暂时跳过（仅本次）
            </button>
          </>
        )}
      </div>
    </PhoneFrame>
  );
}
