import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneFrame, TopBar, BottomNav } from '../../components/Layout.jsx';
import { Loading, Empty, Notice } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { creatureMeta, STAGE_LABEL } from '../../constants/meta.js';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';

function hhmm(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function ParentDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const { parent, logoutParent } = useAuth();

  const [children, setChildren] = useState(null);
  const [pending, setPending] = useState([]);
  const [report, setReport] = useState(null);
  const [nickname, setNickname] = useState('');
  const [newDevice, setNewDevice] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([api.parentChildren(), api.pendingTasks()]);
      setChildren(c.children);
      setPending(p.tasks);
      if (c.children[0]) {
        try {
          const r = await api.report(c.children[0].child_id, 'week');
          setReport(r);
        } catch {
          setReport(null);
        }
      }
    } catch (err) {
      toast(err.message, 'error');
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const addChild = async () => {
    if (!nickname.trim()) return;
    setAdding(true);
    try {
      const res = await api.bindChild({ child_nickname: nickname.trim() });
      setNewDevice(res.device_code);
      setNickname('');
      toast('孩子账号已创建', 'success');
      await load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setAdding(false);
    }
  };

  if (!children) {
    return (
      <PhoneFrame>
        <TopBar title="家长控制台" />
        <div className="screen">
          <Loading />
        </div>
        <BottomNav role="parent" />
      </PhoneFrame>
    );
  }

  const first = children[0];

  return (
    <PhoneFrame>
      <TopBar
        title="👨‍👩‍👧 家长控制台"
        subtitle={parent?.phone ? `手机号 ${parent.phone.slice(0, 3)}****${parent.phone.slice(-4)}` : ''}
        action={
          <button
            className="topbar__action"
            onClick={() => {
              logoutParent();
              navigate('/');
            }}
          >
            退出
          </button>
        }
      />
      <div className="screen screen--with-nav">
        {children.length === 0 ? (
          <div className="card">
            <Notice type="info">还没有绑定孩子，先添加一个孩子账号吧~</Notice>
            <div className="field">
              <label className="field__label">👶 孩子昵称</label>
              <input className="input" placeholder="例如：小明" value={nickname} onChange={e => setNickname(e.target.value)} />
            </div>
            <button className="btn btn--primary btn--block mt-12" disabled={adding || !nickname.trim()} onClick={addChild}>
              {adding ? '创建中...' : '➕ 添加孩子'}
            </button>
          </div>
        ) : (
          <>
            <div className="section-title">
              📋 待验证任务
              <span className="muted">{pending.length} 个</span>
            </div>

            {pending.length === 0 ? (
              <Empty icon="✅" text="暂时没有待验证的任务" />
            ) : (
              pending.map(t => (
                <div key={t.task_id} className="card">
                  <div className="row row--between">
                    <strong>
                      {t.child_name} 完成了「{t.task_name}」
                    </strong>
                  </div>
                  <div className="muted mt-8" style={{ fontSize: 13 }}>
                    {hhmm(t.submitted_at)} · 验证码：
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--c-primary-dark)', fontWeight: 700 }}>
                      {t.verification_code}
                    </span>
                  </div>
                  {t.evidence_url && (
                    <img
                      src={t.evidence_url}
                      alt="完成证据"
                      style={{ maxWidth: '100%', borderRadius: 12, marginTop: 10 }}
                    />
                  )}
                  <button className="btn btn--primary btn--sm mt-12" onClick={() => navigate(`/parent/verify/${t.task_id}`)}>
                    🔐 去验证 / 审批
                  </button>
                </div>
              ))
            )}

            {first?.creature && (
              <>
                <div className="section-title">🐾 孩子宠物</div>
                <div className="card">
                  <div className="row row--between">
                    <strong>
                      {creatureMeta(first.creature.creature_type).icon} {first.creature.name}
                    </strong>
                    <span className="badge-level">
                      Lv.{first.creature.level} {STAGE_LABEL[first.creature.stage]}
                    </span>
                  </div>
                  <div className="muted mt-8" style={{ fontSize: 13 }}>
                    今日任务：{first.today.completed}/{first.today.total} 完成
                  </div>
                </div>
              </>
            )}

            {report && (
              <>
                <div className="section-title">📊 本周报告</div>
                <div className="card">
                  <div className="row row--between">
                    <span>任务完成率</span>
                    <strong style={{ fontSize: 20, color: 'var(--c-primary)' }}>{report.summary.completion_rate}%</strong>
                  </div>
                  <button className="btn btn--ghost btn--block mt-12" onClick={() => navigate('/parent/report')}>
                    查看完整报告 ▶
                  </button>
                </div>
              </>
            )}

            <div className="section-title">➕ 添加孩子</div>
            <div className="card">
              <div className="row">
                <input className="input grow" placeholder="孩子昵称" value={nickname} onChange={e => setNickname(e.target.value)} />
                <button className="btn btn--primary btn--sm" disabled={adding || !nickname.trim()} onClick={addChild}>
                  添加
                </button>
              </div>
              {newDevice && (
                <div className="mt-12">
                  <Notice type="success">
                    设备码：<strong style={{ fontFamily: 'var(--font-mono)' }}>{newDevice}</strong>，让孩子用它登录
                  </Notice>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <BottomNav role="parent" />
    </PhoneFrame>
  );
}
