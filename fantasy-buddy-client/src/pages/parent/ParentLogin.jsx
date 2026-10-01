import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneFrame, TopBar } from '../../components/Layout.jsx';
import { Notice } from '../../components/ui.jsx';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';

export default function ParentLogin() {
  const navigate = useNavigate();
  const { loginParent } = useAuth();

  const [mode, setMode] = useState('login'); // login | register
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = phone.trim().length >= 6 && password.trim().length >= 6;

  const submit = async e => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    try {
      const data =
        mode === 'login'
          ? await api.login(phone.trim(), password)
          : await api.register(phone.trim(), password);
      loginParent({ parent_id: data.parent_id, phone: phone.trim() }, data.access_token);
      navigate('/parent', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PhoneFrame>
      <TopBar title="家长端" onBack="/" />
      <div className="screen">
        <div className="center mt-16">
          <div style={{ fontSize: 34 }}>🌟</div>
          <div className="landing__logo" style={{ fontSize: 22 }}>
            奇幻小伙伴 · 家长端
          </div>
        </div>

        <div className="row mt-16" style={{ gap: 8 }}>
          <button className={`btn grow btn--sm ${mode === 'login' ? 'btn--primary' : 'btn--ghost'}`} onClick={() => setMode('login')}>
            登录
          </button>
          <button className={`btn grow btn--sm ${mode === 'register' ? 'btn--primary' : 'btn--ghost'}`} onClick={() => setMode('register')}>
            注册
          </button>
        </div>

        <form className="card mt-16" onSubmit={submit}>
          <label className="field__label">📱 手机号</label>
          <input
            className="input"
            inputMode="numeric"
            placeholder="请输入手机号"
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
          />

          <div className="field">
            <label className="field__label">🔐 密码</label>
            <input
              className="input"
              type="password"
              placeholder="至少 6 位密码"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="mt-12">
              <Notice type="error">{error}</Notice>
            </div>
          )}

          <button className="btn btn--primary btn--block mt-16" disabled={loading || !canSubmit}>
            {loading ? '请稍候...' : mode === 'login' ? '登录' : '注册并登录'}
          </button>
        </form>

        <div className="mt-16">
          <Notice type="info">登录后即可添加孩子账号，把生成的设备码给孩子登录使用。</Notice>
        </div>
      </div>
    </PhoneFrame>
  );
}
