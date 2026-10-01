/**
 * 通用 API 路由 (/v1/common)
 * 基于 DESIGN_DOCUMENT.md 7.3 通用 API
 *
 * - 家长注册 / 登录
 * - 儿童设备码登录
 * - 家长绑定孩子账号
 * - 任务模板列表
 */

const express = require('express');
const bcrypt = require('bcryptjs');

const { Parent, Child, Creature } = require('../models/database');
const { generateToken, authenticateParent } = require('../middleware/auth');
const { TASK_TEMPLATES } = require('../constants/taskTemplates');

const router = express.Router();

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

/**
 * 家长注册
 * POST /v1/common/auth/register
 */
router.post('/auth/register', async (req, res) => {
  const { phone, password } = req.body || {};
  if (!phone || !password) return fail(res, 400, 1001, '手机号和密码不能为空');
  if (Parent.findByPhone(phone)) return fail(res, 400, 1001, '该手机号已注册');

  const password_hash = await bcrypt.hash(password, 10);
  const parent = Parent.create({ phone, password_hash });
  const access_token = generateToken(parent.parent_id, 'parent', parent.parent_id);

  return success(res, { parent_id: parent.parent_id, access_token }, '注册成功');
});

/**
 * 家长登录
 * POST /v1/common/auth/login
 */
router.post('/auth/login', async (req, res) => {
  const { phone, password } = req.body || {};
  if (!phone || !password) return fail(res, 400, 1001, '手机号和密码不能为空');

  const parent = Parent.findByPhone(phone);
  if (!parent) return fail(res, 401, 1002, '手机号或密码错误');

  const ok = await bcrypt.compare(password, parent.password_hash);
  if (!ok) return fail(res, 401, 1002, '手机号或密码错误');

  const access_token = generateToken(parent.parent_id, 'parent', parent.parent_id);
  return success(res, { access_token, parent_id: parent.parent_id }, '登录成功');
});

/**
 * 儿童登录（设备码登录）
 * POST /v1/common/auth/child-login
 */
router.post('/auth/child-login', (req, res) => {
  const { device_code } = req.body || {};
  if (!device_code) return fail(res, 400, 1001, '缺少设备码');

  const child = Child.findByDeviceCode(String(device_code).toUpperCase());
  if (!child) return fail(res, 401, 1002, '设备码无效');

  const access_token = generateToken(child.child_id, 'child', child.parent_id, child.child_id);
  return success(
    res,
    {
      access_token,
      child: { child_id: child.child_id, nickname: child.nickname, level: child.level }
    },
    '登录成功'
  );
});

/**
 * 绑定孩子账号
 * POST /v1/common/parent/bind-child
 * Header: Authorization: Bearer <parent_token>
 */
router.post('/parent/bind-child', authenticateParent, (req, res) => {
  const parentId = req.user.id;
  const { child_nickname, parent_verification_code } = req.body || {};

  // 若提供了设备码则绑定已存在的孩子，否则新建
  let child = parent_verification_code
    ? Child.findByDeviceCode(String(parent_verification_code).toUpperCase())
    : null;

  if (!child) {
    if (!child_nickname) return fail(res, 400, 1001, '请提供孩子昵称或有效的设备码');
    child = Child.create({ parent_id: parentId, nickname: child_nickname });
  }

  Parent.bindChild(parentId, child.child_id);

  // 确保孩子拥有一只初始生物
  let creature = Creature.findByChild(child.child_id);
  if (!creature) {
    creature = Creature.create({
      child_id: child.child_id,
      name: `${child.nickname}的小伙伴`,
      creature_type: 'dragon'
    });
  }

  const childToken = generateToken(child.child_id, 'child', parentId, child.child_id);

  return success(
    res,
    {
      child_id: child.child_id,
      nickname: child.nickname,
      device_code: child.device_code,
      creature_id: creature.creature_id,
      child_access_token: childToken
    },
    '孩子账号绑定成功'
  );
});

/**
 * 获取任务模板列表（供家长选择）
 * GET /v1/common/task-templates?category=study
 */
router.get('/task-templates', (req, res) => {
  const { category } = req.query;
  const categories = category
    ? TASK_TEMPLATES.filter(c => c.category_id === category)
    : TASK_TEMPLATES;

  return success(res, { categories });
});

module.exports = router;
