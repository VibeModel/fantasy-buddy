import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneFrame, TopBar } from '../../components/Layout.jsx';
import { Notice } from '../../components/ui.jsx';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';

export default function ChildLogin() {
  const navigate = useNavigate();
  const { loginChild } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async e => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.childLogin(code.trim().toUpperCase());
      loginChild(data.child, data.access_token);
      navigate('/child', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PhoneFrame>
      <TopBar title="我是小朋友" onBack="/" />
      <div className="screen">
        <div className="creature-hero">
          <span className="creature-hero__emoji">🐣</span>
        </div>
        <div className="center muted">输入爸爸妈妈给你的设备码</div>

        <form className="card mt-16" onSubmit={submit}>
          <label className="field__label">🔑 设备码</label>
          <input
            className="input"
            placeholder="例如：PLIG96"
            value={code}
            maxLength={8}
            onChange={e => setCode(e.target.value.toUpperCase())}
            style={{ textAlign: 'center', letterSpacing: 4, fontFamily: 'var(--font-mono)' }}
          />

          {error && (
            <div className="mt-12">
              <Notice type="error">{error}</Notice>
            </div>
          )}

          <button className="btn btn--primary btn--block mt-16" disabled={loading || !code.trim()}>
            {loading ? '登录中...' : '进入游戏 →'}
          </button>
        </form>

        <div className="mt-16">
          <Notice type="info">
            还没有设备码？请让爸爸妈妈先在「家长端」注册并添加你的账号，他们会得到一个设备码。
          </Notice>
        </div>
      </div>
    </PhoneFrame>
  );
}
