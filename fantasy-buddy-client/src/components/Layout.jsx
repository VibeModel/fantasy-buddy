import { useLocation, useNavigate } from 'react-router-dom';

export function PhoneFrame({ children }) {
  return (
    <div className="phone-wrap">
      <div className="phone">{children}</div>
    </div>
  );
}

export function TopBar({ title, subtitle, onBack, action }) {
  const navigate = useNavigate();
  return (
    <div className="topbar">
      {onBack && (
        <button className="topbar__back" onClick={() => (onBack === true ? navigate(-1) : navigate(onBack))}>
          ←
        </button>
      )}
      <div className="grow">
        <div className="topbar__title">{title}</div>
        {subtitle && <div className="muted" style={{ fontSize: 12 }}>{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

const CHILD_NAV = [
  { to: '/child', icon: '🏠', label: '首页', exact: true },
  { to: '/child/tasks', icon: '📋', label: '任务' },
  { to: '/child/inventory', icon: '🎒', label: '背包' },
  { to: '/child/creature', icon: '🐾', label: '宠物' }
];

const PARENT_NAV = [
  { to: '/parent', icon: '🏠', label: '首页', exact: true },
  { to: '/parent/tasks/new', icon: '📝', label: '任务' },
  { to: '/parent/report', icon: '📊', label: '报告' },
  { to: '/parent/settings', icon: '⚙️', label: '设置' }
];

export function BottomNav({ role }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const items = role === 'parent' ? PARENT_NAV : CHILD_NAV;

  return (
    <nav className="bottom-nav">
      {items.map(item => {
        const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
        return (
          <button
            key={item.to}
            className={`bottom-nav__item${active ? ' active' : ''}`}
            onClick={() => navigate(item.to)}
          >
            <span className="icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
