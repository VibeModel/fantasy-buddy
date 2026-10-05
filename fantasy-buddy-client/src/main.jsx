import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './auth.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { ParentGateProvider } from './parentGate.jsx';
import './styles/global.css';

// 尽力申请持久化存储，降低移动端 IndexedDB 被系统回收的概率
navigator.storage?.persist?.().catch(() => {});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <ToastProvider>
          <ParentGateProvider>
            <App />
          </ParentGateProvider>
        </ToastProvider>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
);
