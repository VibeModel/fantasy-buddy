import { useEffect, useState } from 'react';

/**
 * 由绝对过期时间戳驱动的倒计时，返回剩余秒数。
 * - 每秒刷新当前时间计算差值，避免 setInterval 递减产生的漂移
 * - expiresAt 为空时返回 null（表示"未知"，由调用方决定是否展示）
 * - enabled 为 false 时停止滴答（例如任务已通过/已拒绝）
 * @param {number|null|undefined} expiresAt 过期时间戳（ms）
 * @param {boolean} enabled
 * @returns {number|null}
 */
export function useCountdown(expiresAt, enabled = true) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt || !enabled) return undefined;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [expiresAt, enabled]);

  if (!expiresAt) return null;
  return Math.max(0, Math.ceil((expiresAt - now) / 1000));
}
