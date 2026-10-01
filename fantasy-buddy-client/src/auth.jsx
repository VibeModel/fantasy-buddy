import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { session } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [parent, setParentState] = useState(session.getParent());
  const [child, setChildState] = useState(session.getChild());

  const loginParent = useCallback((parentInfo, token) => {
    session.setParent(parentInfo, token);
    setParentState(parentInfo);
  }, []);

  const logoutParent = useCallback(() => {
    session.clearParent();
    setParentState(null);
  }, []);

  const loginChild = useCallback((childInfo, token) => {
    session.setChild(childInfo, token);
    setChildState(childInfo);
  }, []);

  const logoutChild = useCallback(() => {
    session.clearChild();
    setChildState(null);
  }, []);

  const value = useMemo(
    () => ({ parent, child, loginParent, logoutParent, loginChild, logoutChild }),
    [parent, child, loginParent, logoutParent, loginChild, logoutChild]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用');
  return ctx;
}
