import { useEffect, useRef } from 'react';

/**
 * 轮询 hook：每 intervalMs 静默执行一次 fn。
 * - 组件卸载自动停止
 * - 页面切到后台时暂停，回到前台立即补拉一次
 * - deps 变化时重置轮询
 * - fn 内部抛错静默忽略，不打扰用户
 */
export function usePolling(fn, intervalMs = 5000, deps = []) {
  const savedFn = useRef(fn);
  savedFn.current = fn;

  useEffect(() => {
    let alive = true;
    let timer = null;

    const run = async () => {
      try {
        await savedFn.current();
      } catch {
        /* 轮询失败静默 */
      }
    };

    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const start = () => {
      stop();
      timer = setInterval(() => {
        if (!document.hidden && alive) run();
      }, intervalMs);
    };

    const onVisible = () => {
      if (document.hidden) {
        stop();
      } else {
        run();
        start();
      }
    };

    run();
    start();
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      alive = false;
      stop();
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...deps]);
}
