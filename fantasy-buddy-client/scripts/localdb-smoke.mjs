import 'fake-indexeddb/auto';

// localStorage 桩
const mem = {};
globalThis.localStorage = {
  getItem: (k) => (k in mem ? mem[k] : null),
  setItem: (k, v) => {
    mem[k] = String(v);
  },
  removeItem: (k) => {
    delete mem[k];
  },
  clear: () => {
    for (const k of Object.keys(mem)) delete mem[k];
  }
};

const { localApi } = await import('../src/localdb/localApi.js');
const { session } = await import('../src/session.js');

let pass = 0;
let failCount = 0;
function ok(cond, label) {
  if (cond) {
    pass++;
    console.log('  \u2713', label);
  } else {
    failCount++;
    console.log('  \u2717', label);
  }
}
async function expectThrow(fn, code, label) {
  try {
    await fn();
    failCount++;
    console.log('  \u2717', label, '(未抛错)');
  } catch (e) {
    if (e.code === code) {
      pass++;
      console.log('  \u2713', label, `(code=${e.code})`);
    } else {
      failCount++;
      console.log('  \u2717', label, `(期望 code=${code}，实际 ${e.code}: ${e.message})`);
    }
  }
}
async function expectThrowStatus(fn, status, label) {
  try {
    await fn();
    failCount++;
    console.log('  \u2717', label, '(未抛错)');
  } catch (e) {
    if (e.status === status) {
      pass++;
      console.log('  \u2713', label, `(status=${e.status}, code=${e.code})`);
    } else {
      failCount++;
      console.log('  \u2717', label, `(期望 status=${status}，实际 ${e.status}/${e.code})`);
    }
  }
}

console.log('\n# 初始化');
await localApi.reset();
const settings0 = await localApi.getSettings();
ok(settings0.has_approval_pin === false, '初始无审批 PIN');
ok(settings0.settings.verify_mode === 'strict', '默认验证模式 strict');

console.log('\n# 家长绑定孩子');
const bind = await localApi.bindChild({ child_nickname: '小明' });
ok(bind.device_code && bind.device_code.length === 6, '返回 6 位设备码: ' + bind.device_code);
ok(bind.creature_id === null, '绑定时不自动创建小伙伴');
const childId = bind.child_id;

console.log('\n# 儿童登录');
const login = await localApi.childLogin(bind.device_code);
ok(login.has_creature === false, '登录返回 has_creature=false');
ok(login.child.nickname === '小明', '登录返回昵称');
session.setChild(login.child, login.access_token);

console.log('\n# 未选小伙伴时相关接口');
await expectThrowStatus(() => localApi.creatureStatus(), 404, 'creatureStatus 抛 404');
await expectThrowStatus(() => localApi.inventory(), 404, 'inventory 抛 404');
await expectThrowStatus(() => localApi.claimReward('x'), 404, 'claimReward 任务不存在抛 404');

console.log('\n# 选择小伙伴');
await expectThrow(
  () => localApi.createCreature({ creature_type: 'xxx', name: 'a' }),
  1001,
  '非法种类抛 1001'
);
await expectThrow(
  () => localApi.createCreature({ creature_type: 'dragon', name: '这个名字实在是太长了超过十二个字' }),
  1001,
  '名字超长抛 1001'
);
const created = await localApi.createCreature({ creature_type: 'dragon', name: '小火龙' });
ok(created.creature.creature_type === 'dragon', '创建成功');
await expectThrow(
  () => localApi.createCreature({ creature_type: 'lion', name: '二次' }),
  1007,
  '重复创建抛 1007'
);

console.log('\n# 家长布置任务');
const add = await localApi.addTask({
  child_id: childId,
  name: '写作业',
  description: '完成数学作业',
  category: 'study',
  difficulty: 'medium',
  rewards: { exp: 20, fire_fruit: 2 }
});
ok(add.task.status === 'pending', '任务创建为 pending');
ok(add.task.rewards.exp === 20, '奖励 exp=20');
ok(Array.isArray(add.health_warnings), '返回健康提示数组');
const taskId = add.task.task_id;

console.log('\n# 儿童今日任务');
let today = await localApi.childToday();
ok(today.total_count === 1, '今日 1 个任务');
ok(today.tasks[0].can_claim === false, 'can_claim=false');
ok(typeof today.tasks[0].expires_at === 'string', 'expires_at 为 ISO 字符串');

console.log('\n# 儿童完成任务');
const done = await localApi.completeTask(taskId, '写完了', null);
ok(done.status === 'awaiting_verification', '状态 awaiting_verification');
ok(/^\d{6}$/.test(done.verification.code), '生成 6 位验证码: ' + done.verification.code);
ok(done.verification.show_to_child === true, 'strict 模式显示验证码给儿童');
const code = done.verification.code;

console.log('\n# 儿童轮询验证状态');
let vs = await localApi.verificationStatus(taskId);
ok(vs.status === 'pending', '轮询状态 pending');

console.log('\n# 家长待验证');
const pending = await localApi.pendingTasks();
ok(pending.tasks.length === 1, '待验证 1 条');
ok(pending.tasks[0].verification_code === code, '待验证含验证码');
ok(pending.tasks[0].child_name === '小明', '含孩子昵称');

console.log('\n# 家长验证（strict）');
await expectThrow(
  () => localApi.verifyTask(taskId, { action: 'approve', code: '000000' }),
  1004,
  '错误验证码抛 1004'
);
const verified = await localApi.verifyTask(taskId, { action: 'approve', code });
ok(verified.result === 'approved', '验证通过');

console.log('\n# 儿童领取奖励');
today = await localApi.childToday();
ok(today.tasks[0].can_claim === true, '验证后 can_claim=true');
const claimed = await localApi.claimReward(taskId);
ok(claimed.rewards_claimed.exp === 20, '领取 exp=20');
await expectThrow(() => localApi.claimReward(taskId), 1007, '重复领取抛 1007');

console.log('\n# 背包与互动');
let inv = await localApi.inventory();
const fireFruit = inv.materials.find((m) => m.material_type === 'fire_fruit');
ok(fireFruit.quantity === 2, '火焰果 +2');
ok(inv.materials.length === 5, '共 5 种材料');
await expectThrow(() => localApi.play('magic_ball'), 1001, '无魔法球时玩耍抛 1001');
const fed = await localApi.feed('fire_fruit');
ok(fed.remaining_materials.fire_fruit === 1, '喂食后剩余 1');
ok(fed.exp_gained === 10, '喂食经验 +10');
const status = await localApi.creatureStatus();
ok(status.status.intimacy >= 5, '亲密度已增长');
ok(status.creature.creature_type === 'dragon', 'status 字段为 creature_type');

console.log('\n# 孩子提议任务');
await expectThrow(
  () => localApi.proposeTask({ name: '', category: 'study' }),
  1001,
  '空名称抛 1001'
);
await expectThrow(
  () => localApi.proposeTask({ name: '学编程', category: 'bad' }),
  1001,
  '非法分类抛 1001'
);
const proposed = await localApi.proposeTask({
  name: '学编程',
  category: 'study',
  description: '看视频学编程',
  rewards: { exp: 30 }
});
ok(proposed.task.status === 'proposed', '提议状态 proposed');
today = await localApi.childToday();
ok(today.proposed_count === 1, '今日 proposed_count=1');

console.log('\n# 家长审批提议');
const proposals = await localApi.proposals();
ok(proposals.tasks.length === 1, '家长看到 1 条提议');
ok(proposals.tasks[0].name === '学编程', '提议名称正确');
const decided = await localApi.decideProposal(proposals.tasks[0].task_id, {
  action: 'approve',
  rewards: { exp: 50 }
});
ok(decided.result === 'approved', '提议同意');
ok(decided.task.status === 'pending', '提议转为 pending');
ok(decided.task.rewards.exp === 50, '奖励被覆盖为 exp=50');

console.log('\n# 家长报告');
const rep = await localApi.report(childId, 'week');
ok(rep.summary.total_tasks === 2, '报告统计 2 个任务');
ok(rep.summary.completed_tasks === 1, '完成 1 个');
ok(typeof rep.summary.completion_rate === 'number', '完成率: ' + rep.summary.completion_rate);
ok(Array.isArray(rep.daily_breakdown) && rep.daily_breakdown.length === 1, 'daily_breakdown 1 天');

console.log('\n# 家长查看孩子宠物');
const pc = await localApi.childCreature(childId);
ok(pc.creature.type === 'dragon', 'childCreature 字段名为 type');
ok(typeof pc.creature.health_status === 'string', 'health_status: ' + pc.creature.health_status);

console.log('\n# 家长端孩子列表');
const kids = await localApi.parentChildren();
ok(kids.children.length === 1, 'child1 个');
ok(kids.children[0].device_code === bind.device_code, '设备码一致');
ok(kids.children[0].creature.name === '小火龙', '含小伙伴信息');

console.log('\n# 审批 PIN 与 pin 模式');
await expectThrow(() => localApi.updateSettings({ verify_mode: 'pin' }), 1001, '未设 PIN 时启用 pin 模式抛 1001');
await expectThrow(
  () => localApi.updateSettings({ approval_pin: '12345' }),
  1001,
  '非 6 位 PIN 抛 1001'
);
let s2 = await localApi.updateSettings({ approval_pin: '123456', verify_mode: 'pin' });
ok(s2.has_approval_pin === true, 'PIN 已设置');
ok(s2.settings.verify_mode === 'pin', '验证模式 pin');
ok(await localApi.verifyApprovalPin('123456').then(() => true), '门禁 PIN 正确通过');
await expectThrow(() => localApi.verifyApprovalPin('000000'), 1008, '门禁 PIN 错误抛 1008');

console.log('\n# pin 模式验证任务');
const add2 = await localApi.addTask({ child_id: childId, name: '跑步', category: 'sport' });
await localApi.completeTask(add2.task.task_id, '', null);
await expectThrow(
  () => localApi.verifyTask(add2.task.task_id, { action: 'approve', approval_pin: '999999' }),
  1008,
  'pin 模式错误 PIN 抛 1008'
);
const v2 = await localApi.verifyTask(add2.task.task_id, { action: 'approve', approval_pin: '123456' });
ok(v2.result === 'approved', 'pin 模式正确 PIN 验证通过');

console.log('\n# 连续 5 次错误 PIN 锁定');
for (let i = 0; i < 5; i++) {
  try {
    await localApi.verifyApprovalPin('000000');
  } catch {
    /* ignore */
  }
}
await expectThrow(() => localApi.verifyApprovalPin('123456'), 1008, '锁定后正确 PIN 也被拒（1008）');

console.log(`\n===== 结果：${pass} 通过 / ${failCount} 失败 =====`);
process.exit(failCount === 0 ? 0 : 1);
