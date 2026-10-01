/**
 * 《奇幻小伙伴》HTTP API 服务器
 * 基于 DESIGN_DOCUMENT.md 设计方案实现
 */

const express = require('express');
const cors = require('cors');
const childRoutes = require('./routes/child');
const parentRoutes = require('./routes/parent');
const commonRoutes = require('./routes/common');
const { errorHandler } = require('./middleware/errorHandler');
const { rateLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json({ limit: '2mb' })); // 允许任务完成凭据（照片 data URL）上传
app.use(rateLimiter);

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      service: 'fantasy-buddy-api',
      version: '1.0.0',
      timestamp: Date.now()
    }
  });
});

// API 路由
app.use('/v1/child', childRoutes);
app.use('/v1/parent', parentRoutes);
app.use('/v1/common', commonRoutes);

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    code: 404,
    message: 'API 端点不存在',
    timestamp: Date.now()
  });
});

// 错误处理
app.use(errorHandler);

// 启动服务器
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════╗
║     🌟 《奇幻小伙伴》API 服务器已启动 🌟           ║
╠════════════════════════════════════════════════════╣
║  地址: http://localhost:${PORT}                      ║
║  儿童端: /v1/child/*                               ║
║  家长端: /v1/parent/*                              ║
║  通用:   /v1/common/*                              ║
╚════════════════════════════════════════════════════╝
  `);
});

module.exports = app;