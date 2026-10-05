/**
 * 极简 IndexedDB Promise 封装 + 库结构定义
 * 数据量很小，统一用"读全表 + 内存过滤"，不依赖索引查询。
 */

const DB_NAME = 'fantasy_buddy';
const DB_VERSION = 1;

export const STORE = {
  parents: 'parents',
  children: 'children',
  tasks: 'tasks',
  creatures: 'creatures',
  verification_records: 'verification_records',
  meta: 'meta'
};

let dbPromise = null;

function upgrade(db) {
  if (!db.objectStoreNames.contains(STORE.parents)) {
    db.createObjectStore(STORE.parents, { keyPath: 'parent_id' });
  }
  if (!db.objectStoreNames.contains(STORE.children)) {
    const s = db.createObjectStore(STORE.children, { keyPath: 'child_id' });
    s.createIndex('by_device_code', 'device_code', { unique: true });
    s.createIndex('by_parent', 'parent_id');
  }
  if (!db.objectStoreNames.contains(STORE.tasks)) {
    const s = db.createObjectStore(STORE.tasks, { keyPath: 'task_id' });
    s.createIndex('by_child_created', ['child_id', 'created_at']);
    s.createIndex('by_child_status', ['child_id', 'status']);
  }
  if (!db.objectStoreNames.contains(STORE.creatures)) {
    const s = db.createObjectStore(STORE.creatures, { keyPath: 'creature_id' });
    s.createIndex('by_child', 'child_id', { unique: true });
  }
  if (!db.objectStoreNames.contains(STORE.verification_records)) {
    const s = db.createObjectStore(STORE.verification_records, { keyPath: 'record_id' });
    s.createIndex('by_task', 'task_id');
  }
  if (!db.objectStoreNames.contains(STORE.meta)) {
    db.createObjectStore(STORE.meta, { keyPath: 'key' });
  }
}

export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => upgrade(req.result);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function get(store, key) {
  const db = await openDB();
  return reqToPromise(db.transaction(store, 'readonly').objectStore(store).get(key));
}

export async function put(store, value) {
  const db = await openDB();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).put(value);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(value);
    tx.onerror = () => reject(tx.error);
  });
}

export async function del(store, key) {
  const db = await openDB();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).delete(key);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAll(store) {
  const db = await openDB();
  return reqToPromise(db.transaction(store, 'readonly').objectStore(store).getAll());
}

export async function clear(store) {
  const db = await openDB();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).clear();
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAll() {
  await Promise.all(Object.values(STORE).map((s) => clear(s)));
}
