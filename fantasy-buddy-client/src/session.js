/**
 * 儿童端本地会话（localStorage）
 * 被 api facade 与 serverApi 共用，避免循环依赖。
 * 注意：这里只存"会话标记"，业务数据一律走 IndexedDB。
 */

const KEY = {
  childToken: 'fb_child_token',
  childInfo: 'fb_child_info'
};

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key, value) {
  if (value === null || value === undefined) localStorage.removeItem(key);
  else localStorage.setItem(key, JSON.stringify(value));
}

export const session = {
  getChildToken: () => localStorage.getItem(KEY.childToken),
  getChild: () => read(KEY.childInfo),
  setChild: (child, token) => {
    write(KEY.childInfo, child || null);
    if (token) localStorage.setItem(KEY.childToken, token);
  },
  clearChild: () => {
    localStorage.removeItem(KEY.childToken);
    localStorage.removeItem(KEY.childInfo);
  }
};
