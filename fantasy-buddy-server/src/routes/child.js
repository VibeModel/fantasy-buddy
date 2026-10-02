/**
 * 儿童端 API 路由 (/v1/child)
 * 基于 DESIGN_DOCUMENT.md 7.1 儿童端 API
 *
 * 所有接口均需儿童身份鉴权（Header: Authorization + X-App-Type: child）
 */

const express = require('express');

const {
  Parent,
  Task,
  Creature,
  VerificationRecord,
  Notification
} = require('../models/database');
const { authenticateChild } = require('../middleware/auth');
const { CODE_TTL_SECONDS } = require('../config');

const router = express.Router();
router.use(authenticateChild);

// 材料元数据
const MATERIALS = {
  fire_fruit: {
    name: '火焰果',
    description: '小火龙最爱的食物',
    icon_url: 'https://cdn.fantasybuddy.com/icons/fire_fruit.png'
  },
  magic_ball: {
    name: '魔法球',
    description: '可以一起玩耍的魔法球',
    icon_url: 'https://cdn.fantasybuddy.com/icons/magic_ball.png'
  },
  bubble_lotion: {
    name: '泡泡液',
    description: '洗澡用的香香泡泡液',
    icon_url: 'https://cdn.fantasybuddy.com/icons/bubble_lotion.png'
  },
  fire_stone: {
    name: '火焰石',
    description: '用于生物进化的稀有材料',
    icon_url: 'https://cdn.fantasybuddy.com/icons/fire_stone.png'
  },
  dragon_scale: {
    name: '龙鳞',
    description: '珍贵的进化材料',
    icon_url: 'https://cdn.fantasybuddy.com/icons/dragon_scale.png'
  }
};

// 可选的小伙伴种类
const CREATURE_TYPES = ['dragon', 'unicorn', 'turtle', 'butterfly', 'lion'];

// 孩子可提议的任务分类与奖励材料
const CHILD_TASK_CATEGORIES = ['study', 'sport', 'entertainment', 'housework', 'habit'];
const CHILD_REWARD_KEYS = ['fire_fruit', 'magic_ball', 'bubble_lotion', 'exp'];
const CATEGORY_LABEL = {
  study: '学习',
  sport: '运动',
  entertainment: '娱乐',
  housework: '家务',
  habit: '习惯'
};

function success(res, data, message = '操作成功') {
  return res.json({
    success: true,
    code: 200,
    message,
    data,
    timestamp: Date.now()
  });
}

function fail(res, httpStatus, code, message) {
  return res.status(httpStatus).json({
    success: false,
    code,
    message,
    timestamp: Date.now()
  });
}

function todayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

function getCreatureOrFail(req, res) {
  const creature = Creature.findByChild(req.user.child_id);
  if (!creature) {
    fail(res, 404, 1006, '还没有选择小伙伴，先去选择一只吧');
    return null;
  }
  return creature;
}

/** 家长当前的审批模式：strict | pin | normal */
function getVerifyMode(req) {
  const parent = req.user.parent_id ? Parent.findById(req.user.parent_id) : null;
  return parent?.settings?.verify_mode || 'strict';
}

/**
 * 获取今日任务列表
 * GET /v1/child/tasks/today
 */
router.get('/tasks/today', (req, res) => {
  const tasks = Task.findTodayByChild(req.user.child_id);
  const completedCount = tasks.filter(t => t.status !== 'pending').length;

  return success(res, {
    date: todayString(),
    tasks: tasks.map(formatTask),
    completed_count: completedCount,
    total_count: tasks.length
  });
});

/**
 * 完成任务并申请奖励
 * POST /v1/child/tasks/:taskId/complete
 */
router.post('/tasks/:taskId/complete', (req, res) => {
  const { taskId } = req.params;
  const { notes = '', evidence_url = null } = req.body || {};

  const task = Task.findById(taskId);
  if (!task || task.child_id !== req.user.child_id) {
    return fail(res, 404, 1006, '任务不存在');
  }
  if (task.status !== 'pending') {
    return fail(res, 400, 1006, '任务状态不允许完成');
  }

  const updated = Task.complete(taskId, notes, evidence_url);

  // 记录验证码
  VerificationRecord.create({
    parent_id: req.user.parent_id,
    task_id: taskId,
    child_id: req.user.child_id,
    code: updated.verification.code,
    expires_at: updated.verification.code_expires_at
  });

  // 通知家长
  Notification.create({
    parent_id: req.user.parent_id,
    child_id: req.user.child_id,
    type: 'task_complete',
    title: '任务完成待验证',
    content: `孩子完成了「${task.name}」，验证码：${updated.verification.code}`
  });

  const verifyMode = getVerifyMode(req);

  return success(res, {
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
  });
});

/**
 * 验证状态轮询
 * GET /v1/child/tasks/:taskId/verification-status
 */
router.get('/tasks/:taskId/verification-status', (req, res) => {
  const task = Task.findById(req.params.taskId);
  if (!task || task.child_id !== req.user.child_id) {
    return fail(res, 404, 1006, '任务不存在');
  }

  const expired =
    task.verification.code_expires_at &&
    Date.now() > task.verification.code_expires_at;

  let status;
  if (task.status === 'awaiting_verification') {
    status = expired ? 'expired' : 'pending';
  } else {
    status = task.status; // verified | rejected
  }

  const messages = {
    pending: '等待爸妈验证中...',
    verified: '验证通过啦！快领取奖励吧~',
    rejected: '爸妈没有通过这次验证',
    expired: '验证码已过期，请重新获取'
  };

  return success(res, {
    status,
    message: messages[status] || '',
    verification_mode: getVerifyMode(req),
    expires_at: task.verification.code_expires_at
      ? new Date(task.verification.code_expires_at).toISOString()
      : null,
    reject_reason: task.verification.reject_reason,
    can_resubmit: status === 'rejected' || status === 'expired'
  });
});

/**
 * 重新获取验证码
 * POST /v1/child/tasks/:taskId/resend-code
 */
router.post('/tasks/:taskId/resend-code', (req, res) => {
  const task = Task.findById(req.params.taskId);
  if (!task || task.child_id !== req.user.child_id) {
    return fail(res, 404, 1006, '任务不存在');
  }
  if (task.status !== 'awaiting_verification') {
    return fail(res, 400, 1006, '当前任务无需验证码');
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  task.verification.code = code;
  task.verification.code_expires_at = Date.now() + CODE_TTL_SECONDS * 1000;

  const record = VerificationRecord.findByTask(task.task_id);
  if (record) {
    record.code = code;
    record.status = 'pending';
    record.expires_at = task.verification.code_expires_at;
  }

  return success(res, {
    code,
    expires_at: new Date(task.verification.code_expires_at).toISOString(),
    expires_in_seconds: CODE_TTL_SECONDS,
    message: '新验证码已生成，请告诉爸妈'
  });
});

/**
 * 领取奖励
 * POST /v1/child/tasks/:taskId/claim-reward
 */
router.post('/tasks/:taskId/claim-reward', (req, res) => {
  const task = Task.findById(req.params.taskId);
  if (!task || task.child_id !== req.user.child_id) {
    return fail(res, 404, 1006, '任务不存在');
  }
  if (task.status !== 'verified') {
    return fail(res, 400, 1006, '任务尚未通过家长验证');
  }
  if (task.reward_claimed) {
    return fail(res, 400, 1007, '奖励已领取');
  }

  const creature = getCreatureOrFail(req, res);
  if (!creature) return;

  Creature.addRewards(creature.creature_id, task.rewards);

  task.reward_claimed = true;
  task.claimed_at = Date.now();

  return success(res, {
    rewards_claimed: task.rewards,
    creature: {
      name: creature.name,
      happiness_increased: true,
      new_mood: creature.attributes.mood
    },
    animation: 'reward_together',
    message: `${creature.name}好开心呀！它说谢谢你的努力！`
  });
});

/**
 * 获取材料背包
 * GET /v1/child/inventory
 */
router.get('/inventory', (req, res) => {
  const creature = getCreatureOrFail(req, res);
  if (!creature) return;

  const materials = Object.entries(creature.inventory).map(([type, quantity]) => ({
    material_type: type,
    name: MATERIALS[type]?.name || type,
    icon_url: MATERIALS[type]?.icon_url || '',
    description: MATERIALS[type]?.description || '',
    quantity
  }));

  return success(res, {
    materials,
    total_slots: 20,
    used_slots: materials.filter(m => m.quantity > 0).length
  });
});

/**
 * 选择小伙伴（种类 + 命名）
 * POST /v1/child/creature
 * 每名儿童仅可创建一次
 */
router.post('/creature', (req, res) => {
  const { creature_type, name } = req.body || {};

  if (!CREATURE_TYPES.includes(creature_type)) {
    return fail(res, 400, 1001, '小伙伴种类无效');
  }

  const cleanName = String(name || '').trim();
  if (!cleanName) return fail(res, 400, 1001, '请给小伙伴起个名字');
  if (cleanName.length > 12) return fail(res, 400, 1001, '名字最多 12 个字');

  if (Creature.findByChild(req.user.child_id)) {
    return fail(res, 400, 1007, '你已经选过小伙伴啦');
  }

  const creature = Creature.create({
    child_id: req.user.child_id,
    creature_type,
    name: cleanName
  });

  return success(
    res,
    {
      creature: {
        creature_id: creature.creature_id,
        name: creature.name,
        creature_type: creature.creature_type,
        stage: creature.stage,
        level: creature.level
      }
    },
    '小伙伴诞生啦！'
  );
});

/**
 * 喂食生物
 * POST /v1/child/creature/feed
 */
router.post('/creature/feed', (req, res) => {
  const { material_type, quantity = 1 } = req.body || {};
  const creature = getCreatureOrFail(req, res);
  if (!creature) return;

  if (!material_type || creature.inventory[material_type] === undefined) {
    return fail(res, 400, 1001, '材料类型无效');
  }
  if (quantity < 1 || creature.inventory[material_type] < quantity) {
    return fail(res, 400, 1001, '材料数量不足');
  }

  const hungerBefore = creature.attributes.hunger;
  Creature.feed(creature.creature_id, material_type, quantity);

  return success(res, {
    hunger_before: hungerBefore,
    hunger_after: creature.attributes.hunger,
    remaining_materials: { [material_type]: creature.inventory[material_type] },
    creature_reaction: { emotion: 'happy', message: '好吃！谢谢你！', animation: 'eating' },
    exp_gained: 10
  });
});

/**
 * 玩耍互动
 * POST /v1/child/creature/play
 */
router.post('/creature/play', (req, res) => {
  const { toy_type } = req.body || {};
  const creature = getCreatureOrFail(req, res);
  if (!creature) return;

  if (!toy_type || !creature.inventory[toy_type]) {
    return fail(res, 400, 1001, '玩具数量不足');
  }

  const moodBefore = creature.attributes.mood;
  const intimacyBefore = creature.attributes.intimacy;
  Creature.play(creature.creature_id, toy_type);

  return success(res, {
    mood_before: moodBefore,
    mood_after: creature.attributes.mood,
    intimacy_gained: creature.attributes.intimacy - intimacyBefore,
    exp_gained: 15,
    remaining_materials: { [toy_type]: creature.inventory[toy_type] },
    creature_reaction: { emotion: 'excited', message: '太好玩啦！再来再来！', animation: 'playing' }
  });
});

/**
 * 洗澡
 * POST /v1/child/creature/bath
 */
router.post('/creature/bath', (req, res) => {
  const { material_type = 'bubble_lotion' } = req.body || {};
  const creature = getCreatureOrFail(req, res);
  if (!creature) return;

  if (!creature.inventory[material_type]) {
    return fail(res, 400, 1001, '清洁材料不足');
  }

  const cleanlinessBefore = creature.attributes.cleanliness;
  Creature.bath(creature.creature_id, material_type);

  return success(res, {
    cleanliness_before: cleanlinessBefore,
    cleanliness_after: creature.attributes.cleanliness,
    remaining_materials: { [material_type]: creature.inventory[material_type] },
    creature_reaction: { emotion: 'relaxed', message: '洗得香香的~舒服！', animation: 'bathing' },
    exp_gained: 5
  });
});

/**
 * 获取生物状态
 * GET /v1/child/creature/status
 */
router.get('/creature/status', (req, res) => {
  const creature = getCreatureOrFail(req, res);
  if (!creature) return;

  const { hunger, cleanliness, mood, intimacy } = creature.attributes;

  const alerts = [];
  if (hunger < 30) alerts.push({ type: 'hunger', level: 'warning', message: '我饿了，想吃火焰果~' });
  if (cleanliness < 30) alerts.push({ type: 'cleanliness', level: 'warning', message: '我身上脏脏的，想洗澡~' });
  if (mood < 30) alerts.push({ type: 'mood', level: 'warning', message: '我心情不好，陪我玩一会儿吧~' });

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

  return success(res, {
    creature: {
      name: creature.name,
      creature_type: creature.creature_type,
      stage: creature.stage,
      level: creature.level
    },
    status: { hunger, cleanliness, mood, intimacy },
    alerts,
    suggestions
  });
});

module.exports = router;
