/**
 * 家长端 API 路由 (/v1/parent)
 * 基于 DESIGN_DOCUMENT.md 7.2 家长端 API 及补充文档的儿童健康保护机制
 *
 * 所有接口均需家长身份鉴权（Header: Authorization + X-App-Type: parent）
 */

const express = require('express');

const {
  Parent,
  Child,
  Task,
  Creature,
  Notification,
  db
} = require('../models/database');
const { attachLocalParent } = require('../middleware/auth');
const { findTemplate, CATEGORY_LABELS } = require('../constants/taskTemplates');

const router = express.Router();
router.use(attachLocalParent);

const DAY_MS = 24 * 60 * 60 * 1000;

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

function isWeekend(date = new Date()) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function dateString(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 校验孩子是否属于当前家长
 */
function assertOwnChild(req, res, childId) {
  const parent = Parent.findById(req.user.id);
  if (!parent || !parent.children_ids.includes(childId)) {
    fail(res, 403, 1003, '无权访问该孩子账号');
    return null;
  }
  return parent;
}

/**
 * 儿童健康保护：任务比例校验
 * 平时：学习≤3，运动≥1；周末/节假日：学习≤4，运动≥1，娱乐≥1
 */
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
  if (counts.sport < 1) {
    warnings.push('需先添加至少1个运动任务');
  }
  if (weekend && counts.entertainment < 1) {
    warnings.push('建议周末安排至少1个娱乐任务');
  }

  return { weekend, maxStudy, counts, warnings, blocking: counts.sport < 1 };
}

/**
 * 获取家长的孩子列表
 * GET /v1/parent/children
 */
router.get('/children', (req, res) => {
  const parent = Parent.findById(req.user.id);
  if (!parent) return fail(res, 401, 1002, '家长账号不存在');

  const children = parent.children_ids
    .map(childId => {
      const child = Child.findById(childId);
      if (!child) return null;

      const creature = Creature.findByChild(childId);
      const todayTasks = Task.findTodayByChild(childId);

      return {
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
          completed: todayTasks.filter(t => t.status !== 'pending').length
        },
        daily_task_plan: child.daily_task_plan || null
      };
    })
    .filter(Boolean);

  return success(res, { children });
});

/**
 * 获取待验证任务
 * GET /v1/parent/tasks/pending
 */
router.get('/tasks/pending', (req, res) => {
  const tasks = Task.findPendingForParent(req.user.id);

  const formatted = tasks.map(t => ({
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

  return success(res, { tasks: formatted, total_pending: formatted.length });
});

/**
 * 验证任务完成（输入验证码）
 * POST /v1/parent/tasks/:taskId/verify
 */
router.post('/tasks/:taskId/verify', (req, res) => {
  const { code, action, reject_reason, approval_pin } = req.body || {};

  const task = Task.findById(req.params.taskId);
  if (!task) return fail(res, 404, 1006, '任务不存在');

  const parent = assertOwnChild(req, res, task.child_id);
  if (!parent) return;

  if (action === 'approve') {
    // 三种模式：strict=任务验证码 / pin=家长自设审批密码 / normal=免校验直接审批
    const verifyMode = parent.settings?.verify_mode || 'strict';

    if (verifyMode === 'strict') {
      const check = Task.checkVerificationCode(task.task_id, code);
      if (!check.valid) {
        const errCode = check.error.includes('过期') ? 1005 : 1004;
        return fail(res, 400, errCode, check.error);
      }
    } else if (verifyMode === 'pin') {
      const result = Parent.checkApprovalPin(req.user.id, approval_pin);
      if (!result.ok) {
        if (result.reason === 'not_set') return fail(res, 400, 1001, '请先在设置中设置审批密码');
        if (result.reason === 'locked') {
          return fail(res, 403, 1008, '审批密码错误次数过多，请 5 分钟后再试');
        }
        return fail(res, 403, 1008, '审批密码错误');
      }
    }

    Task.verify(task.task_id, 'approve');

    Notification.create({
      parent_id: req.user.id,
      child_id: task.child_id,
      type: 'verification_success',
      title: '验证通过',
      content: `任务「${task.name}」已通过验证，奖励已发放`
    });

    return success(
      res,
      { result: 'approved', message: '验证成功！奖励已发放', notification_sent_to_child: true },
      '验证成功'
    );
  }

  if (action === 'reject') {
    Task.verify(task.task_id, 'reject', reject_reason || '家长未通过');

    Notification.create({
      parent_id: req.user.id,
      child_id: task.child_id,
      type: 'verification_failed',
      title: '验证未通过',
      content: `任务「${task.name}」未通过验证：${reject_reason || '家长未通过'}`
    });

    return success(
      res,
      {
        result: 'rejected',
        message: '已拒绝该任务',
        reject_reason: reject_reason || '家长未通过',
        notification_sent_to_child: true
      },
      '已拒绝'
    );
  }

  return fail(res, 400, 1001, 'action 必须为 approve 或 reject');
});

/**
 * 家长主动添加任务
 * POST /v1/parent/tasks
 */
router.post('/tasks', (req, res) => {
  const {
    child_id,
    name,
    description = '',
    category,
    difficulty = 'easy',
    rewards = {},
    task_template_id = 'custom'
  } = req.body || {};

  if (!child_id) return fail(res, 400, 1001, '缺少 child_id');
  if (!name) return fail(res, 400, 1001, '任务名称不能为空');
  if (!category) return fail(res, 400, 1001, '任务分类不能为空');

  const parent = assertOwnChild(req, res, child_id);
  if (!parent) return;

  const task = Task.create({
    child_id,
    task_template_id,
    name,
    description,
    category,
    difficulty,
    rewards
  });

  // 健康保护：返回比例校验提示（单次添加不强制拦截）
  const todayTasks = Task.findTodayByChild(child_id);
  const health = evaluateHealth(todayTasks);

  return success(
    res,
    {
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
    },
    '任务已添加'
  );
});

/**
 * 设置每日任务计划
 * PUT /v1/parent/children/:childId/daily-tasks
 */
router.put('/children/:childId/daily-tasks', (req, res) => {
  const { childId } = req.params;
  const { daily_task_ids = [], auto_add_enabled = false } = req.body || {};

  const parent = assertOwnChild(req, res, childId);
  if (!parent) return;

  // 将模板ID映射为分类，用于健康比例校验
  const pseudoTasks = [];
  const unknown = [];
  for (const templateId of daily_task_ids) {
    const template = findTemplate(templateId);
    if (template) {
      pseudoTasks.push({ category: template.category_id });
    } else {
      unknown.push(templateId);
    }
  }

  const health = evaluateHealth(pseudoTasks);
  if (health.blocking) {
    return fail(res, 400, 1001, '未添加运动任务，无法保存每日计划（运动为系统硬性要求）');
  }

  // 存储计划到孩子对象
  const child = Child.findById(childId);
  child.daily_task_plan = {
    daily_task_ids,
    auto_add_enabled,
    updated_at: Date.now()
  };

  return success(
    res,
    {
      child_id: childId,
      daily_task_plan: child.daily_task_plan,
      health_warnings: health.warnings,
      unknown_templates: unknown
    },
    '每日任务计划已保存'
  );
});

/**
 * 获取孩子任务报告
 * GET /v1/parent/children/:childId/reports?period=week|month
 */
router.get('/children/:childId/reports', (req, res) => {
  const { childId } = req.params;
  const { period = 'week' } = req.query;

  const parent = assertOwnChild(req, res, childId);
  if (!parent) return;

  const days = period === 'month' ? 30 : 7;
  const startTime = Date.now() - days * DAY_MS;

  const tasks = [...db.tasks.values()].filter(
    t => t.child_id === childId && t.created_at >= startTime
  );

  const isCompleted = t => t.status === 'verified' || t.reward_claimed;
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

  return success(res, {
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
    category_breakdown: [...categoryMap.values()].map(c => ({
      ...c,
      category_label: CATEGORY_LABELS[c.category] || c.category
    }))
  });
});

/**
 * 查看孩子生物状态
 * GET /v1/parent/children/:childId/creature
 */
router.get('/children/:childId/creature', (req, res) => {
  const { childId } = req.params;

  const parent = assertOwnChild(req, res, childId);
  if (!parent) return;

  const creature = Creature.findByChild(childId);
  if (!creature) return fail(res, 404, 1006, '该孩子还没有生物');

  const { hunger, cleanliness, mood } = creature.attributes;
  const minAttr = Math.min(hunger, cleanliness, mood);
  let healthStatus = 'good';
  if (minAttr < 20) healthStatus = 'critical';
  else if (minAttr < 40) healthStatus = 'warning';

  const daysWithoutCare = Math.floor((Date.now() - creature.last_interaction_at) / DAY_MS);

  return success(res, {
    creature: {
      name: creature.name,
      type: creature.creature_type,
      stage: creature.stage,
      level: creature.level,
      health_status: healthStatus,
      days_without_care: daysWithoutCare
    },
    attributes: { hunger, cleanliness, mood, intimacy: creature.attributes.intimacy },
    recent_interactions: []
  });
});

/**
 * 获取家长控制设置
 * GET /v1/parent/settings
 */
router.get('/settings', (req, res) => {
  const parent = Parent.findById(req.user.id);
  if (!parent) return fail(res, 401, 1002, '家长账号不存在');
  return success(res, {
    settings: parent.settings,
    has_approval_pin: !!parent.approval_pin_hash
  });
});

/**
 * 设置家长控制
 * PUT /v1/parent/settings
 */
router.put('/settings', (req, res) => {
  const body = req.body || {};
  const patch = {};

  const allowedKeys = [
    'verify_mode',
    'auto_verify_easy_tasks',
    'notification_enabled',
    'night_lock_start',
    'night_lock_end'
  ];
  for (const key of allowedKeys) {
    if (body[key] !== undefined) patch[key] = body[key];
  }
  // 兼容文档中的两种字段名
  if (body.daily_game_time_limit_minutes !== undefined) {
    patch.daily_game_time_limit = body.daily_game_time_limit_minutes;
  } else if (body.daily_game_time_limit !== undefined) {
    patch.daily_game_time_limit = body.daily_game_time_limit;
  }

  const parent = Parent.findById(req.user.id);
  if (!parent) return fail(res, 401, 1002, '家长账号不存在');

  // 审批密码（6位数字，独立于 settings 存储，仅保存哈希）
  if (body.approval_pin !== undefined && body.approval_pin !== null && body.approval_pin !== '') {
    if (!/^\d{6}$/.test(String(body.approval_pin))) {
      return fail(res, 400, 1001, '审批密码必须是 6 位数字');
    }
    Parent.setApprovalPin(req.user.id, body.approval_pin);
  }

  // 启用「审批密码模式」前必须先设置密码
  if (patch.verify_mode === 'pin' && !Parent.findById(req.user.id).approval_pin_hash) {
    return fail(res, 400, 1001, '请先设置审批密码');
  }

  const updated = Parent.updateSettings(req.user.id, patch);
  return success(
    res,
    { settings: updated.settings, has_approval_pin: !!updated.approval_pin_hash },
    '设置已更新'
  );
});

module.exports = router;
