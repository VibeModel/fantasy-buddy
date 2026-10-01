import { useEffect, useState } from 'react';
import { PhoneFrame, TopBar, BottomNav } from '../../components/Layout.jsx';
import { Loading, Empty } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { CATEGORY_ORDER, categoryMeta, creatureMeta, STAGE_LABEL } from '../../constants/meta.js';
import { api } from '../../api.js';

const WEEKDAY = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function weekday(dateStr) {
  return WEEKDAY[new Date(dateStr).getDay()];
}

export default function ParentReport() {
  const toast = useToast();
  const [children, setChildren] = useState(null);
  const [childId, setChildId] = useState('');
  const [period, setPeriod] = useState('week');
  const [report, setReport] = useState(null);
  const [creature, setCreature] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const c = await api.parentChildren();
        setChildren(c.children);
        if (c.children[0]) setChildId(c.children[0].child_id);
      } catch (err) {
        toast(err.message, 'error');
      }
    })();
  }, [toast]);

  useEffect(() => {
    if (!childId) return;
    (async () => {
      try {
        const [r, cr] = await Promise.all([api.report(childId, period), api.childCreature(childId).catch(() => null)]);
        setReport(r);
        setCreature(cr);
      } catch (err) {
        toast(err.message, 'error');
      }
    })();
  }, [childId, period, toast]);

  const child = children?.find(c => c.child_id === childId);

  return (
    <PhoneFrame>
      <TopBar title="📊 任务报告" onBack="/parent" />
      <div className="screen screen--with-nav">
        {!children ? (
          <Loading />
        ) : children.length === 0 ? (
          <Empty icon="👶" text="还没有孩子账号" />
        ) : (
          <>
            <div className="card">
              <label className="field__label">👶 选择孩子</label>
              <select className="select" value={childId} onChange={e => setChildId(e.target.value)}>
                {children.map(c => (
                  <option key={c.child_id} value={c.child_id}>
                    {c.nickname}
                  </option>
                ))}
              </select>

              <div className="row mt-12" style={{ gap: 8 }}>
                <button className={`btn btn--sm grow ${period === 'week' ? 'btn--primary' : 'btn--ghost'}`} onClick={() => setPeriod('week')}>
                  本周
                </button>
                <button className={`btn btn--sm grow ${period === 'month' ? 'btn--primary' : 'btn--ghost'}`} onClick={() => setPeriod('month')}>
                  本月
                </button>
              </div>
            </div>

            {!report ? (
              <Loading />
            ) : (
              <>
                <div className="card center">
                  <div className="muted">
                    {child?.nickname} · {period === 'week' ? '本周报告' : '本月报告'}
                  </div>
                  <div className="muted mt-8" style={{ fontSize: 12 }}>
                    {report.date_range}
                  </div>
                  <div style={{ fontSize: 42, fontWeight: 800, color: 'var(--c-primary)', marginTop: 8 }}>
                    {report.summary.completion_rate}%
                  </div>
                  <div className="muted">任务完成率</div>
                </div>

                <div className="stat-grid mt-12">
                  <div className="stat">
                    <div className="stat__num">{report.summary.total_tasks}</div>
                    <div className="stat__label">总任务</div>
                  </div>
                  <div className="stat">
                    <div className="stat__num">{report.summary.completed_tasks}</div>
                    <div className="stat__label">已完成</div>
                  </div>
                  <div className="stat">
                    <div className="stat__num">{report.summary.total_exp_earned}</div>
                    <div className="stat__label">获得经验</div>
                  </div>
                </div>

                {report.daily_breakdown.length > 0 && (
                  <div className="card mt-12">
                    <strong>📅 每日完成情况</strong>
                    {report.daily_breakdown.map(d => (
                      <div key={d.date} className="day-row">
                        <span className="day-row__name">{weekday(d.date)}</span>
                        <div className="bar day-row__bar">
                          <div
                            className="bar__fill"
                            style={{ width: `${d.total ? (d.completed / d.total) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="day-row__val">
                          {d.completed}/{d.total}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {report.category_breakdown.length > 0 && (
                  <div className="card mt-12">
                    <strong>📊 任务类型分布</strong>
                    {CATEGORY_ORDER.filter(c => report.category_breakdown.some(x => x.category === c)).map(c => {
                      const item = report.category_breakdown.find(x => x.category === c);
                      const meta = categoryMeta(c);
                      const max = Math.max(...report.category_breakdown.map(x => x.total), 1);
                      return (
                        <div key={c} className="day-row">
                          <span className="day-row__name">{meta.icon}</span>
                          <div className="bar day-row__bar">
                            <div className="bar__fill bar__fill--primary" style={{ width: `${(item.total / max) * 100}%` }} />
                          </div>
                          <span className="day-row__val">{item.total}个</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {creature?.creature && (
                  <div className="card mt-12">
                    <strong>🐾 宠物状态</strong>
                    <div className="row row--between mt-8">
                      <span>
                        {creatureMeta(creature.creature.type).icon} {creature.creature.name}
                      </span>
                      <span className="badge-level">
                        Lv.{creature.creature.level} {STAGE_LABEL[creature.creature.stage]}
                      </span>
                    </div>
                    <div className="muted mt-8" style={{ fontSize: 13 }}>
                      亲密度：{creature.attributes.intimacy} · 健康状态：
                      {creature.creature.health_status === 'good'
                        ? '良好'
                        : creature.creature.health_status === 'warning'
                        ? '需关注'
                        : '较差'}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
      <BottomNav role="parent" />
    </PhoneFrame>
  );
}
