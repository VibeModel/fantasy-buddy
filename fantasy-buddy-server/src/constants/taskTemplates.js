/**
 * 任务模板池
 * 基于 DESIGN_DOCUMENT.md 3.1 任务类型 / 7.3.3 任务模板列表
 *
 * category_id 取值：study | sport | entertainment | housework | habit
 * 其中 sport（运动）为每日硬性要求，entertainment（娱乐）在周末/节假日为硬性要求。
 */

const TASK_TEMPLATES = [
  {
    category_id: 'study',
    category_name: '学业任务',
    templates: [
      {
        template_id: 'homework',
        name: '完成作业',
        description: '认真完成老师布置的家庭作业',
        difficulty: 'medium',
        default_rewards: { fire_fruit: 2, magic_ball: 1, exp: 20 },
        requires_verification: true
      },
      {
        template_id: 'review',
        name: '复习/预习',
        description: '复习当天所学并预习明天内容',
        difficulty: 'medium',
        default_rewards: { fire_fruit: 2, exp: 15 },
        requires_verification: true
      },
      {
        template_id: 'reading',
        name: '阅读30分钟',
        description: '静心阅读课外书30分钟',
        difficulty: 'easy',
        default_rewards: { fire_fruit: 1, exp: 10 },
        requires_verification: true
      },
      {
        template_id: 'instrument',
        name: '练习乐器',
        description: '认真练习乐器20分钟',
        difficulty: 'medium',
        default_rewards: { fire_fruit: 1, magic_ball: 1, exp: 15 },
        requires_verification: true
      }
    ]
  },
  {
    category_id: 'sport',
    category_name: '运动任务',
    templates: [
      {
        template_id: 'outdoor_sport',
        name: '户外运动',
        description: '跑步、骑车、踢球等户外运动30分钟',
        difficulty: 'medium',
        default_rewards: { fire_fruit: 2, magic_ball: 1, exp: 20 },
        requires_verification: true
      },
      {
        template_id: 'rope_skipping',
        name: '跳绳',
        description: '跳绳10分钟',
        difficulty: 'easy',
        default_rewards: { fire_fruit: 1, magic_ball: 1, exp: 10 },
        requires_verification: true
      },
      {
        template_id: 'sport_class',
        name: '体育课',
        description: '认真参加体育课',
        difficulty: 'easy',
        default_rewards: { fire_fruit: 1, exp: 10 },
        requires_verification: true
      },
      {
        template_id: 'eye_exercise',
        name: '眼保健操/远眺',
        description: '认真做眼保健操或远眺放松',
        difficulty: 'easy',
        default_rewards: { fire_fruit: 1, exp: 5 },
        requires_verification: true
      }
    ]
  },
  {
    category_id: 'entertainment',
    category_name: '娱乐任务',
    templates: [
      {
        template_id: 'puzzle_game',
        name: '益智游戏',
        description: '玩益智类游戏20分钟',
        difficulty: 'easy',
        default_rewards: { fire_fruit: 1, magic_ball: 1, exp: 10 },
        requires_verification: true
      },
      {
        template_id: 'cartoon',
        name: '看动画/纪录片',
        description: '看一集动画或纪录片',
        difficulty: 'easy',
        default_rewards: { fire_fruit: 1, exp: 5 },
        requires_verification: true
      },
      {
        template_id: 'free_play',
        name: '自由玩耍/创意活动',
        description: '自由玩耍或进行创意手工活动',
        difficulty: 'easy',
        default_rewards: { fire_fruit: 1, magic_ball: 1, exp: 10 },
        requires_verification: true
      },
      {
        template_id: 'family_game',
        name: '亲子互动游戏',
        description: '和爸爸妈妈一起玩互动游戏',
        difficulty: 'easy',
        default_rewards: { fire_fruit: 1, magic_ball: 1, exp: 15 },
        requires_verification: true
      }
    ]
  },
  {
    category_id: 'housework',
    category_name: '家务任务',
    templates: [
      {
        template_id: 'tidy_room',
        name: '整理房间',
        description: '把玩具和书本放回原位',
        difficulty: 'easy',
        default_rewards: { fire_fruit: 1, magic_ball: 1, exp: 10 },
        requires_verification: true
      },
      {
        template_id: 'dishes',
        name: '帮忙洗碗',
        description: '帮助家人清洗餐具',
        difficulty: 'medium',
        default_rewards: { fire_fruit: 2, exp: 15 },
        requires_verification: true
      },
      {
        template_id: 'take_out_trash',
        name: '倒垃圾',
        description: '把家里的垃圾拿到指定地点',
        difficulty: 'easy',
        default_rewards: { fire_fruit: 1, exp: 10 },
        requires_verification: true
      },
      {
        template_id: 'care_plants',
        name: '照顾植物/宠物',
        description: '给植物浇水或照顾小宠物',
        difficulty: 'easy',
        default_rewards: { fire_fruit: 1, exp: 10 },
        requires_verification: true
      }
    ]
  },
  {
    category_id: 'habit',
    category_name: '习惯任务',
    templates: [
      {
        template_id: 'early_rise',
        name: '早起',
        description: '早上7点前起床',
        difficulty: 'easy',
        default_rewards: { fire_fruit: 1, exp: 5 },
        requires_verification: true
      },
      {
        template_id: 'early_sleep',
        name: '早睡',
        description: '晚上9点前上床睡觉',
        difficulty: 'easy',
        default_rewards: { fire_fruit: 1, exp: 5 },
        requires_verification: true
      },
      {
        template_id: 'wash_hands',
        name: '饭前洗手',
        description: '吃饭前认真洗手',
        difficulty: 'easy',
        default_rewards: { fire_fruit: 1, exp: 5 },
        requires_verification: true
      },
      {
        template_id: 'brush_teeth',
        name: '早晚刷牙',
        description: '早晚各刷一次牙',
        difficulty: 'easy',
        default_rewards: { fire_fruit: 1, exp: 5 },
        requires_verification: true
      }
    ]
  }
];

const CATEGORY_LABELS = {
  study: '学业任务',
  sport: '运动任务',
  entertainment: '娱乐任务',
  housework: '家务任务',
  habit: '习惯任务'
};

/**
 * 根据模板ID查找模板（附带 category_id）
 */
function findTemplate(templateId) {
  for (const category of TASK_TEMPLATES) {
    const template = category.templates.find(t => t.template_id === templateId);
    if (template) {
      return { ...template, category_id: category.category_id };
    }
  }
  return null;
}

module.exports = {
  TASK_TEMPLATES,
  CATEGORY_LABELS,
  findTemplate
};
