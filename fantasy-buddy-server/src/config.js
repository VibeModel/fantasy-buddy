/**
 * 运行时配置（可用环境变量覆盖）
 */
module.exports = {
  // 任务验证码有效期（秒），默认 10 分钟。
  // 需要快速验证"过期态"时可临时调小，例如：CODE_TTL_SECONDS=5 npm start
  CODE_TTL_SECONDS: Number(process.env.CODE_TTL_SECONDS || 600)
};
