/**
 * 展示用元数据映射
 */

export const MATERIAL_META = {
  fire_fruit: { name: '火焰果', icon: '🍖', group: 'food' },
  magic_ball: { name: '魔法球', icon: '🎾', group: 'toy' },
  bubble_lotion: { name: '泡泡液', icon: '🧴', group: 'clean' },
  fire_stone: { name: '火焰石', icon: '🔥', group: 'evo' },
  dragon_scale: { name: '龙鳞碎片', icon: '🐉', group: 'evo' }
};

export const MATERIAL_GROUPS = [
  { id: 'food', label: '🍖 食物类' },
  { id: 'toy', label: '🎾 玩具类' },
  { id: 'clean', label: '🧴 清洁类' },
  { id: 'evo', label: '✨ 进化材料' }
];

export const CATEGORY_META = {
  study: { name: '学习任务', icon: '📚' },
  sport: { name: '运动任务', icon: '🏃' },
  entertainment: { name: '娱乐任务', icon: '🎮' },
  housework: { name: '家务任务', icon: '🏠' },
  habit: { name: '习惯任务', icon: '⭐' }
};

export const CATEGORY_ORDER = ['study', 'sport', 'entertainment', 'housework', 'habit'];

export const CREATURE_META = {
  dragon: { name: '小火龙', icon: '🐉' },
  unicorn: { name: '独角兽', icon: '🦄' },
  turtle: { name: '精灵龟', icon: '🐢' },
  butterfly: { name: '梦蝶仙子', icon: '🦋' },
  lion: { name: '火焰狮', icon: '🦁' }
};

/**
 * 各物种在不同成长阶段的形象（emoji）。
 * egg 阶段所有物种共用蛋；baby / adult / legendary 按物种区分。
 */
export const CREATURE_STAGE_ICON = {
  dragon: { egg: '🥚', baby: '🦎', adult: '🐉', legendary: '🐲' },
  unicorn: { egg: '🥚', baby: '🐴', adult: '🦄', legendary: '🦄' },
  turtle: { egg: '🥚', baby: '🐢', adult: '🐢', legendary: '🐢' },
  butterfly: { egg: '🥚', baby: '🐛', adult: '🦋', legendary: '🦋' },
  lion: { egg: '🥚', baby: '🐱', adult: '🦁', legendary: '🦁' }
};

export const STAGE_LABEL = {
  egg: '蛋',
  baby: '幼崽',
  adult: '成体',
  legendary: '传说'
};

export const TASK_STATUS_LABEL = {
  pending: '待开始',
  proposed: '待爸妈同意',
  awaiting_verification: '待验证',
  verified: '已通过',
  rejected: '未通过'
};

export function materialMeta(type) {
  return MATERIAL_META[type] || { name: type, icon: '❓', group: 'other' };
}

export function categoryMeta(category) {
  return CATEGORY_META[category] || { name: category, icon: '📌' };
}

export function creatureMeta(type) {
  return CREATURE_META[type] || { name: '小伙伴', icon: '🐾' };
}

/** 按物种 + 成长阶段取形象；阶段缺省时回退到成体形象 */
export function creatureIcon(type, stage) {
  return CREATURE_STAGE_ICON[type]?.[stage] || creatureMeta(type).icon;
}

export function rewardEntries(rewards = {}) {
  return Object.entries(rewards)
    .filter(([, qty]) => qty > 0)
    .map(([type, qty]) => {
      if (type === 'exp') return { type, icon: '⭐', name: '经验值', qty };
      const meta = materialMeta(type);
      return { type, icon: meta.icon, name: meta.name, qty };
    });
}
