/**
 * API 客户端 + 本地会话存储
 * 所有请求经 Vite 代理转发到后端 /v1
 */

const BASE = '/v1';

const KEY = {
  parentToken: 'fb_parent_token',
  parentInfo: 'fb_parent_info',
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
  getParentToken: () => localStorage.getItem(KEY.parentToken),
  getParent: () => read(KEY.parentInfo),
  setParent: (parent, token) => {
    write(KEY.parentInfo, parent || null);
    if (token) localStorage.setItem(KEY.parentToken, token);
  },
  getChildToken: () => localStorage.getItem(KEY.childToken),
  getChild: () => read(KEY.childInfo),
  setChild: (child, token) => {
    write(KEY.childInfo, child || null);
    if (token) localStorage.setItem(KEY.childToken, token);
  },
  clearParent: () => {
    localStorage.removeItem(KEY.parentToken);
    localStorage.removeItem(KEY.parentInfo);
  },
  clearChild: () => {
    localStorage.removeItem(KEY.childToken);
    localStorage.removeItem(KEY.childInfo);
  }
};

async function request(method, path, { body, role } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  if (role === 'parent') {
    const token = session.getParentToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    headers['X-App-Type'] = 'parent';
  } else if (role === 'child') {
    const token = session.getChildToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    headers['X-App-Type'] = 'child';
  }

  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (networkErr) {
    const err = new Error('无法连接服务器，请确认后端已启动');
    err.code = 'NETWORK';
    throw err;
  }

  let payload = {};
  try {
    payload = await res.json();
  } catch {
    payload = {};
  }

  if (!res.ok || payload.success === false) {
    const err = new Error(payload.message || `请求失败 (${res.status})`);
    err.code = payload.code;
    err.status = res.status;
    throw err;
  }

  return payload.data;
}

export const api = {
  // ---------- 通用 ----------
  register: (phone, password) =>
    request('POST', '/common/auth/register', { body: { phone, password } }),
  login: (phone, password) =>
    request('POST', '/common/auth/login', { body: { phone, password } }),
  childLogin: (device_code) =>
    request('POST', '/common/auth/child-login', { body: { device_code } }),
  bindChild: (body) =>
    request('POST', '/common/parent/bind-child', { body, role: 'parent' }),
  taskTemplates: (category) =>
    request('GET', `/common/task-templates${category ? `?category=${category}` : ''}`),

  // ---------- 儿童端 ----------
  childToday: () => request('GET', '/child/tasks/today', { role: 'child' }),
  completeTask: (taskId, notes, evidenceUrl) =>
    request('POST', `/child/tasks/${taskId}/complete`, {
      body: { notes, evidence_url: evidenceUrl || null },
      role: 'child'
    }),
  verificationStatus: (taskId) =>
    request('GET', `/child/tasks/${taskId}/verification-status`, { role: 'child' }),
  resendCode: (taskId) =>
    request('POST', `/child/tasks/${taskId}/resend-code`, { role: 'child' }),
  claimReward: (taskId) =>
    request('POST', `/child/tasks/${taskId}/claim-reward`, { body: {}, role: 'child' }),
  inventory: () => request('GET', '/child/inventory', { role: 'child' }),
  feed: (material_type, quantity = 1) =>
    request('POST', '/child/creature/feed', { body: { material_type, quantity }, role: 'child' }),
  play: (toy_type) =>
    request('POST', '/child/creature/play', { body: { toy_type }, role: 'child' }),
  bath: (material_type = 'bubble_lotion') =>
    request('POST', '/child/creature/bath', { body: { material_type }, role: 'child' }),
  creatureStatus: () => request('GET', '/child/creature/status', { role: 'child' }),

  // ---------- 家长端 ----------
  parentChildren: () => request('GET', '/parent/children', { role: 'parent' }),
  pendingTasks: () => request('GET', '/parent/tasks/pending', { role: 'parent' }),
  verifyTask: (taskId, body) =>
    request('POST', `/parent/tasks/${taskId}/verify`, { body, role: 'parent' }),
  addTask: (body) => request('POST', '/parent/tasks', { body, role: 'parent' }),
  setDailyPlan: (childId, body) =>
    request('PUT', `/parent/children/${childId}/daily-tasks`, { body, role: 'parent' }),
  report: (childId, period = 'week') =>
    request('GET', `/parent/children/${childId}/reports?period=${period}`, { role: 'parent' }),
  childCreature: (childId) =>
    request('GET', `/parent/children/${childId}/creature`, { role: 'parent' }),
  getSettings: () => request('GET', '/parent/settings', { role: 'parent' }),
  updateSettings: (body) => request('PUT', '/parent/settings', { body, role: 'parent' })
};
