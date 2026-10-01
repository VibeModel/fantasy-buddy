import { useEffect, useState } from 'react';
import { PhoneFrame, TopBar, BottomNav } from '../../components/Layout.jsx';
import { Loading, Empty } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { MATERIAL_GROUPS, materialMeta } from '../../constants/meta.js';
import { api } from '../../api.js';

export default function Inventory() {
  const toast = useToast();
  const [data, setData] = useState(null);

  useEffect(() => {
    api
      .inventory()
      .then(setData)
      .catch(err => toast(err.message, 'error'));
  }, [toast]);

  const materials = data?.materials || [];
  const total = materials.reduce((sum, m) => sum + m.quantity, 0);

  return (
    <PhoneFrame>
      <TopBar title="🎒 材料背包" subtitle={`共 ${total} 个材料`} onBack="/child" />
      <div className="screen screen--with-nav">
        {!data ? (
          <Loading />
        ) : total === 0 ? (
          <Empty icon="🎒" text="背包还是空的，完成任务就能获得材料啦" />
        ) : (
          MATERIAL_GROUPS.map(group => {
            const items = materials.filter(m => materialMeta(m.material_type).group === group.id && m.quantity > 0);
            if (items.length === 0) return null;
            return (
              <div key={group.id}>
                <div className="section-title">{group.label}</div>
                <div className="material-grid">
                  {items.map(m => {
                    const meta = materialMeta(m.material_type);
                    return (
                      <div key={m.material_type} className="material-tile">
                        <div className="material-tile__icon">{meta.icon}</div>
                        <div className="material-tile__name">{m.name}</div>
                        <div className="material-tile__qty">x{m.quantity}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
      <BottomNav role="child" />
    </PhoneFrame>
  );
}
