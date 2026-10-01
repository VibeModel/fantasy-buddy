/**
 * 错误处理中间件
 */

/**
 * 统一错误响应格式
 */
function errorHandler(err, req, res, next) {
  console.error('[错误]', err.stack || err.message);
  
  // 默认错误
  let status = 500;
  let code = 5000;
  let message = '服务器内部错误';
  
  // 根据错误类型设置状态码和消息
  if (err.name === 'ValidationError') {
    status = 400;
    code = 1001;
    message = err.message;
  } else if (err.name === 'UnauthorizedError') {
    status = 401;
    code = 1002;
    message = '未授权访问';
  } else if (err.name === 'ForbiddenError') {
    status = 403;
    code = 1003;
    message = '无权限访问';
  } else if (err.code === 'TASK_NOT_FOUND') {
    status = 404;
    code = 1006;
    message = '任务不存在';
  } else if (err.code === 'VERIFICATION_CODE_INVALID') {
    status = 400;
    code = 1004;
    message = '验证码错误';
  } else if (err.code === 'VERIFICATION_CODE_EXPIRED') {
    status = 400;
    code = 1005;
    message = '验证码已过期';
  } else if (err.code === 'REWARD_ALREADY_CLAIMED') {
    status = 400;
    code = 1007;
    message = '奖励已领取';
  } else if (err.customMessage) {
    message = err.customMessage;
  }
  
  res.status(status).json({
    success: false,
    code: code,
    message: message,
    timestamp: Date.now()
  });
}

/**
 * 404 处理
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    code: 404,
    message: '请求的资源不存在',
    timestamp: Date.now()
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};