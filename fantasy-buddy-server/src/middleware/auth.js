/**
 * 认证中间件
 */

const { db, Parent } = require('../models/database');

/**
 * 解析并验证Token
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const appType = req.headers['x-app-type'];
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      code: 1002,
      message: '缺少认证令牌',
      timestamp: Date.now()
    });
  }
  
  const token = authHeader.substring(7);
  const tokenData = db.tokens.get(token);
  
  if (!tokenData) {
    return res.status(401).json({
      success: false,
      code: 1002,
      message: 'Token无效或已过期',
      timestamp: Date.now()
    });
  }
  
  if (tokenData.expires_at < Date.now()) {
    db.tokens.delete(token);
    return res.status(401).json({
      success: false,
      code: 1002,
      message: 'Token已过期',
      timestamp: Date.now()
    });
  }
  
  // 检查应用类型
  if (appType && tokenData.type !== appType) {
    return res.status(403).json({
      success: false,
      code: 1003,
      message: '应用类型不匹配',
      timestamp: Date.now()
    });
  }
  
  // 将用户信息附加到请求
  req.user = {
    id: tokenData.id,
    type: tokenData.type,
    parent_id: tokenData.parent_id,
    child_id: tokenData.child_id
  };
  
  next();
}

/**
 * 儿童端认证
 */
function authenticateChild(req, res, next) {
  req.headers['x-app-type'] = 'child';
  authenticate(req, res, next);
}

/**
 * 家长端认证
 * 本地单机版：无需登录，直接绑定到唯一的本地家长账号
 */
function attachLocalParent(req, res, next) {
  try {
    const parent = Parent.ensureLocalParent();
    req.user = { id: parent.parent_id, type: 'parent' };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * 生成Token
 */
function generateToken(userId, type, parentId = null, childId = null) {
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { userId, type, parentId, childId },
    'fantasy-buddy-secret-key',
    { expiresIn: '7d' }
  );
  
  db.tokens.set(token, {
    id: userId,
    type: type,
    parent_id: parentId,
    child_id: childId,
    expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7天
  });
  
  return token;
}

module.exports = {
  authenticate,
  authenticateChild,
  attachLocalParent,
  generateToken
};