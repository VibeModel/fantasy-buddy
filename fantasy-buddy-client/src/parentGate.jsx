import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, DATA_SOURCE } from './api.js';

/**
 * 家长端门禁（UI 层）
 * 单设备场景下，防止孩子直接打开家长端自己审批。
 * 解锁态放 sessionStorage（关标签页即失效），TTL 15 分钟，复用同一套审批 PIN。
 * 注意：本地数据就在浏览器里，门禁只是"防误入"，不是安全边界。
 */

const KEY = 'fb_parent_unlocked_until';
const TTL = 15 * 60 * 1000;

const ParentGateContext = createContext(null);

function readUnlocked() {
  try {
    return Number(sessionStorage.getItem(KEY) || 0) > Date.now();
  } catch {
    return false;
  }
}

function markUnlocked() {
  try {
    sessionStorage.setItem(KEY, String(Date.now() + TTL));
  } catch {
    /* ignore */
  }
}

export function ParentGateProvider({ children }) {
  const [unlocked, setUnlocked] = useState(readUnlocked);

  /** 校验 PIN 后解锁；失败抛错（由调用方提示） */
  const unlock = useCallback(async (pin) => {
    await api.verifyApprovalPin(pin);
    markUnlocked();
    setUnlocked(true);
  }, []);

  /** 未设 PIN 时"仅本次跳过" */
  const unlockSkipped = useCallback(() => {
    markUnlocked();
    setUnlocked(true);
  }, []);

  const lock = useCallback(() => {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    setUnlocked(false);
  }, []);

  const value = useMemo(
    () => ({ unlocked, unlock, unlockSkipped, lock, ttl: TTL }),
    [unlocked, unlock, unlockSkipped, lock]
  );

  return <ParentGateContext.Provider value={value}>{children}</ParentGateContext.Provider>;
}

export function useParentGate() {
  const ctx = useContext(ParentGateContext);
  if (!ctx) throw new Error('useParentGate 必须在 ParentGateProvider 内使用');
  return ctx;
}

export function RequireParent({ children }) {
  const { unlocked } = useParentGate();
  const location = useLocation();
  // 服务端模式（开发/兼容）不做门禁
  if (DATA_SOURCE === 'server') return children;
  if (!unlocked) {
    return <Navigate to="/parent/unlock" replace state={{ from: location.pathname + location.search }} />;
  }
  return children;
}
