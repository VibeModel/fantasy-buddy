import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';

import Landing from './pages/Landing.jsx';
import ChildLogin from './pages/child/ChildLogin.jsx';
import ChildHome from './pages/child/ChildHome.jsx';
import ChildTasks from './pages/child/ChildTasks.jsx';
import TaskComplete from './pages/child/TaskComplete.jsx';
import RewardClaim from './pages/child/RewardClaim.jsx';
import Inventory from './pages/child/Inventory.jsx';
import CreatureDetail from './pages/child/CreatureDetail.jsx';

import ParentLogin from './pages/parent/ParentLogin.jsx';
import ParentDashboard from './pages/parent/ParentDashboard.jsx';
import ParentVerify from './pages/parent/ParentVerify.jsx';
import ParentAddTask from './pages/parent/ParentAddTask.jsx';
import ParentReport from './pages/parent/ParentReport.jsx';
import ParentSettings from './pages/parent/ParentSettings.jsx';

function RequireChild({ children }) {
  const { child } = useAuth();
  const location = useLocation();
  if (!child) return <Navigate to="/child/login" replace state={{ from: location.pathname }} />;
  return children;
}

function RequireParent({ children }) {
  const { parent } = useAuth();
  const location = useLocation();
  if (!parent) return <Navigate to="/parent/login" replace state={{ from: location.pathname }} />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route path="/child/login" element={<ChildLogin />} />
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

      <Route path="/parent/login" element={<ParentLogin />} />
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
