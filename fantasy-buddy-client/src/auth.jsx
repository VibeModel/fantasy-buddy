import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { session } from './api';

const AuthContext = createContext(null);

/**
 * 本地单机版：只有儿童端需要登录（设备码）；
 * 家长端无需注册/登录，直接可用，因此不在此维护家长登录态。
 */
export function AuthProvider({ children }) {
  const [child, setChildState] = useState(session.getChild());

  const loginChild = useCallback((childInfo, token) => {
    session.setChild(childInfo, token);
    setChildState(childInfo);
  }, []);

  const logoutChild = useCallback(() => {
    session.clearChild();
    setChildState(null);
  }, []);

  const value = useMemo(() => ({ child, loginChild, logoutChild }), [child, loginChild, logoutChild]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用');
  return ctx;
}
