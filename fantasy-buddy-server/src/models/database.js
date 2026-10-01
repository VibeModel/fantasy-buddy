/**
 * 《奇幻小伙伴》数据模型
 * 基于 DESIGN_DOCUMENT.md 6.数据模型设计
 */

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { CODE_TTL_SECONDS } = require('../config');
const db = require('./inMemoryDB');

// ==================== 家长账号模型 ====================
const Parent = {
  /**
   * 创建家长账号
   */
  create(data) {
    const parent = {
      parent_id: uuidv4(),
      phone: data.phone,
      email: data.email || null,
      password_hash: data.password_hash,
      approval_pin_hash: null, // 家长自设的 6 位审批密码（哈希存储）
      approval_pin_attempts: 0,
      approval_pin_locked_until: null,
      children_ids: [],
      settings: {
        verify_mode: 'strict',
        auto_verify_easy_tasks: false,
        daily_game_time_limit: 60,
        notification_enabled: true,
        night_lock_start: '21:00',
        night_lock_end: '07:00',
        ...data.settings
      },
      created_at: Date.now(),
      updated_at: Date.now()
    };
    db.parents.set(parent.parent_id, parent);
    return parent;
  },

  /**
   * 根据手机号查找
   */
  findByPhone(phone) {
    for (const parent of db.parents.values()) {
      if (parent.phone === phone) return parent;
    }
    return null;
  },

  /**
   * 根据ID查找
   */
  findById(parentId) {
    return db.parents.get(parentId) || null;
  },

  /**
   * 获取（或创建）本地家长账号
   * 本地单机版：家长端无需注册/登录，全应用共用一个家长账号
   */
  ensureLocalParent() {
    const LOCAL_PHONE = '__local__';
    let parent = this.findByPhone(LOCAL_PHONE);
    if (!parent) {
      parent = this.create({ phone: LOCAL_PHONE, password_hash: '' });
    }
    return parent;
  },

  /**
   * 绑定孩子账号
   */
  bindChild(parentId, childId) {
    const parent = this.findById(parentId);
    if (parent && !parent.children_ids.includes(childId)) {
      parent.children_ids.push(childId);
      parent.updated_at = Date.now();
    }
  },

  /**
   * 更新设置
   */
  updateSettings(parentId, settings) {
    const parent = this.findById(parentId);
    if (parent) {
      parent.settings = { ...parent.settings, ...settings };
      parent.updated_at = Date.now();
    }
    return parent;
  },

  /**
   * 设置/重置审批密码（6位数字）
   */
  setApprovalPin(parentId, pin) {
    const parent = this.findById(parentId);
    if (parent) {
      parent.approval_pin_hash = bcrypt.hashSync(String(pin), 10);
      parent.approval_pin_attempts = 0;
      parent.approval_pin_locked_until = null;
      parent.updated_at = Date.now();
    }
    return parent;
  },

  /**
   * 校验审批密码（连续错误 5 次锁定 5 分钟）
   * @returns {{ok: boolean, reason?: 'not_set'|'locked'|'wrong'}}
   */
  checkApprovalPin(parentId, pin) {
    const parent = this.findById(parentId);
    if (!parent || !parent.approval_pin_hash) return { ok: false, reason: 'not_set' };

    if (parent.approval_pin_locked_until && parent.approval_pin_locked_until > Date.now()) {
      return { ok: false, reason: 'locked' };
    }

    if (bcrypt.compareSync(String(pin || ''), parent.approval_pin_hash)) {
      parent.approval_pin_attempts = 0;
      return { ok: true };
    }

    parent.approval_pin_attempts = (parent.approval_pin_attempts || 0) + 1;
    if (parent.approval_pin_attempts >= 5) {
      parent.approval_pin_locked_until = Date.now() + 5 * 60 * 1000;
      parent.approval_pin_attempts = 0;
      return { ok: false, reason: 'locked' };
    }
    return { ok: false, reason: 'wrong' };
  }
};

// ==================== 儿童账号模型 ====================
const Child = {
  /**
   * 创建儿童账号
   */
  create(data) {
    const child = {
      child_id: uuidv4(),
      parent_id: data.parent_id,
      nickname: data.nickname,
      avatar_id: data.avatar_id || 'avatar_default',
      level: 1,
      experience: 0,
      game_time_today_minutes: 0,
      device_code: this.generateDeviceCode(),
      created_at: Date.now(),
      updated_at: Date.now()
    };
    db.children.set(child.child_id, child);
    return child;
  },

  /**
   * 生成设备码（6位）
   */
  generateDeviceCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  },

  /**
   * 根据ID查找
   */
  findById(childId) {
    return db.children.get(childId) || null;
  },

  /**
   * 根据设备码查找
   */
  findByDeviceCode(code) {
    for (const child of db.children.values()) {
      if (child.device_code === code) return child;
    }
    return null;
  },

  /**
   * 添加经验值
   */
  addExperience(childId, exp) {
    const child = this.findById(childId);
    if (child) {
      child.experience += exp;
      // 检查升级（每100经验升1级）
      const newLevel = Math.floor(child.experience / 100) + 1;
      if (newLevel > child.level) {
        child.level = newLevel;
      }
      child.updated_at = Date.now();
    }
    return child;
  },

  /**
   * 更新游戏时长
   */
  updateGameTime(childId, minutes) {
    const child = this.findById(childId);
    if (child) {
      child.game_time_today_minutes += minutes;
      child.updated_at = Date.now();
    }
    return child;
  }
};

// ==================== 任务模型 ====================
const Task = {
  /**
   * 创建任务
   */
  create(data) {
    // 解析日期，获取当天结束时间
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const task = {
      task_id: uuidv4(),
      child_id: data.child_id,
      task_template_id: data.task_template_id || 'custom',
      name: data.name,
      description: data.description,
      category: data.category, // study | housework | habit | challenge | entertainment
      difficulty: data.difficulty || 'easy', // easy | medium | hard | challenge
      rewards: {
        fire_fruit: data.rewards?.fire_fruit || 1,
        magic_ball: data.rewards?.magic_ball || 0,
        bubble_lotion: data.rewards?.bubble_lotion || 0,
        exp: data.rewards?.exp || 10,
        ...data.rewards
      },
      status: 'pending', // pending | completed | awaiting_verification | verified | rejected
      verification: {
        code: null,
        code_expires_at: null,
        verified_by_parent: false,
        verified_at: null,
        reject_reason: null
      },
      child_notes: data.child_notes || '',
      evidence_url: data.evidence_url || null, // 完成凭据：照片(data URL) 等
      created_at: Date.now(),
      completed_at: null,
      expires_at: today.getTime()
    };
    db.tasks.set(task.task_id, task);
    return task;
  },

  /**
   * 根据ID查找
   */
  findById(taskId) {
    return db.tasks.get(taskId) || null;
  },

  /**
   * 获取孩子的今日任务
   */
  findTodayByChild(childId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    const todayEnd = today.getTime() + 24 * 60 * 60 * 1000 - 1;

    const tasks = [];
    for (const task of db.tasks.values()) {
      if (task.child_id === childId && 
          task.created_at >= todayStart && 
          task.created_at <= todayEnd) {
        tasks.push(task);
      }
    }
    return tasks;
  },

  /**
   * 获取待验证任务
   */
  findPendingForParent(parentId) {
    // 首先获取该家长的所有孩子
    const parent = Parent.findById(parentId);
    if (!parent) return [];

    const pendingTasks = [];
    for (const task of db.tasks.values()) {
      if (parent.children_ids.includes(task.child_id) && 
          task.status === 'awaiting_verification') {
        const child = Child.findById(task.child_id);
        pendingTasks.push({
          ...task,
          child_name: child?.nickname || '未知'
        });
      }
    }
    return pendingTasks;
  },

  /**
   * 完成任务并生成验证码
   */
  complete(taskId, childNotes = '', evidenceUrl = null) {
    const task = this.findById(taskId);
    if (task && task.status === 'pending') {
      // 生成6位验证码
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      task.status = 'awaiting_verification';
      task.child_notes = childNotes;
      task.evidence_url = evidenceUrl;
      task.completed_at = Date.now();
      task.verification = {
        code: code,
        code_expires_at: Date.now() + CODE_TTL_SECONDS * 1000,
        verified_by_parent: false,
        verified_at: null,
        reject_reason: null
      };
    }
    return task;
  },

  /**
   * 验证任务（家长操作）
   */
  verify(taskId, action, rejectReason = null) {
    const task = this.findById(taskId);
    if (task && task.status === 'awaiting_verification') {
      if (action === 'approve') {
        task.status = 'verified';
        task.verification.verified_by_parent = true;
        task.verification.verified_at = Date.now();
      } else if (action === 'reject') {
        task.status = 'rejected';
        task.verification.reject_reason = rejectReason;
      }
    }
    return task;
  },

  /**
   * 检查验证码
   */
  checkVerificationCode(taskId, code) {
    const task = this.findById(taskId);
    if (!task) return { valid: false, error: '任务不存在' };
    if (task.status !== 'awaiting_verification') {
      return { valid: false, error: '任务状态不正确' };
    }
    if (task.verification.code !== code) {
      return { valid: false, error: '验证码错误' };
    }
    if (Date.now() > task.verification.code_expires_at) {
      return { valid: false, error: '验证码已过期' };
    }
    return { valid: true };
  }
};

// ==================== 生物模型 ====================
const Creature = {
  /**
   * 创建生物
   */
  create(data) {
    const creature = {
      creature_id: uuidv4(),
      child_id: data.child_id,
      creature_type: data.creature_type || 'dragon', // dragon | unicorn | turtle | butterfly | lion
      name: data.name || '小火龙',
      stage: 'egg', // egg | baby | adult | legendary
      level: 1,
      experience: 0,
      attributes: {
        hunger: 100, // 0-100 饱食度
        cleanliness: 100, // 0-100 清洁度
        mood: 100, // 0-100 心情值
        intimacy: 0 // 0-1000 亲密度
      },
      skills: [],
      inventory: {
        fire_fruit: 0,
        magic_ball: 0,
        bubble_lotion: 0,
        fire_stone: 0,
        dragon_scale: 0
      },
      last_interaction_at: Date.now(),
      created_at: Date.now(),
      updated_at: Date.now()
    };
    db.creatures.set(creature.creature_id, creature);
    return creature;
  },

  /**
   * 根据孩子ID查找生物
   */
  findByChild(childId) {
    for (const creature of db.creatures.values()) {
      if (creature.child_id === childId) return creature;
    }
    return null;
  },

  /**
   * 喂食
   */
  feed(creatureId, materialType, quantity = 1) {
    const creature = db.creatures.get(creatureId);
    if (!creature || !creature.inventory[materialType]) {
      return null;
    }

    // 减少材料
    creature.inventory[materialType] -= quantity;
    if (creature.inventory[materialType] < 0) {
      creature.inventory[materialType] = 0;
    }

    // 增加饱食度（每使用1个食物恢复25点）
    const hungerIncrease = materialType === 'fire_fruit' ? 25 : 15;
    creature.attributes.hunger = Math.min(100, creature.attributes.hunger + hungerIncrease);
    
    // 增加亲密度
    creature.attributes.intimacy = Math.min(1000, creature.attributes.intimacy + 5);
    
    // 增加经验
    creature.experience += 10;
    this.checkLevelUp(creature);

    creature.last_interaction_at = Date.now();
    creature.updated_at = Date.now();

    return creature;
  },

  /**
   * 玩耍互动
   */
  play(creatureId, toyType) {
    const creature = db.creatures.get(creatureId);
    if (!creature || !creature.inventory[toyType]) {
      return null;
    }

    // 减少玩具
    creature.inventory[toyType] -= 1;
    if (creature.inventory[toyType] < 0) {
      creature.inventory[toyType] = 0;
    }

    // 增加心情
    creature.attributes.mood = Math.min(100, creature.attributes.mood + 30);
    
    // 增加亲密度
    creature.attributes.intimacy = Math.min(1000, creature.attributes.intimacy + 15);
    
    // 增加经验
    creature.experience += 15;
    this.checkLevelUp(creature);

    creature.last_interaction_at = Date.now();
    creature.updated_at = Date.now();

    return creature;
  },

  /**
   * 洗澡
   */
  bath(creatureId, materialType = 'bubble_lotion') {
    const creature = db.creatures.get(creatureId);
    if (!creature || !creature.inventory[materialType] || creature.inventory[materialType] < 1) {
      return null;
    }

    // 减少清洁剂
    creature.inventory[materialType] -= 1;

    // 增加清洁度
    creature.attributes.cleanliness = Math.min(100, creature.attributes.cleanliness + 40);
    
    // 增加心情（洗完澡很舒服）
    creature.attributes.mood = Math.min(100, creature.attributes.mood + 10);
    
    // 增加经验
    creature.experience += 5;
    this.checkLevelUp(creature);

    creature.last_interaction_at = Date.now();
    creature.updated_at = Date.now();

    return creature;
  },

  /**
   * 发放奖励
   */
  addRewards(creatureId, rewards) {
    const creature = db.creatures.get(creatureId);
    if (!creature) return null;

    for (const [material, quantity] of Object.entries(rewards)) {
      if (material !== 'exp' && creature.inventory[material] !== undefined) {
        creature.inventory[material] += quantity;
      }
    }

    // 增加经验
    if (rewards.exp) {
      creature.experience += rewards.exp;
      this.checkLevelUp(creature);
    }

    // 增加亲密度
    creature.attributes.intimacy = Math.min(1000, creature.attributes.intimacy + 5);
    
    // 更新心情
    creature.attributes.mood = Math.min(100, creature.attributes.mood + 10);

    creature.updated_at = Date.now();
    return creature;
  },

  /**
   * 检查升级
   */
  checkLevelUp(creature) {
    const newLevel = Math.floor(creature.experience / 100) + 1;
    
    // 检查进化阶段
    if (creature.experience >= 500 && creature.stage === 'baby') {
      creature.stage = 'adult';
    } else if (creature.experience >= 1000 && creature.stage === 'adult') {
      creature.stage = 'legendary';
    }

    if (newLevel > creature.level) {
      creature.level = newLevel;
    }
  }
};

// ==================== 验证记录模型 ====================
const VerificationRecord = {
  /**
   * 创建验证记录
   */
  create(data) {
    const record = {
      record_id: uuidv4(),
      parent_id: data.parent_id,
      task_id: data.task_id,
      child_id: data.child_id,
      code: data.code,
      status: 'pending', // pending | verified | expired | rejected
      created_at: Date.now(),
      expires_at: data.expires_at,
      verified_at: null,
      rejected_reason: null
    };
    db.verification_records.set(record.record_id, record);
    return record;
  },

  /**
   * 根据任务ID查找
   */
  findByTask(taskId) {
    for (const record of db.verification_records.values()) {
      if (record.task_id === taskId) return record;
    }
    return null;
  }
};

// ==================== 消息通知模型 ====================
const Notification = {
  /**
   * 创建通知
   */
  create(data) {
    const notification = {
      notification_id: uuidv4(),
      parent_id: data.parent_id,
      child_id: data.child_id,
      type: data.type, // task_complete | verification_success | verification_failed
      title: data.title,
      content: data.content,
      read: false,
      created_at: Date.now()
    };
    db.notifications.set(notification.notification_id, notification);
    return notification;
  },

  /**
   * 获取家长的未读通知
   */
  getUnreadForParent(parentId) {
    const notifications = [];
    for (const notif of db.notifications.values()) {
      if (notif.parent_id === parentId && !notif.read) {
        notifications.push(notif);
      }
    }
    return notifications;
  }
};

module.exports = {
  Parent,
  Child,
  Task,
  Creature,
  VerificationRecord,
  Notification,
  db
};