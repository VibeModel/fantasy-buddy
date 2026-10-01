import { useCallback, useEffect, useState } from 'react';
import { PhoneFrame, TopBar, BottomNav } from '../../components/Layout.jsx';
import { AttrBar, LevelBadge, Loading } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { creatureMeta, materialMeta } from '../../constants/meta.js';
import { api } from '../../api.js';

const CHAT = ['咕噜咕噜~ 今天也要开心哦！', '陪你一起加油！', '你好棒，我最喜欢你啦~', '摸摸头，好舒服~'];

export default function CreatureDetail() {
  const toast = useToast();
  const [status, setStatus] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try {
      const [s, inv] = await Promise.all([api.creatureStatus(), api.inventory()]);
      setStatus(s);
      setInventory(inv);
    } catch (err) {
      toast(err.message, 'error');
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const count = type => inventory?.materials?.find(m => m.material_type === type)?.quantity || 0;

  const act = async (action, materialType) => {
    if (count(materialType) < 1) {
      toast(`${materialMeta(materialType).name}不足`, 'error');
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

  if (!status) {
    return (
      <PhoneFrame>
        <TopBar title="宠物详情" onBack="/child" />
        <div className="screen">
          <Loading />
        </div>
        <BottomNav role="child" />
      </PhoneFrame>
    );
  }

  const { creature, status: attr } = status;
  const meta = creatureMeta(creature.creature_type);

  const tiles = [
    { action: 'feed', icon: '🍚', label: '喂食', mat: 'fire_fruit' },
    { action: 'play', icon: '🎾', label: '玩耍', mat: 'magic_ball' },
    { action: 'bath', icon: '🧴', label: '洗澡', mat: 'bubble_lotion' }
  ];

  return (
    <PhoneFrame>
      <TopBar title={`${meta.icon} ${creature.name}`} onBack="/child" />
      <div className="screen screen--with-nav">
        <div className="card">
          <div className="creature-hero">
            <span className="creature-hero__emoji">{meta.icon}</span>
            <div className="creature-name">{creature.name}</div>
            <div className="mt-8">
              <LevelBadge stage={creature.stage} level={creature.level} />
            </div>
            <div className="muted mt-8">
              亲密度 💚 {attr.intimacy}
            </div>
          </div>

          <div className="divider" />
          <AttrBar icon="🍚" label="饱食度" value={attr.hunger} tone="hunger" />
          <AttrBar icon="🧴" label="清洁度" value={attr.cleanliness} tone="clean" />
          <AttrBar icon="😊" label="心情值" value={attr.mood} tone="mood" />
        </div>

        <div className="section-title">互动一下</div>
        <div className="action-grid">
          {tiles.map(t => (
            <button key={t.action} className="action-tile" disabled={busy === t.action} onClick={() => act(t.action, t.mat)}>
              <div className="action-tile__icon">{t.icon}</div>
              <div className="action-tile__label">{t.label}</div>
              <div className="action-tile__sub">
                {materialMeta(t.mat).icon} x{count(t.mat)}
              </div>
            </button>
          ))}
        </div>

        <button
          className="btn btn--secondary btn--block mt-16"
          onClick={() => toast(CHAT[Math.floor(Math.random() * CHAT.length)], 'info')}
        >
          🤚 抚摸 / 对话（不需要材料）
        </button>

        {status.alerts?.length > 0 && (
          <div className="mt-16">
            {status.alerts.map(a => (
              <div key={a.type} className="notice notice--warn mt-8">
                {a.message}
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav role="child" />
    </PhoneFrame>
  );
}
