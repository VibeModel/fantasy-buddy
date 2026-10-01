import { useNavigate } from 'react-router-dom';
import { PhoneFrame } from '../components/Layout.jsx';
import { useAuth } from '../auth.jsx';

export default function Landing() {
  const navigate = useNavigate();
  const { parent, child } = useAuth();

  return (
    <PhoneFrame>
      <div className="landing">
        <div className="landing__logo">🌟 奇幻小伙伴 🌟</div>
        <div className="muted">做任务 · 养宠物 · 一起成长</div>

        <div className="landing__mascot">🐉</div>

        <button
          className="btn btn--primary btn--block mt-16"
          style={{ maxWidth: 300 }}
          onClick={() => navigate(child ? '/child' : '/child/login')}
        >
          👧 我是小朋友
        </button>
        <button
          className="btn btn--secondary btn--block mt-12"
          style={{ maxWidth: 300 }}
          onClick={() => navigate(parent ? '/parent' : '/parent/login')}
        >
          👨 我是爸爸妈妈
        </button>
      </div>
    </PhoneFrame>
  );
}
