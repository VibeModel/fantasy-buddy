import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneFrame, TopBar, BottomNav } from '../../components/Layout.jsx';
import { Loading, Notice } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';

export default function ParentSettings() {
  const navigate = useNavigate();
  const toast = useToast();
  const { parent, logoutParent } = useAuth();

  const [children, setChildren] = useState(null);
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [hasApprovalPin, setHasApprovalPin] = useState(false);
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [c, s] = await Promise.all([api.parentChildren(), api.getSettings()]);
        setChildren(c.children);
        setHasApprovalPin(!!s.has_approval_pin);
        setSettings({
          verify_mode: 'strict',
          auto_verify_easy_tasks: false,
          notification_enabled: true,
          daily_game_time_limit: 60,
          night_lock_start: '21:00',
          night_lock_end: '07:00',
          ...s.settings
        });
      } catch (err) {
        toast(err.message, 'error');
      }
    })();
  }, [toast]);

  const patch = obj => setSettings(prev => ({ ...prev, ...obj }));

  const save = async () => {
    if (pin || pinConfirm) {
      if (!/^\d{6}$/.test(pin)) return toast('审批密码必须是 6 位数字', 'error');
      if (pin !== pinConfirm) return toast('两次输入的审批密码不一致', 'error');
    }
    setSaving(true);
    try {
      const payload = { ...settings };
      if (pin) payload.approval_pin = pin;
      const res = await api.updateSettings(payload);
      setSettings(prev => ({ ...prev, ...res.settings }));
      setHasApprovalPin(!!res.has_approval_pin);
      setPin('');
      setPinConfirm('');
      toast('设置已保存', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!children || !settings) {
    return (
      <PhoneFrame>
        <TopBar title="设置" onBack="/parent" />
        <div className="screen">
          <Loading />
        </div>
        <BottomNav role="parent" />
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <TopBar title="⚙️ 系统设置" onBack="/parent" />
      <div className="screen screen--with-nav">
        <div className="card">
          <strong>👤 账号信息</strong>
          <div className="muted mt-8">手机号：{parent?.phone || '-'}</div>
          <button
            className="btn btn--danger btn--block mt-12"
            onClick={() => {
              logoutParent();
              navigate('/');
            }}
          >
            退出登录
          </button>
        </div>

        <div className="card">
          <strong>👶 孩子管理</strong>
          {children.length === 0 ? (
            <div className="muted mt-8">还没有添加孩子</div>
          ) : (
            children.map(c => (
              <div key={c.child_id} className="row row--between mt-12">
                <span>👦 {c.nickname}</span>
                <span className="pill" style={{ fontFamily: 'var(--font-mono)' }}>
                  {c.device_code}
                </span>
              </div>
            ))
          )}
          <div className="mt-12">
            <Notice type="info">设备码用于孩子端登录，请妥善保管。</Notice>
          </div>
        </div>

        <div className="card">
          <strong>🔐 验证设置</strong>
          <div className="field">
            <label className="field__label">验证模式</label>
            {[
              { id: 'strict', label: '严格模式 - 每个任务需输入任务验证码' },
              { id: 'pin', label: '审批密码模式 - 输入家长自设的 6 位审批密码' },
              { id: 'normal', label: '普通模式 - 一键审批，无需密码' }
            ].map(opt => (
              <label key={opt.id} className="row mt-8" style={{ cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="verify_mode"
                  checked={settings.verify_mode === opt.id}
                  onChange={() => patch({ verify_mode: opt.id })}
                />
                <span style={{ fontSize: 14 }}>{opt.label}</span>
              </label>
            ))}
          </div>

          <label className="row mt-12" style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.auto_verify_easy_tasks}
              onChange={e => patch({ auto_verify_easy_tasks: e.target.checked })}
            />
            <span style={{ fontSize: 14 }}>简单任务自动验证（早起、饭前洗手等）</span>
          </label>
        </div>

        <div className="card">
          <strong>🔑 审批密码</strong>
          <div className="muted mt-8" style={{ fontSize: 13 }}>
            状态：{hasApprovalPin ? '✅ 已设置（重新输入可修改）' : '⚠️ 未设置'}
          </div>
          <div className="field">
            <label className="field__label">6 位数字</label>
            <input
              className="input"
              inputMode="numeric"
              placeholder="••••••"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </div>
          <div className="field">
            <label className="field__label">确认密码</label>
            <input
              className="input"
              inputMode="numeric"
              placeholder="••••••"
              value={pinConfirm}
              onChange={e => setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </div>
          <div className="mt-12">
            <Notice type="warn">审批时家长输入此密码即可通过，与孩子无关，请勿告诉孩子。</Notice>
          </div>
        </div>

        <div className="card">
          <strong>⏰ 时间设置</strong>
          <div className="field">
            <label className="field__label">每日游戏时长上限</label>
            <div className="row" style={{ gap: 8 }}>
              {[30, 60, 90].map(m => (
                <button
                  key={m}
                  className={`btn btn--sm grow ${settings.daily_game_time_limit === m ? 'btn--primary' : 'btn--ghost'}`}
                  onClick={() => patch({ daily_game_time_limit: m })}
                >
                  {m}分钟
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="field__label">夜间锁定时间</label>
            <div className="row">
              <input
                type="time"
                className="input"
                value={settings.night_lock_start}
                onChange={e => patch({ night_lock_start: e.target.value })}
              />
              <span className="muted">至</span>
              <input
                type="time"
                className="input"
                value={settings.night_lock_end}
                onChange={e => patch({ night_lock_end: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="card">
          <strong>🔔 通知设置</strong>
          <label className="row mt-8" style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.notification_enabled}
              onChange={e => patch({ notification_enabled: e.target.checked })}
            />
            <span style={{ fontSize: 14 }}>任务完成 / 验证码提醒 / 每日报告推送</span>
          </label>
        </div>

        <div className="card">
          <strong>ℹ️ 关于</strong>
          <div className="muted mt-8">奇幻小伙伴 v1.0.0</div>
        </div>

        <button className="btn btn--primary btn--block mt-16" disabled={saving} onClick={save}>
          {saving ? '保存中...' : '💾 保存设置'}
        </button>
      </div>
      <BottomNav role="parent" />
    </PhoneFrame>
  );
}
