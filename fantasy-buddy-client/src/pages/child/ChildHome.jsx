import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneFrame, TopBar, BottomNav } from '../../components/Layout.jsx';
import { AttrBar, LevelBadge, Loading, Empty, TaskCard } from '../../components/ui.jsx';
import CompleteTaskModal from '../../components/CompleteTaskModal.jsx';
import { useToast } from '../../components/Toast.jsx';
import { creatureMeta, materialMeta } from '../../constants/meta.js';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';

function todayLabel() {
  const d = new Date();
  return `☀️ 今天 ${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function ChildHome() {
  const navigate = useNavigate();
  const toast = useToast();
  const { logoutChild, child } = useAuth();

  const [status, setStatus] = useState(null);
  const [tasks, setTasks] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [busy, setBusy] = useState('');
  const [completingTask, setCompletingTask] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, t, inv] = await Promise.all([api.creatureStatus(), api.childToday(), api.inventory()]);
      setStatus(s);
      setTasks(t);
      setInventory(inv);
    } catch (err) {
      toast(err.message, 'error');
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const materialCount = type =>
    inventory?.materials?.find(m => m.material_type === type)?.quantity || 0;

  const doCreatureAction = async (action, materialType) => {
    if (materialCount(materialType) < 1) {
      toast(`${materialMeta(materialType).name}不足，快去完成任务吧~`, 'error');
      return;
    }
    setBusy(action);
    try {
      const fn = action === 'feed' ? api.feed : action === 'play' ? api.play : api.bath;
      const res = await fn(materialType);
      toast(res.creature_reaction?.message || '好开心~', 'success');
      await load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy('');
    }
  };

  const handleComplete = async (note, evidenceUrl) => {
    if (!completingTask) return;
    setSubmitting(true);
    try {
      const res = await api.completeTask(completingTask.task_id, note, evidenceUrl);
      const task = completingTask;
      setCompletingTask(null);
      navigate(`/child/complete/${task.task_id}`, {
        state: {
          code: res.verification.code,
          rewards: res.rewards_preview,
          taskName: task.name,
          verifyMode: res.verification_mode,
          codeExpiresAt: res.verification.expires_at
        }
      });
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const creature = status?.creature;
  const meta = creature ? creatureMeta(creature.creature_type) : null;
  const pendingTasks = tasks?.tasks || [];

  return (
    <PhoneFrame>
      <TopBar
        title={todayLabel()}
        subtitle={child ? `你好，${child.nickname}` : ''}
        action={
          <button
            className="topbar__action"
            onClick={() => {
              logoutChild();
              navigate('/');
            }}
          >
            ⚙️ 退出
          </button>
        }
      />
      <div className="screen screen--with-nav">
        {!status || !tasks ? (
          <Loading />
        ) : (
          <>
            <div className="card">
              <div className="creature-hero">
                <span className="creature-hero__emoji">{meta.icon}</span>
                <div className="creature-name">{creature.name}</div>
                <div className="mt-8">
                  <LevelBadge stage={creature.stage} level={creature.level} />
                </div>
              </div>
              <div className="divider" />
              <AttrBar icon="😊" label="心情" value={status.status.mood} tone="mood" />
              <AttrBar icon="🍚" label="饱食" value={status.status.hunger} tone="hunger" />
              <AttrBar icon="🧴" label="清洁" value={status.status.cleanliness} tone="clean" />

              {status.alerts?.length > 0 && (
                <div className="notice notice--warn mt-12">{status.alerts[0].message}</div>
              )}
            </div>

            <div className="section-title">🎮 和它互动</div>
            <div className="action-grid">
              <button className="action-tile" disabled={busy === 'feed'} onClick={() => doCreatureAction('feed', 'fire_fruit')}>
                <div className="action-tile__icon">🍚</div>
                <div className="action-tile__label">喂食</div>
                <div className="action-tile__sub">🍖 x{materialCount('fire_fruit')}</div>
              </button>
              <button className="action-tile" disabled={busy === 'play'} onClick={() => doCreatureAction('play', 'magic_ball')}>
                <div className="action-tile__icon">🎾</div>
                <div className="action-tile__label">玩耍</div>
                <div className="action-tile__sub">🎾 x{materialCount('magic_ball')}</div>
              </button>
              <button className="action-tile" disabled={busy === 'bath'} onClick={() => doCreatureAction('bath', 'bubble_lotion')}>
                <div className="action-tile__icon">🧴</div>
                <div className="action-tile__label">洗澡</div>
                <div className="action-tile__sub">🧴 x{materialCount('bubble_lotion')}</div>
              </button>
            </div>

            <div className="section-title">
              📋 今日任务
              <span className="muted">
                {tasks.completed_count}/{tasks.total_count}
              </span>
            </div>

            {pendingTasks.length === 0 ? (
              <Empty icon="🌱" text="今天还没有任务，去提醒爸爸妈妈安排吧" />
            ) : (
              pendingTasks.map(task => (
                <TaskCard
                  key={task.task_id}
                  task={task}
                  onComplete={setCompletingTask}
                  onClaim={t => navigate(`/child/reward/${t.task_id}`)}
                />
              ))
            )}
          </>
        )}
      </div>
      <BottomNav role="child" />
      {completingTask && (
        <CompleteTaskModal
          task={completingTask}
          submitting={submitting}
          onClose={() => setCompletingTask(null)}
          onSubmit={handleComplete}
        />
      )}
    </PhoneFrame>
  );
}
