/**
 * 本地模式数据源（IndexedDB）
 * 复刻 fantasy-buddy-server 的 routes/{common,child,parent}.js 全部端点：
 * 同一套方法签名、同一套返回结构、同一套错误码。
 * 儿童身份从 session（localStorage）取得；家长为单例本地账号。
 */

import { session } from '../session.js';
import { Parent, Child, Task, Creature, VerificationRecord, CODE_TTL_SECONDS } from './models.js';
import { fail } from './errors.js';
import { uuid } from './ids.js';
import * as idb from './idb.js';
import {
  MATERIALS,
  CREATURE_TYPES,
  CHILD_TASK_CATEGORIES,
  CHILD_REWARD_KEYS,
  CATEGORY_LABEL,
  CATEGORY_LABELS,
  TASK_TEMPLATES,
  findTemplate
} from './catalog.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// ---------- 通用小工具 ----------
function todayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dateString(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isWeekend(date = new Date()) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function formatTask(task) {
  return {
    task_id: task.task_id,
    name: task.name,
    description: task.description,
    category: task.category,
    difficulty: task.difficulty,
    status: task.status,
    rewards: task.rewards,
    expires_at: new Date(task.expires_at).toISOString(),
    can_claim: task.status === 'verified' && !task.reward_claimed,
    verification_required: true
  };
}

function evaluateHealth(tasks, date = new Date()) {
  const weekend = isWeekend(date);
  const maxStudy = weekend ? 4 : 3;
  const counts = { study: 0, sport: 0, entertainment: 0, housework: 0, habit: 0 };
  for (const task of tasks) {
    if (counts[task.category] !== undefined) counts[task.category]++;
  }
  const warnings = [];
  if (counts.study > maxStudy) {
    warnings.push(`建议${weekend ? '周末' : '平时'}学习任务不超过${maxStudy}个（当前${counts.study}个）`);
  }
  if (counts.sport < 1) warnings.push('需先添加至少1个运动任务');
  if (weekend && counts.entertainment < 1) warnings.push('建议周末安排至少1个娱乐任务');
  return { weekend, maxStudy, counts, warnings, blocking: counts.sport < 1 };
}

// ---------- 上下文 ----------
async function requireParent() {
  const parent = await Parent.ensureLocalParent();
  if (!parent) fail(401, 1002, '家长账号不存在');
  return parent;
}

async function requireChild() {
  const info = session.getChild();
  const child = info ? await Child.findById(info.child_id) : null;
  if (!child) fail(401, 1002, '登录状态已失效，请重新登录');
  return child;
}

/** 取孩子的小伙伴，不存在则抛 404/1006（ChildHome 依赖此状态码跳设置页） */
async function getCreatureOrFail(childId) {
  const creature = await Creature.findByChild(childId);
  if (!creature) fail(404, 1006, '还没有选择小伙伴，先去选择一只吧');
  return creature;
}

async function assertOwnChild(parentId, childId) {
  const parent = await Parent.findById(parentId);
  if (!parent || !parent.children_ids.includes(childId)) {
    fail(403, 1003, '无权访问该孩子账号');
  }
  return parent;
}

async function getVerifyMode(parentId) {
  const parent = parentId ? await Parent.findById(parentId) : null;
  return parent?.settings?.verify_mode || 'strict';
}

export const localApi = {
  // ==================== 通用 ====================
  async childLogin(device_code) {
    if (!device_code) fail(400, 1001, '缺少设备码');
    const child = await Child.findByDeviceCode(String(device_code).toUpperCase());
    if (!child) fail(401, 1002, '设备码无效');
    const creature = await Creature.findByChild(child.child_id);
    return {
      access_token: uuid(),
      child: { child_id: child.child_id, nickname: child.nickname, level: child.level },
      has_creature: !!creature
    };
  },

  async bindChild(body) {
    const parent = await requireParent();
    const { child_nickname, parent_verification_code } = body || {};

    let child = parent_verification_code
      ? await Child.findByDeviceCode(String(parent_verification_code).toUpperCase())
      : null;

    if (!child) {
      if (!child_nickname) fail(400, 1001, '请提供孩子昵称或有效的设备码');
      child = await Child.create({ parent_id: parent.parent_id, nickname: child_nickname });
    }

    await Parent.bindChild(parent.parent_id, child.child_id);
    const creature = await Creature.findByChild(child.child_id);

    return {
      child_id: child.child_id,
      nickname: child.nickname,
      device_code: child.device_code,
      creature_id: creature ? creature.creature_id : null,
      child_access_token: uuid()
    };
  },

  async taskTemplates(category) {
    const categories = category
      ? TASK_TEMPLATES.filter((c) => c.category_id === category)
      : TASK_TEMPLATES;
    return { categories };
  },

  // ==================== 儿童端 ====================
  async proposeTask(body) {
    const child = await requireChild();
    const { name, category, description = '', difficulty = 'easy', rewards = {} } = body || {};

    if (!name || !String(name).trim()) fail(400, 1001, '任务名称不能为空');
    if (!CHILD_TASK_CATEGORIES.includes(category)) fail(400, 1001, '任务分类无效');

    const cleanRewards = {};
    for (const key of CHILD_REWARD_KEYS) {
      const v = Number(rewards?.[key] || 0);
      if (v > 0) cleanRewards[key] = Math.min(Math.floor(v), 99);
    }
    if (Object.keys(cleanRewards).length === 0) cleanRewards.exp = 10;

    const task = await Task.create({
      child_id: child.child_id,
      name: String(name).trim(),
      description,
      category,
      difficulty,
      rewards: cleanRewards,
      status: 'proposed',
      proposed_by: 'child'
    });

    return {
      task: {
        task_id: task.task_id,
        name: task.name,
        category: task.category,
        rewards: task.rewards,
        status: task.status
      }
    };
  },

  async childToday() {
    const child = await requireChild();
    const tasks = await Task.findTodayByChild(child.child_id);
    const completedCount = tasks.filter(
      (t) => t.status !== 'pending' && t.status !== 'proposed'
    ).length;
    const proposedCount = tasks.filter((t) => t.status === 'proposed').length;

    return {
      date: todayString(),
      tasks: tasks.map(formatTask),
      completed_count: completedCount,
      total_count: tasks.length,
      proposed_count: proposedCount
    };
  },

  async completeTask(taskId, notes = '', evidenceUrl = null) {
    const child = await requireChild();
    const task = await Task.findById(taskId);
    if (!task || task.child_id !== child.child_id) fail(404, 1006, '任务不存在');
    if (task.status !== 'pending') fail(400, 1006, '任务状态不允许完成');

    const updated = await Task.complete(taskId, notes, evidenceUrl);

    await VerificationRecord.create({
      parent_id: child.parent_id,
      task_id: taskId,
      child_id: child.child_id,
      code: updated.verification.code,
      expires_at: updated.verification.code_expires_at
    });

    const verifyMode = await getVerifyMode(child.parent_id);

    return {
      status: 'awaiting_verification',
      message:
        verifyMode === 'strict'
          ? '太棒了！请让爸爸妈妈输入验证码来领取奖励~'
          : '已提交！等待爸爸妈妈确认~',
      verification_mode: verifyMode,
      verification: {
        code: updated.verification.code,
        expires_at: new Date(updated.verification.code_expires_at).toISOString(),
        expires_in_seconds: CODE_TTL_SECONDS,
        show_to_child: verifyMode === 'strict'
      },
      rewards_preview: updated.rewards
    };
  },

  async verificationStatus(taskId) {
    const child = await requireChild();
    const task = await Task.findById(taskId);
    if (!task || task.child_id !== child.child_id) fail(404, 1006, '任务不存在');

    const expired =
      task.verification.code_expires_at && Date.now() > task.verification.code_expires_at;

    let status;
    if (task.status === 'awaiting_verification') {
      status = expired ? 'expired' : 'pending';
    } else {
      status = task.status;
    }

    const messages = {
      pending: '等待爸妈验证中...',
      verified: '验证通过啦！快领取奖励吧~',
      rejected: '爸妈没有通过这次验证',
      expired: '验证码已过期，请重新获取'
    };

    return {
      status,
      message: messages[status] || '',
      verification_mode: await getVerifyMode(child.parent_id),
      expires_at: task.verification.code_expires_at
        ? new Date(task.verification.code_expires_at).toISOString()
        : null,
      reject_reason: task.verification.reject_reason,
      can_resubmit: status === 'rejected' || status === 'expired'
    };
  },

  async resendCode(taskId) {
    const child = await requireChild();
    const task = await Task.findById(taskId);
    if (!task || task.child_id !== child.child_id) fail(404, 1006, '任务不存在');
    if (task.status !== 'awaiting_verification') fail(400, 1006, '当前任务无需验证码');

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    task.verification.code = code;
    task.verification.code_expires_at = Date.now() + CODE_TTL_SECONDS * 1000;
    await idb.put(idb.STORE.tasks, task);

    const record = await VerificationRecord.findByTask(task.task_id);
    if (record) {
      record.code = code;
      record.status = 'pending';
      record.expires_at = task.verification.code_expires_at;
      await idb.put(idb.STORE.verification_records, record);
    }

    return {
      code,
      expires_at: new Date(task.verification.code_expires_at).toISOString(),
      expires_in_seconds: CODE_TTL_SECONDS,
      message: '新验证码已生成，请告诉爸妈'
    };
  },

  async claimReward(taskId) {
    const child = await requireChild();
    const task = await Task.findById(taskId);
    if (!task || task.child_id !== child.child_id) fail(404, 1006, '任务不存在');
    if (task.status !== 'verified') fail(400, 1006, '任务尚未通过家长验证');
    if (task.reward_claimed) fail(400, 1007, '奖励已领取');

    const creature = await getCreatureOrFail(child.child_id);
    const updated = await Creature.addRewards(creature.creature_id, task.rewards);

    task.reward_claimed = true;
    task.claimed_at = Date.now();
    await idb.put(idb.STORE.tasks, task);

    return {
      rewards_claimed: task.rewards,
      creature: {
        name: updated.name,
        happiness_increased: true,
        new_mood: updated.attributes.mood
      },
      animation: 'reward_together',
      message: `${updated.name}好开心呀！它说谢谢你的努力！`
    };
  },

  async inventory() {
    const child = await requireChild();
    const creature = await getCreatureOrFail(child.child_id);

    const materials = Object.entries(creature.inventory).map(([type, quantity]) => ({
      material_type: type,
      name: MATERIALS[type]?.name || type,
      icon_url: MATERIALS[type]?.icon_url || '',
      description: MATERIALS[type]?.description || '',
      quantity
    }));

    return {
      materials,
      total_slots: 20,
      used_slots: materials.filter((m) => m.quantity > 0).length
    };
  },

  async createCreature(body) {
    const child = await requireChild();
    const { creature_type, name } = body || {};

    if (!CREATURE_TYPES.includes(creature_type)) fail(400, 1001, '小伙伴种类无效');
    const cleanName = String(name || '').trim();
    if (!cleanName) fail(400, 1001, '请给小伙伴起个名字');
    if (cleanName.length > 12) fail(400, 1001, '名字最多 12 个字');
    if (await Creature.findByChild(child.child_id)) fail(400, 1007, '你已经选过小伙伴啦');

    const creature = await Creature.create({
      child_id: child.child_id,
      creature_type,
      name: cleanName
    });

    return {
      creature: {
        creature_id: creature.creature_id,
        name: creature.name,
        creature_type: creature.creature_type,
        stage: creature.stage,
        level: creature.level
      }
    };
  },

  async feed(material_type, quantity = 1) {
    const child = await requireChild();
    const creature = await getCreatureOrFail(child.child_id);

    if (!material_type || creature.inventory[material_type] === undefined) {
      fail(400, 1001, '材料类型无效');
    }
    if (quantity < 1 || creature.inventory[material_type] < quantity) {
      fail(400, 1001, '材料数量不足');
    }

    const hungerBefore = creature.attributes.hunger;
    const updated = await Creature.feed(creature.creature_id, material_type, quantity);

    return {
      hunger_before: hungerBefore,
      hunger_after: updated.attributes.hunger,
      remaining_materials: { [material_type]: updated.inventory[material_type] },
      creature_reaction: { emotion: 'happy', message: '好吃！谢谢你！', animation: 'eating' },
      exp_gained: 10
    };
  },

  async play(toy_type) {
    const child = await requireChild();
    const creature = await getCreatureOrFail(child.child_id);

    if (!toy_type || !creature.inventory[toy_type]) fail(400, 1001, '玩具数量不足');

    const moodBefore = creature.attributes.mood;
    const intimacyBefore = creature.attributes.intimacy;
    const updated = await Creature.play(creature.creature_id, toy_type);

    return {
      mood_before: moodBefore,
      mood_after: updated.attributes.mood,
      intimacy_gained: updated.attributes.intimacy - intimacyBefore,
      exp_gained: 15,
      remaining_materials: { [toy_type]: updated.inventory[toy_type] },
      creature_reaction: { emotion: 'excited', message: '太好玩啦！再来再来！', animation: 'playing' }
    };
  },

  async bath(material_type = 'bubble_lotion') {
    const child = await requireChild();
    const creature = await getCreatureOrFail(child.child_id);

    if (!creature.inventory[material_type]) fail(400, 1001, '清洁材料不足');

    const cleanlinessBefore = creature.attributes.cleanliness;
    const updated = await Creature.bath(creature.creature_id, material_type);

    return {
      cleanliness_before: cleanlinessBefore,
      cleanliness_after: updated.attributes.cleanliness,
      remaining_materials: { [material_type]: updated.inventory[material_type] },
      creature_reaction: { emotion: 'relaxed', message: '洗得香香的~舒服！', animation: 'bathing' },
      exp_gained: 5
    };
  },

  async creatureStatus() {
    const child = await requireChild();
    const creature = await getCreatureOrFail(child.child_id);

    const { hunger, cleanliness, mood, intimacy } = creature.attributes;

    const alerts = [];
    if (hunger < 30) alerts.push({ type: 'hunger', level: 'warning', message: '我饿了，想吃火焰果~' });
    if (cleanliness < 30)
      alerts.push({ type: 'cleanliness', level: 'warning', message: '我身上脏脏的，想洗澡~' });
    if (mood < 30)
      alerts.push({ type: 'mood', level: 'warning', message: '我心情不好，陪我玩一会儿吧~' });

    const suggestions = [
      {
        action: 'feed',
        name: '喂食',
        available: hunger < 100 && creature.inventory.fire_fruit > 0,
        materials_available: { fire_fruit: creature.inventory.fire_fruit }
      },
      {
        action: 'play',
        name: '玩耍',
        available: mood < 100 && creature.inventory.magic_ball > 0,
        materials_available: { magic_ball: creature.inventory.magic_ball }
      },
      {
        action: 'bath',
        name: '洗澡',
        available: cleanliness < 100 && creature.inventory.bubble_lotion > 0,
        materials_available: { bubble_lotion: creature.inventory.bubble_lotion }
      }
    ];

    return {
      creature: {
        name: creature.name,
        creature_type: creature.creature_type,
        stage: creature.stage,
        level: creature.level
      },
      status: { hunger, cleanliness, mood, intimacy },
      alerts,
      suggestions
    };
  },

  // ==================== 家长端 ====================
  async parentChildren() {
    const parent = await requireParent();
    const children = [];
    for (const childId of parent.children_ids) {
      const child = await Child.findById(childId);
      if (!child) continue;
      const creature = await Creature.findByChild(childId);
      const todayTasks = await Task.findTodayByChild(childId);

      children.push({
        child_id: child.child_id,
        nickname: child.nickname,
        avatar_id: child.avatar_id,
        level: child.level,
        device_code: child.device_code,
        creature: creature
          ? {
              name: creature.name,
              creature_type: creature.creature_type,
              stage: creature.stage,
              level: creature.level,
              attributes: creature.attributes
            }
          : null,
        today: {
          total: todayTasks.length,
          completed: todayTasks.filter((t) => t.status !== 'pending').length
        },
        daily_task_plan: child.daily_task_plan || null
      });
    }
    return { children };
  },

  async pendingTasks() {
    const parent = await requireParent();
    const tasks = await Task.findPendingForParent(parent.parent_id);

    const formatted = tasks.map((t) => ({
      task_id: t.task_id,
      child_id: t.child_id,
      child_name: t.child_name,
      task_name: t.name,
      task_description: t.description,
      category: t.category,
      child_notes: t.child_notes,
      evidence_url: t.evidence_url || null,
      submitted_at: new Date(t.completed_at).toISOString(),
      verification_code: t.verification.code,
      expires_at: new Date(t.verification.code_expires_at).toISOString(),
      rewards: t.rewards
    }));

    return { tasks: formatted, total_pending: formatted.length };
  },

  async proposals() {
    const parent = await requireParent();
    const tasks = await Task.findProposedForParent(parent.parent_id);
    const formatted = tasks.map((t) => ({
      task_id: t.task_id,
      child_id: t.child_id,
      child_name: t.child_name,
      name: t.name,
      description: t.description,
      category: t.category,
      difficulty: t.difficulty,
      rewards: t.rewards,
      proposed_at: new Date(t.created_at).toISOString()
    }));
    return { tasks: formatted, total: formatted.length };
  },

  async decideProposal(taskId, body) {
    const parent = await requireParent();
    const { action, rewards, reject_reason } = body || {};
    if (!['approve', 'reject'].includes(action)) {
      fail(400, 1001, 'action 必须为 approve 或 reject');
    }

    const task = await Task.findById(taskId);
    if (!task || task.status !== 'proposed') fail(404, 1006, '提议不存在或已被处理');

    await assertOwnChild(parent.parent_id, task.child_id);

    if (action === 'approve') {
      const finalRewards = {};
      for (const key of ['fire_fruit', 'magic_ball', 'bubble_lotion', 'exp']) {
        const v = Number(rewards?.[key] || 0);
        if (v > 0) finalRewards[key] = Math.min(Math.floor(v), 99);
      }
      const updated = await Task.decide(
        task.task_id,
        'approve',
        Object.keys(finalRewards).length ? finalRewards : undefined
      );
      return {
        result: 'approved',
        task: {
          task_id: updated.task_id,
          name: updated.name,
          status: 'pending',
          rewards: updated.rewards
        },
        message: '已同意，任务已加入孩子今日清单'
      };
    }

    const updated = await Task.decide(task.task_id, 'reject');
    updated.verification.reject_reason = reject_reason || '家长未通过该提议';
    await idb.put(idb.STORE.tasks, updated);

    return {
      result: 'rejected',
      task: { task_id: updated.task_id, name: updated.name, status: 'rejected' }
    };
  },

  async verifyTask(taskId, body) {
    const parent = await requireParent();
    const { code, action, reject_reason, approval_pin } = body || {};

    const task = await Task.findById(taskId);
    if (!task) fail(404, 1006, '任务不存在');

    const owner = await assertOwnChild(parent.parent_id, task.child_id);

    if (action === 'approve') {
      const verifyMode = owner.settings?.verify_mode || 'strict';

      if (verifyMode === 'strict') {
        const check = await Task.checkVerificationCode(task.task_id, code);
        if (!check.valid) {
          const errCode = check.error.includes('过期') ? 1005 : 1004;
          fail(400, errCode, check.error);
        }
      } else if (verifyMode === 'pin') {
        const result = await Parent.checkApprovalPin(owner.parent_id, approval_pin);
        if (!result.ok) {
          if (result.reason === 'not_set') fail(400, 1001, '请先在设置中设置审批密码');
          if (result.reason === 'locked') {
            fail(403, 1008, '审批密码错误次数过多，请 5 分钟后再试');
          }
          fail(403, 1008, '审批密码错误');
        }
      }

      await Task.verify(task.task_id, 'approve');
      return {
        result: 'approved',
        message: '验证成功！奖励已发放',
        notification_sent_to_child: true
      };
    }

    if (action === 'reject') {
      await Task.verify(task.task_id, 'reject', reject_reason || '家长未通过');
      return {
        result: 'rejected',
        message: '已拒绝该任务',
        reject_reason: reject_reason || '家长未通过',
        notification_sent_to_child: true
      };
    }

    fail(400, 1001, 'action 必须为 approve 或 reject');
  },

  async addTask(body) {
    const parent = await requireParent();
    const {
      child_id,
      name,
      description = '',
      category,
      difficulty = 'easy',
      rewards = {},
      task_template_id = 'custom'
    } = body || {};

    if (!child_id) fail(400, 1001, '缺少 child_id');
    if (!name) fail(400, 1001, '任务名称不能为空');
    if (!category) fail(400, 1001, '任务分类不能为空');

    await assertOwnChild(parent.parent_id, child_id);

    const task = await Task.create({
      child_id,
      task_template_id,
      name,
      description,
      category,
      difficulty,
      rewards
    });

    const todayTasks = await Task.findTodayByChild(child_id);
    const health = evaluateHealth(todayTasks);

    return {
      task: {
        task_id: task.task_id,
        name: task.name,
        category: task.category,
        difficulty: task.difficulty,
        rewards: task.rewards,
        status: task.status
      },
      category_label: CATEGORY_LABELS[category] || category,
      health_warnings: health.warnings
    };
  },

  async setDailyPlan(childId, body) {
    const parent = await requireParent();
    const { daily_task_ids = [], auto_add_enabled = false } = body || {};

    await assertOwnChild(parent.parent_id, childId);

    const pseudoTasks = [];
    const unknown = [];
    for (const templateId of daily_task_ids) {
      const template = findTemplate(templateId);
      if (template) pseudoTasks.push({ category: template.category_id });
      else unknown.push(templateId);
    }

    const health = evaluateHealth(pseudoTasks);
    if (health.blocking) {
      fail(400, 1001, '未添加运动任务，无法保存每日计划（运动为系统硬性要求）');
    }

    const child = await Child.findById(childId);
    child.daily_task_plan = { daily_task_ids, auto_add_enabled, updated_at: Date.now() };
    await idb.put(idb.STORE.children, child);

    return {
      child_id: childId,
      daily_task_plan: child.daily_task_plan,
      health_warnings: health.warnings,
      unknown_templates: unknown
    };
  },

  async report(childId, period = 'week') {
    const parent = await requireParent();
    await assertOwnChild(parent.parent_id, childId);

    const days = period === 'month' ? 30 : 7;
    const startTime = Date.now() - days * DAY_MS;

    const allTasks = await idb.getAll(idb.STORE.tasks);
    const tasks = allTasks.filter((t) => t.child_id === childId && t.created_at >= startTime);

    const isCompleted = (t) => t.status === 'verified' || t.reward_claimed;
    const completedTasks = tasks.filter(isCompleted);

    const dailyMap = new Map();
    const categoryMap = new Map();

    for (const task of tasks) {
      const key = dateString(task.created_at);
      if (!dailyMap.has(key)) dailyMap.set(key, { date: key, completed: 0, total: 0 });
      const bucket = dailyMap.get(key);
      bucket.total += 1;
      if (isCompleted(task)) bucket.completed += 1;

      if (!categoryMap.has(task.category)) {
        categoryMap.set(task.category, { category: task.category, completed: 0, total: 0 });
      }
      const cat = categoryMap.get(task.category);
      cat.total += 1;
      if (isCompleted(task)) cat.completed += 1;
    }

    const totalExp = completedTasks.reduce((sum, t) => sum + (t.rewards?.exp || 0), 0);
    let mostCompletedCategory = null;
    for (const cat of categoryMap.values()) {
      if (!mostCompletedCategory || cat.completed > mostCompletedCategory.completed) {
        mostCompletedCategory = cat;
      }
    }

    const startDate = dateString(startTime);
    const endDate = dateString(Date.now());

    return {
      period,
      date_range: `${startDate} ~ ${endDate}`,
      summary: {
        total_tasks: tasks.length,
        completed_tasks: completedTasks.length,
        completion_rate: tasks.length
          ? Number(((completedTasks.length / tasks.length) * 100).toFixed(1))
          : 0,
        total_exp_earned: totalExp,
        most_completed_category: mostCompletedCategory ? mostCompletedCategory.category : null
      },
      daily_breakdown: [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
      category_breakdown: [...categoryMap.values()].map((c) => ({
        ...c,
        category_label: CATEGORY_LABELS[c.category] || c.category
      }))
    };
  },

  async childCreature(childId) {
    const parent = await requireParent();
    await assertOwnChild(parent.parent_id, childId);

    const creature = await Creature.findByChild(childId);
    if (!creature) fail(404, 1006, '该孩子还没有生物');

    const { hunger, cleanliness, mood } = creature.attributes;
    const minAttr = Math.min(hunger, cleanliness, mood);
    let healthStatus = 'good';
    if (minAttr < 20) healthStatus = 'critical';
    else if (minAttr < 40) healthStatus = 'warning';

    const daysWithoutCare = Math.floor((Date.now() - creature.last_interaction_at) / DAY_MS);

    return {
      creature: {
        name: creature.name,
        type: creature.creature_type, // 注意：后端此处字段名是 type
        stage: creature.stage,
        level: creature.level,
        health_status: healthStatus,
        days_without_care: daysWithoutCare
      },
      attributes: {
        hunger,
        cleanliness,
        mood,
        intimacy: creature.attributes.intimacy
      },
      recent_interactions: []
    };
  },

  async getSettings() {
    const parent = await requireParent();
    return {
      settings: parent.settings,
      has_approval_pin: !!parent.approval_pin_hash
    };
  },

  async updateSettings(body) {
    const parent = await requireParent();
    const patch = {};

    const allowedKeys = [
      'verify_mode',
      'auto_verify_easy_tasks',
      'notification_enabled',
      'night_lock_start',
      'night_lock_end'
    ];
    for (const key of allowedKeys) {
      if (body?.[key] !== undefined) patch[key] = body[key];
    }
    if (body?.daily_game_time_limit_minutes !== undefined) {
      patch.daily_game_time_limit = body.daily_game_time_limit_minutes;
    } else if (body?.daily_game_time_limit !== undefined) {
      patch.daily_game_time_limit = body.daily_game_time_limit;
    }

    if (body?.approval_pin !== undefined && body.approval_pin !== null && body.approval_pin !== '') {
      if (!/^\d{6}$/.test(String(body.approval_pin))) {
        fail(400, 1001, '审批密码必须是 6 位数字');
      }
      await Parent.setApprovalPin(parent.parent_id, body.approval_pin);
    }

    const fresh = await Parent.findById(parent.parent_id);
    if (patch.verify_mode === 'pin' && !fresh.approval_pin_hash) {
      fail(400, 1001, '请先设置审批密码');
    }

    const updated = await Parent.updateSettings(parent.parent_id, patch);
    return {
      settings: updated.settings,
      has_approval_pin: !!updated.approval_pin_hash
    };
  },

  // ==================== 门禁专用 ====================
  async verifyApprovalPin(pin) {
    const parent = await requireParent();
    const result = await Parent.checkApprovalPin(parent.parent_id, pin);
    if (!result.ok) {
      if (result.reason === 'not_set') fail(400, 1001, '尚未设置家长 PIN');
      if (result.reason === 'locked') fail(403, 1008, '错误次数过多，请 5 分钟后再试');
      fail(403, 1008, '家长 PIN 不正确');
    }
    return { ok: true };
  },

  /** 开发用：清空本地库并重新 seed 单例家长 */
  async reset() {
    await idb.clearAll();
    await Parent.ensureLocalParent();
    return { ok: true };
  }
};
