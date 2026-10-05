/**
 * 本地数据层的错误工厂
 * 复刻后端错误语义：抛出的 Error 带 .code 与 .status，页面依赖它们做分支。
 */

export function fail(status, code, message) {
  const err = new Error(message);
  err.code = code;
  err.status = status;
  throw err;
}
