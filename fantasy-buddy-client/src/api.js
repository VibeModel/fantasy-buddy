/**
 * API 门面
 * 按构建期环境变量 VITE_DATA_SOURCE 选择数据源：
 *   - local（默认）：纯前端 IndexedDB，无需后端
 *   - server：走 /v1 HTTP（开发/兼容用途）
 * 页面统一从这里 `import { api, session }`，两种模式方法签名完全一致。
 */

import { session } from './session.js';
import { serverApi } from './serverApi.js';
import { localApi } from './localdb/localApi.js';

const SOURCE = import.meta.env.VITE_DATA_SOURCE === 'server' ? 'server' : 'local';

export const DATA_SOURCE = SOURCE;
export { session };
export const api = SOURCE === 'server' ? serverApi : localApi;
