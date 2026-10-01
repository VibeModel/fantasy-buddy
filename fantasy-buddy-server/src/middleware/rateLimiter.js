/**
 * 限流中间件
 */

const requestCounts = new Map();

function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1分钟窗口
  const maxRequests = 100; // 每分钟最多100次请求
  
  // 获取或初始化计数
  let countData = requestCounts.get(ip);
  if (!countData || now - countData.windowStart > windowMs) {
    countData = { count: 0, windowStart: now };
    requestCounts.set(ip, countData);
  }
  
  countData.count++;
  
  // 设置限流头
  res.set({
    'X-RateLimit-Limit': maxRequests,
    'X-RateLimit-Remaining': Math.max(0, maxRequests - countData.count),
    'X-RateLimit-Reset': Math.ceil((countData.windowStart + windowMs) / 1000)
  });
  
  if (countData.count > maxRequests) {
    return res.status(429).json({
      success: false,
      code: 429,
      message: '请求过于频繁，请稍后再试',
      timestamp: Date.now()
    });
  }
  
  next();
}

module.exports = {
  rateLimiter
};