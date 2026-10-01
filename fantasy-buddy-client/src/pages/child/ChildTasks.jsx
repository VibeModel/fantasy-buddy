import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneFrame, TopBar, BottomNav } from '../../components/Layout.jsx';
import { Loading, Empty, TaskCard } from '../../components/ui.jsx';
import CompleteTaskModal from '../../components/CompleteTaskModal.jsx';
import { useToast } from '../../components/Toast.jsx';
import { CATEGORY_ORDER, categoryMeta } from '../../constants/meta.js';
import { api } from '../../api.js';

const GROUPS = [
  { key: 'pending', label: '📍 待开始', statuses: ['pending'] },
  { key: 'awaiting', label: '⏳ 等待验证', statuses: ['awaiting_verification'] },
  { key: 'done', label: '✅ 已完成', statuses: ['verified'] },
  { key: 'rejected', label: '❌ 未通过', statuses: ['rejected'] }
];

export default function ChildTasks() {
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [completingTask, setCompletingTask] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api.childToday());
    } catch (err) {
      toast(err.message, 'error');
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

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

  if (!data) {
    return (
      <PhoneFrame>
        <TopBar title="📋 今日任务" onBack="/child" />
        <div className="screen">
          <Loading />
        </div>
        <BottomNav role="child" />
      </PhoneFrame>
    );
  }

  // 分类进度
  const byCategory = {};
  data.tasks.forEach(t => {
    if (!byCategory[t.category]) byCategory[t.category] = { total: 0, done: 0 };
    byCategory[t.category].total += 1;
    if (t.status === 'verified' || t.status === 'awaiting_verification') byCategory[t.category].done += 1;
  });

  return (
    <PhoneFrame>
      <TopBar title="📋 今日任务" subtitle={data.date} onBack="/child" />
      <div className="screen screen--with-nav">
        <div className="card">
          <div className="row row--between">
            <strong>📊 今日进度</strong>
            <span className="muted">
              {data.completed_count}/{data.total_count} 完成
            </span>
          </div>
          <div className="divider" />
          {CATEGORY_ORDER.filter(c => byCategory[c]).map(c => {
            const meta = categoryMeta(c);
            const info = byCategory[c];
            return (
              <div key={c} className="row row--between mt-8">
                <span>
                  {meta.icon} {meta.name}
                </span>
                <span className={info.done >= info.total ? 'pill pill--success' : 'pill'}>
                  {info.done}/{info.total}
                </span>
              </div>
            );
          })}
        </div>

        {data.tasks.length === 0 && <Empty icon="🌱" text="今天还没有任务哦" />}

        {GROUPS.map(group => {
          const list = data.tasks.filter(t => group.statuses.includes(t.status));
          if (list.length === 0) return null;
          return (
            <div key={group.key}>
              <div className="section-title">{group.label}</div>
              {list.map(task => (
                <TaskCard
                  key={task.task_id}
                  task={task}
                  onComplete={setCompletingTask}
                  onClaim={t => navigate(`/child/reward/${t.task_id}`)}
                />
              ))}
            </div>
          );
        })}
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
