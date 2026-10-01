/**
 * 内存数据库 - 模拟持久化存储
 * 用于开发/测试环境
 */

const db = {
  // 家长账号
  parents: new Map(),
  
  // 儿童账号
  children: new Map(),
  
  // 任务
  tasks: new Map(),
  
  // 生物
  creatures: new Map(),
  
  // 验证码记录
  verification_records: new Map(),
  
  // 通知
  notifications: new Map(),
  
  // 认证令牌（token -> { parent_id/child_id, type, expires_at }）
  tokens: new Map(),
  
  // 清理过期数据
  cleanupExpired() {
    const now = Date.now();
    
    // 清理过期验证码（24小时前）
    for (const [id, record] of this.verification_records.entries()) {
      if (record.expires_at < now - 24 * 60 * 60 * 1000) {
        this.verification_records.delete(id);
      }
    }
    
    // 清理过期令牌
    for (const [token, data] of this.tokens.entries()) {
      if (data.expires_at < now) {
        this.tokens.delete(token);
      }
    }
    
    console.log(`[数据库清理] 当前数据量: 家长 ${this.parents.size}, 儿童 ${this.children.size}, 任务 ${this.tasks.size}, 生物 ${this.creatures.size}`);
  }
};

// 每小时清理一次过期数据
setInterval(() => {
  db.cleanupExpired();
}, 60 * 60 * 1000);

module.exports = db;