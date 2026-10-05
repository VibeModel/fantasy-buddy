/**
 * 本地数据层 · 模型
 * 忠实移植自 fantasy-buddy-server/src/models/database.js，仅把同步内存操作改为 async IndexedDB。
 * 关键行为（默认值、奖励合并顺序、PIN 锁定、egg 不进化等）一律保持与后端一致。
 */

import { uuid, deviceCode, sixDigitCode } from './ids.js';
import { hashPin, verifyPin } from './crypto.js';
import * as idb from './idb.js';
import { STORE } from './idb.js';

export const CODE_TTL_SECONDS = 600;

async function findBy(store, pred) {
  const all = await idb.getAll(store);
  return all.find(pred) || null;
}

// ==================== 家长账号 ====================
export const Parent = {
  async create(data) {
    const parent = {
      parent_id: uuid(),
      phone: data.phone,
      email: data.email || null,
      password_hash: data.password_hash,
      approval_pin_hash: null,
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
    await idb.put(STORE.parents, parent);
    return parent;
  },

  async findByPhone(phone) {
    return findBy(STORE.parents, (p) => p.phone === phone);
  },

  async findById(parentId) {
    return idb.get(STORE.parents, parentId);
  },

  /** 本地单机版：全应用共用一个家长账号 */
  async ensureLocalParent() {
    const LOCAL_PHONE = '__local__';
    let parent = await this.findByPhone(LOCAL_PHONE);
    if (!parent) parent = await this.create({ phone: LOCAL_PHONE, password_hash: '' });
    return parent;
  },

  async bindChild(parentId, childId) {
    const parent = await this.findById(parentId);
    if (parent && !parent.children_ids.includes(childId)) {
      parent.children_ids.push(childId);
      parent.updated_at = Date.now();
      await idb.put(STORE.parents, parent);
    }
    return parent;
  },

  async updateSettings(parentId, settings) {
    const parent = await this.findById(parentId);
    if (parent) {
      parent.settings = { ...parent.settings, ...settings };
      parent.updated_at = Date.now();
      await idb.put(STORE.parents, parent);
    }
    return parent;
  },

  async setApprovalPin(parentId, pin) {
    const parent = await this.findById(parentId);
    if (parent) {
      parent.approval_pin_hash = hashPin(String(pin));
      parent.approval_pin_attempts = 0;
      parent.approval_pin_locked_until = null;
      parent.updated_at = Date.now();
      await idb.put(STORE.parents, parent);
    }
    return parent;
  },

  /** @returns {{ok: boolean, reason?: 'not_set'|'locked'|'wrong'}} */
  async checkApprovalPin(parentId, pin) {
    const parent = await this.findById(parentId);
    if (!parent || !parent.approval_pin_hash) return { ok: false, reason: 'not_set' };

    if (parent.approval_pin_locked_until && parent.approval_pin_locked_until > Date.now()) {
      return { ok: false, reason: 'locked' };
    }

    if (verifyPin(String(pin || ''), parent.approval_pin_hash)) {
      parent.approval_pin_attempts = 0;
      await idb.put(STORE.parents, parent);
      return { ok: true };
    }

    parent.approval_pin_attempts = (parent.approval_pin_attempts || 0) + 1;
    if (parent.approval_pin_attempts >= 5) {
      parent.approval_pin_locked_until = Date.now() + 5 * 60 * 1000;
      parent.approval_pin_attempts = 0;
      await idb.put(STORE.parents, parent);
      return { ok: false, reason: 'locked' };
    }
    await idb.put(STORE.parents, parent);
    return { ok: false, reason: 'wrong' };
  }
};

// ==================== 儿童账号 ====================
export const Child = {
  async create(data) {
    const child = {
      child_id: uuid(),
      parent_id: data.parent_id,
      nickname: data.nickname,
      avatar_id: data.avatar_id || 'avatar_default',
      level: 1,
      experience: 0,
      game_time_today_minutes: 0,
      device_code: deviceCode(),
      created_at: Date.now(),
      updated_at: Date.now()
    };
    await idb.put(STORE.children, child);
    return child;
  },

  async findById(childId) {
    return idb.get(STORE.children, childId);
  },

  async findByDeviceCode(code) {
    return findBy(STORE.children, (c) => c.device_code === code);
  },

  async addExperience(childId, exp) {
    const child = await this.findById(childId);
    if (child) {
      child.experience += exp;
      const newLevel = Math.floor(child.experience / 100) + 1;
      if (newLevel > child.level) child.level = newLevel;
      child.updated_at = Date.now();
      await idb.put(STORE.children, child);
    }
    return child;
  },

  async updateGameTime(childId, minutes) {
    const child = await this.findById(childId);
    if (child) {
      child.game_time_today_minutes += minutes;
      child.updated_at = Date.now();
      await idb.put(STORE.children, child);
    }
    return child;
  }
};

// ==================== 任务 ====================
export const Task = {
  async create(data) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const task = {
      task_id: uuid(),
      child_id: data.child_id,
      task_template_id: data.task_template_id || 'custom',
      name: data.name,
      description: data.description,
      category: data.category,
      difficulty: data.difficulty || 'easy',
      rewards: {
        fire_fruit: data.rewards?.fire_fruit || 1,
        magic_ball: data.rewards?.magic_ball || 0,
        bubble_lotion: data.rewards?.bubble_lotion || 0,
        exp: data.rewards?.exp || 10,
        ...data.rewards
      },
      status: data.status || 'pending',
      proposed_by: data.proposed_by || null,
      verification: {
        code: null,
        code_expires_at: null,
        verified_by_parent: false,
        verified_at: null,
        reject_reason: null
      },
      child_notes: data.child_notes || '',
      evidence_url: data.evidence_url || null,
      created_at: Date.now(),
      completed_at: null,
      expires_at: today.getTime()
    };
    await idb.put(STORE.tasks, task);
    return task;
  },

  async findById(taskId) {
    return idb.get(STORE.tasks, taskId);
  },

  async findProposedForParent(parentId) {
    const parent = await Parent.findById(parentId);
    if (!parent) return [];
    const tasks = await idb.getAll(STORE.tasks);
    const proposed = tasks.filter(
      (t) => parent.children_ids.includes(t.child_id) && t.status === 'proposed'
    );
    const result = [];
    for (const task of proposed) {
      const child = await Child.findById(task.child_id);
      result.push({ ...task, child_name: child?.nickname || '未知' });
    }
    return result;
  },

  async decide(taskId, action, rewards) {
    const task = await this.findById(taskId);
    if (!task || task.status !== 'proposed') return null;
    if (action === 'approve') {
      if (rewards) task.rewards = { ...task.rewards, ...rewards };
      task.status = 'pending';
    } else {
      task.status = 'rejected';
      task.verification.reject_reason =
        task.verification.reject_reason || '家长未通过该提议';
    }
    task.updated_at = Date.now();
    await idb.put(STORE.tasks, task);
    return task;
  },

  async findTodayByChild(childId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    const todayEnd = today.getTime() + 24 * 60 * 60 * 1000 - 1;

    const tasks = await idb.getAll(STORE.tasks);
    return tasks.filter(
      (t) => t.child_id === childId && t.created_at >= todayStart && t.created_at <= todayEnd
    );
  },

  async findPendingForParent(parentId) {
    const parent = await Parent.findById(parentId);
    if (!parent) return [];
    const tasks = await idb.getAll(STORE.tasks);
    const pending = tasks.filter(
      (t) => parent.children_ids.includes(t.child_id) && t.status === 'awaiting_verification'
    );
    const result = [];
    for (const task of pending) {
      const child = await Child.findById(task.child_id);
      result.push({ ...task, child_name: child?.nickname || '未知' });
    }
    return result;
  },

  async complete(taskId, childNotes = '', evidenceUrl = null) {
    const task = await this.findById(taskId);
    if (task && task.status === 'pending') {
      const code = sixDigitCode();
      task.status = 'awaiting_verification';
      task.child_notes = childNotes;
      task.evidence_url = evidenceUrl;
      task.completed_at = Date.now();
      task.verification = {
        code,
        code_expires_at: Date.now() + CODE_TTL_SECONDS * 1000,
        verified_by_parent: false,
        verified_at: null,
        reject_reason: null
      };
      await idb.put(STORE.tasks, task);
    }
    return task;
  },

  async verify(taskId, action, rejectReason = null) {
    const task = await this.findById(taskId);
    if (task && task.status === 'awaiting_verification') {
      if (action === 'approve') {
        task.status = 'verified';
        task.verification.verified_by_parent = true;
        task.verification.verified_at = Date.now();
      } else if (action === 'reject') {
        task.status = 'rejected';
        task.verification.reject_reason = rejectReason;
      }
      await idb.put(STORE.tasks, task);
    }
    return task;
  },

  async checkVerificationCode(taskId, code) {
    const task = await this.findById(taskId);
    if (!task) return { valid: false, error: '任务不存在' };
    if (task.status !== 'awaiting_verification') {
      return { valid: false, error: '任务状态不正确' };
    }
    if (task.verification.code !== code) return { valid: false, error: '验证码错误' };
    if (Date.now() > task.verification.code_expires_at) {
      return { valid: false, error: '验证码已过期' };
    }
    return { valid: true };
  }
};

// ==================== 生物 ====================
export const Creature = {
  async create(data) {
    const creature = {
      creature_id: uuid(),
      child_id: data.child_id,
      creature_type: data.creature_type || 'dragon',
      name: data.name || '小火龙',
      stage: 'egg',
      level: 1,
      experience: 0,
      attributes: { hunger: 100, cleanliness: 100, mood: 100, intimacy: 0 },
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
    await idb.put(STORE.creatures, creature);
    return creature;
  },

  async findByChild(childId) {
    return findBy(STORE.creatures, (c) => c.child_id === childId);
  },

  async feed(creatureId, materialType, quantity = 1) {
    const creature = await idb.get(STORE.creatures, creatureId);
    if (!creature || !creature.inventory[materialType]) return null;

    creature.inventory[materialType] -= quantity;
    if (creature.inventory[materialType] < 0) creature.inventory[materialType] = 0;

    const hungerIncrease = materialType === 'fire_fruit' ? 25 : 15;
    creature.attributes.hunger = Math.min(100, creature.attributes.hunger + hungerIncrease);
    creature.attributes.intimacy = Math.min(1000, creature.attributes.intimacy + 5);
    creature.experience += 10;
    this.checkLevelUp(creature);

    creature.last_interaction_at = Date.now();
    creature.updated_at = Date.now();
    await idb.put(STORE.creatures, creature);
    return creature;
  },

  async play(creatureId, toyType) {
    const creature = await idb.get(STORE.creatures, creatureId);
    if (!creature || !creature.inventory[toyType]) return null;

    creature.inventory[toyType] -= 1;
    if (creature.inventory[toyType] < 0) creature.inventory[toyType] = 0;

    creature.attributes.mood = Math.min(100, creature.attributes.mood + 30);
    creature.attributes.intimacy = Math.min(1000, creature.attributes.intimacy + 15);
    creature.experience += 15;
    this.checkLevelUp(creature);

    creature.last_interaction_at = Date.now();
    creature.updated_at = Date.now();
    await idb.put(STORE.creatures, creature);
    return creature;
  },

  async bath(creatureId, materialType = 'bubble_lotion') {
    const creature = await idb.get(STORE.creatures, creatureId);
    if (!creature || !creature.inventory[materialType] || creature.inventory[materialType] < 1) {
      return null;
    }

    creature.inventory[materialType] -= 1;
    creature.attributes.cleanliness = Math.min(100, creature.attributes.cleanliness + 40);
    creature.attributes.mood = Math.min(100, creature.attributes.mood + 10);
    creature.experience += 5;
    this.checkLevelUp(creature);

    creature.last_interaction_at = Date.now();
    creature.updated_at = Date.now();
    await idb.put(STORE.creatures, creature);
    return creature;
  },

  async addRewards(creatureId, rewards) {
    const creature = await idb.get(STORE.creatures, creatureId);
    if (!creature) return null;

    for (const [material, quantity] of Object.entries(rewards)) {
      if (material !== 'exp' && creature.inventory[material] !== undefined) {
        creature.inventory[material] += quantity;
      }
    }
    if (rewards.exp) {
      creature.experience += rewards.exp;
      this.checkLevelUp(creature);
    }
    creature.attributes.intimacy = Math.min(1000, creature.attributes.intimacy + 5);
    creature.attributes.mood = Math.min(100, creature.attributes.mood + 10);
    creature.updated_at = Date.now();
    await idb.put(STORE.creatures, creature);
    return creature;
  },

  /** 经验达到阈值时推进成长阶段：蛋(0) → 幼崽(100) → 成体(500) → 传说(1000) */
  checkLevelUp(creature) {
    const newLevel = Math.floor(creature.experience / 100) + 1;
    if (creature.stage === 'egg' && creature.experience >= 100) {
      creature.stage = 'baby';
    }
    if (creature.stage === 'baby' && creature.experience >= 500) {
      creature.stage = 'adult';
    }
    if (creature.stage === 'adult' && creature.experience >= 1000) {
      creature.stage = 'legendary';
    }
    if (newLevel > creature.level) creature.level = newLevel;
  }
};

// ==================== 验证记录 ====================
export const VerificationRecord = {
  async create(data) {
    const record = {
      record_id: uuid(),
      parent_id: data.parent_id,
      task_id: data.task_id,
      child_id: data.child_id,
      code: data.code,
      status: 'pending',
      created_at: Date.now(),
      expires_at: data.expires_at,
      verified_at: null,
      rejected_reason: null
    };
    await idb.put(STORE.verification_records, record);
    return record;
  },

  async findByTask(taskId) {
    return findBy(STORE.verification_records, (r) => r.task_id === taskId);
  }
};
