import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PhoneFrame, TopBar } from '../../components/Layout.jsx';
import { Loading, Notice } from '../../components/ui.jsx';
import { creatureMeta, rewardEntries } from '../../constants/meta.js';
import { api } from '../../api.js';

export default function RewardClaim() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const claimedRef = useRef(false);

  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [creatureType, setCreatureType] = useState('dragon');

  useEffect(() => {
    if (claimedRef.current) return;
    claimedRef.current = true;

    (async () => {
      try {
        const data = await api.claimReward(taskId);
        setResult(data);
      } catch (err) {
        // 1007: 奖励已领取，仍展示生物
        if (err.code === 1007) setResult({ rewards_claimed: {}, message: '奖励已经领取过啦~' });
        else setError(err.message);
      }
      try {
        const s = await api.creatureStatus();
        setCreatureType(s.creature.creature_type);
      } catch {
        /* ignore */
      }
    })();
  }, [taskId]);

  if (error) {
    return (
      <PhoneFrame>
        <TopBar title="领取奖励" onBack="/child/tasks" />
        <div className="screen">
          <Notice type="error">{error}</Notice>
          <button className="btn btn--primary btn--block mt-16" onClick={() => navigate('/child/tasks')}>
            返回任务列表
          </button>
        </div>
      </PhoneFrame>
    );
  }

  if (!result) {
    return (
      <PhoneFrame>
        <TopBar title="领取奖励" />
        <div className="screen">
          <Loading text="正在发放奖励..." />
        </div>
      </PhoneFrame>
    );
  }

  const meta = creatureMeta(creatureType);
  const rewards = rewardEntries(result.rewards_claimed);

  return (
    <PhoneFrame>
      <div className="screen">
        <div className="center mt-16 reward-pop">
          <div style={{ fontSize: 32, fontWeight: 800 }}>🎊 验证通过！🎊</div>
          <div className="creature-hero">
            <span className="creature-hero__emoji">{meta.icon}</span>
          </div>
          <div className="creature-name">{result.creature?.name || meta.name}</div>
          <div className="muted mt-8">{result.message}</div>
        </div>

        {rewards.length > 0 && (
          <div className="card mt-16">
            <strong>📨 获得奖励</strong>
            <div className="col mt-12">
              {rewards.map(r => (
                <div key={r.type} className="row row--between">
                  <span>
                    {r.icon} {r.name}
                  </span>
                  <span className="pill pill--success">+{r.qty}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button className="btn btn--primary btn--block mt-24" onClick={() => navigate('/child/creature')}>
          🎁 去喂小火焰吧！
        </button>
      </div>
    </PhoneFrame>
  );
}
