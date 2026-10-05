import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { RequireParent } from './parentGate.jsx';

import Landing from './pages/Landing.jsx';
import ChildLogin from './pages/child/ChildLogin.jsx';
import ChildSetup from './pages/child/ChildSetup.jsx';
import ChildHome from './pages/child/ChildHome.jsx';
import ChildTasks from './pages/child/ChildTasks.jsx';
import ChildPropose from './pages/child/ChildPropose.jsx';
import TaskComplete from './pages/child/TaskComplete.jsx';
import RewardClaim from './pages/child/RewardClaim.jsx';
import Inventory from './pages/child/Inventory.jsx';
import CreatureDetail from './pages/child/CreatureDetail.jsx';

import ParentDashboard from './pages/parent/ParentDashboard.jsx';
import ParentVerify from './pages/parent/ParentVerify.jsx';
import ParentProposals from './pages/parent/ParentProposals.jsx';
import ParentAddTask from './pages/parent/ParentAddTask.jsx';
import ParentReport from './pages/parent/ParentReport.jsx';
import ParentSettings from './pages/parent/ParentSettings.jsx';
import ParentUnlock from './pages/parent/ParentUnlock.jsx';

function RequireChild({ children }) {
  const { child } = useAuth();
  const location = useLocation();
  if (!child) return <Navigate to="/child/login" replace state={{ from: location.pathname }} />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      {/* 儿童端：设备码登录 */}
      <Route path="/child/login" element={<ChildLogin />} />
      <Route
        path="/child/setup"
        element={
          <RequireChild>
            <ChildSetup />
          </RequireChild>
        }
      />
      <Route
        path="/child"
        element={
          <RequireChild>
            <ChildHome />
          </RequireChild>
        }
      />
      <Route
        path="/child/tasks"
        element={
          <RequireChild>
            <ChildTasks />
          </RequireChild>
        }
      />
      <Route
        path="/child/propose"
        element={
          <RequireChild>
            <ChildPropose />
          </RequireChild>
        }
      />
      <Route
        path="/child/complete/:taskId"
        element={
          <RequireChild>
            <TaskComplete />
          </RequireChild>
        }
      />
      <Route
        path="/child/reward/:taskId"
        element={
          <RequireChild>
            <RewardClaim />
          </RequireChild>
        }
      />
      <Route
        path="/child/inventory"
        element={
          <RequireChild>
            <Inventory />
          </RequireChild>
        }
      />
      <Route
        path="/child/creature"
        element={
          <RequireChild>
            <CreatureDetail />
          </RequireChild>
        }
      />

      {/* 家长端：本地单机版，无需登录，但需通过家长 PIN 门禁 */}
      <Route path="/parent/unlock" element={<ParentUnlock />} />
      <Route
        path="/parent"
        element={
          <RequireParent>
            <ParentDashboard />
          </RequireParent>
        }
      />
      <Route
        path="/parent/verify/:taskId"
        element={
          <RequireParent>
            <ParentVerify />
          </RequireParent>
        }
      />
      <Route
        path="/parent/proposals"
        element={
          <RequireParent>
            <ParentProposals />
          </RequireParent>
        }
      />
      <Route
        path="/parent/tasks/new"
        element={
          <RequireParent>
            <ParentAddTask />
          </RequireParent>
        }
      />
      <Route
        path="/parent/report"
        element={
          <RequireParent>
            <ParentReport />
          </RequireParent>
        }
      />
      <Route
        path="/parent/settings"
        element={
          <RequireParent>
            <ParentSettings />
          </RequireParent>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
