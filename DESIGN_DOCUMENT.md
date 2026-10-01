# 奇幻生物养成游戏 - HTTP API 设计方案

## 📋 目录
1. [项目概述](#1-项目概述)
2. [核心玩法设计](#2-核心玩法设计)
3. [任务体系设计（核心创新）](#3-任务体系设计核心创新)
4. [家长监督机制](#4-家长监督机制)
5. [API 架构设计](#5-api-架构设计)
6. [数据模型设计](#6-数据模型设计)
7. [API 端点详细设计](#7-api-端点详细设计)
8. [核心功能流程](#8-核心功能流程)

---

## 1. 项目概述

### 1.1 游戏定位
- **游戏名称**：《奇幻小伙伴》(Fantasy Buddy)
- **目标用户**：5-12岁儿童 + 家长
- **游戏类型**：教育养成 + 亲子互动
- **核心目标**：通过游戏化方式激励儿童完成现实任务，培养良好习惯

### 1.2 核心创新点
```
创新设计理念
├── 💡 任务驱动养成
│   - 儿童完成现实任务获取游戏材料
├── 🔒 家长验证机制
│   - 任务完成需家长输入验证码确认
├── 💚 儿童健康保护 ⚠️重要
│   - 平时:学习≤3，运动≥1（硬性要求）
│   - 节假日:学习≤4，运动≥1，娱乐≥1
│   - 系统自动校验任务比例
└── 🎮 健康游戏循环
    - 做任务 → 得材料 → 养宠物
```

### 1.2.1 每日任务比例要求（系统级保护，不可关闭）
```
┌────────────────────────────────────────────────────────────────┐
│  📅 平时（周一~周五）                                            │
│  ├─ 学习任务：最多 3 个                                          │
│  ├─ 运动项目：至少 1 个（硬性要求，不满足则禁止保存任务）         │
│  └─ 总计：3-4 个任务                                            │
│                                                                │
│  🏖️ 周末/节假日                                                  │
│  ├─ 学习任务：最多 4 个                                          │
│  ├─ 运动项目：至少 1 个（硬性要求）                              │
│  ├─ 娱乐项目：至少 1 个                                          │
│  └─ 总计：5-6 个任务                                            │
│                                                                │
│  系统会检查：                                                    │
│  ├─ 添加第4个学习任务 → 提示"建议不超过3个"                      │
│  ├─ 未添加运动就保存 → 禁止，提示"需先添加运动任务"               │
│  └─ 周末未添加娱乐 → 提示"建议安排娱乐时间"                       │
└────────────────────────────────────────────────────────────────┘
```

### 1.2.2 任务类型定义
```
📚 学习类：作业、复习预习、阅读练字、练习乐器等
🏃 运动类（必须）：跑步、骑车、跳绳、体操等（每天至少1个）
🎮 娱乐类：游戏、动画、自由玩耍、亲子互动等
🏠 家务类：整理房间、洗碗、倒垃圾等
```

### 1.3 可养成的奇幻生物
| 生物类型 | 性格特点 | 解锁条件 |
|---------|---------|---------|
| 🐉 小火龙 | 活泼好动，喜欢冒险 | 完成新手任务 |
| 🦄 独角兽 | 温柔优雅，善于治愈 | 累计完成10个任务 |
| 🐢 精灵龟 | 沉稳睿智，博学多才 | 连续7天完成每日任务 |
| 🦋 梦蝶仙子 | 神秘梦幻，想象力丰富 | 累计获得500积分 |
| 🦁 火焰狮 | 勇敢热情，保护心强 | 独立完成50个任务 |

---

## 2. 核心玩法设计

### 2.1 游戏经济系统
```
┌──────────────────────────────────────────────────────────┐
│                    材料获取方式                           │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ✅ 正确方式：                                                │
│  ┌────────────────────────────────────────────────────┐   │
│  │  儿童完成任务 → 申请奖励 → 家长验证 → 获得材料      │   │
│  └────────────────────────────────────────────────────┘   │
│                                                          │
│  ❌ 被禁止的方式：                                          │
│  - 直接花钱购买材料                                        │
│  - 登录自动领取材料                                        │
│  - 无限制刷材料                                            │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 2.2 材料分类
| 材料类型 | 用途 | 获取方式 | 示例 |
|---------|------|---------|------|
| 🍖 食物 | 喂食恢复饱食度 | 完成任务 | 火焰果、魔法饼干、星星糖 |
| 🧴 清洁剂 | 洗澡恢复清洁度 | 完成任务 | 泡泡液、彩虹喷雾 |
| 🎾 玩具 | 玩耍恢复心情 | 完成任务 | 魔法球、飞盘、彩带 |
| ✨ 进化石 | 生物进化材料 | 完成高级任务 | 火焰石、龙鳞、魔法粉尘 |
| 🎁 装饰品 | 装扮生物 | 完成成就 | 蝴蝶结、披风、皇冠 |

### 2.3 养成维度
```
┌─────────────────────────────────────────┐
│              生物属性系统                  │
├─────────────┬─────────────┬─────────────┤
│   饱食度    │    清洁度    │    心情值   │
│  (0-100)   │   (0-100)   │   (0-100)   │
├─────────────┼─────────────┼─────────────┤
│   材料恢复   │   材料恢复   │   材料恢复   │
├─────────────┼─────────────┼─────────────┤
│    亲密度   │    经验值    │   进化阶段  │
│  (0-1000)  │  (累计值)   │  蛋→幼崽→成体│
└─────────────┴─────────────┴─────────────┘
```

---

## 3. 任务体系设计（核心创新）

### 3.1 任务类型
```
┌─────────────────────────────────────────────────────────┐
│                     任务类型体系                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📚 学业任务                                             │
│  ├─ 按时完成作业                                         │
│  ├─ 复习/预习功课                                        │
│  ├─ 阅读30分钟                                           │
│  ├─ 练习乐器                                             │
│  └─ 取得好成绩（考试、测验）                              │
│                                                         │
│  🏠 家务任务                                             │
│  ├─ 整理房间                                             │
│  ├─ 帮忙洗碗                                             │
│  ├─ 打扫卫生                                             │
│  ├─ 照顾植物/宠物                                        │
│  └─ 帮爸妈跑腿                                           │
│                                                         │
│  ⭐ 习惯任务                                             │
│  ├─ 早起（7点前起床）                                     │
│  ├─ 早睡（9点前睡觉）                                     │
│  ├─ 自己穿衣服                                           │
│  ├─ 饭前洗手                                             │
│  └─ 每天运动30分钟                                       │
│                                                         │
│  🌟 挑战任务（特殊）                                      │
│  ├─ 一周不发脾气                                          │
│  ├─ 主动帮助小朋友                                        │
│  ├─ 连续完成7天任务                                       │
│  └─ 获得老师表扬                                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.2 任务配置
```json
{
  "task_template_id": "homework_complete",
  "name": "完成作业",
  "description": "认真完成今天的家庭作业",
  "category": "study",
  "difficulty": "easy",
  "rewards": {
    "fire_fruit": 2,
    "magic_ball": 1,
    "exp": 20
  },
  "requires_parent_verification": true,
  "can_auto_verify": false,
  "children_can_submit": true
}
```

### 3.3 任务难度与奖励
| 难度 | 典型任务 | 奖励价值 | 完成耗时 |
|-----|---------|---------|---------|
| ⭐ 简单 | 饭前洗手、早起 | 食物x1 | 1分钟 |
| ⭐⭐ 中等 | 整理房间、完成作业 | 食物x2-3 + 玩具x1 | 15-30分钟 |
| ⭐⭐⭐ 困难 | 连续7天任务、自主复习 | 进化材料x1 + 食物x5 | 持续 |
| ⭐⭐⭐⭐ 挑战 | 一周不发脾气、考试100分 | 稀有装饰x1 + 大量材料 | 不确定 |

### 3.4 每日任务池
```
每个儿童每天可安排的任务数量：3-5个（家长设定）

┌────────────────────────────────────────┐
│         可选任务池（家长勾选添加）        │
├────────────────────────────────────────┤
│ [✓] 完成作业                           │
│ [✓] 整理房间                           │
│ [✓] 早起                               │
│ [ ] 练习钢琴（可选）                     │
│ [ ] 阅读30分钟（可选）                   │
└────────────────────────────────────────┘
```

---

## 4. 家长监督机制

### 4.1 家长端功能
```
┌─────────────────────────────────────────────────────────────┐
│                      家长控制台                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📋 任务管理                                                │
│  ├─ 创建自定义任务                                          │
│  ├─ 设置每日任务列表                                        │
│  ├─ 调整任务奖励                                            │
│  ├─ 查看任务完成情况                                        │
│  └─ 禁用/启用任务类型                                       │
│                                                             │
│  🔐 奖励验证                                                │
│  ├─ 收到任务完成申请通知                                    │
│  ├─ 输入验证码确认奖励发放                                  │
│  ├─ 可选择拒绝并说明原因                                    │
│  └─ 查看历史验证记录                                        │
│                                                             │
│  📊 进度监督                                                │
│  ├─ 查看孩子今日/本周任务完成率                             │
│  ├─ 查看生物状态                                            │
│  ├─ 查看游戏时长统计                                        │
│  └─ 接收每日报告推送                                        │
│                                                             │
│  ⚙️ 系统设置                                                │
│  ├─ 设置每日游戏时长上限                                    │
│  ├─ 绑定孩子账号                                            │
│  ├─ 修改家长密码                                            │
│  └─ 冻结/解冻账号                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 验证码机制
```
任务完成 → 儿童点击"领取奖励" 
        ↓
系统生成6位验证码（有效期10分钟）
        ↓
验证码在儿童端显示，并推送通知给家长
        ↓
儿童将验证码交给家长
        ↓
家长验证通过 → 发放奖励

家长可在设置中选择审批方式：
  - 严格模式：上述流程，每个任务输入任务验证码
  - 审批密码模式：家长输入自设的 6 位审批密码（与孩子无关，可连续错误 5 次锁定 5 分钟）
  - 普通模式：一键审批，无需凭据（摩擦最低，建议配合完成证据照片）
```

### 4.3 家长验证流程
```
┌────────────────────────────────────────────────────────────────┐
│                    奖励发放流程                                 │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   儿童端                        家长端                          │
│   ─────                        ─────                           │
│                                                                │
│   完成作业 ─────────────────────────────────────────────────→│
│                                                                │
│   点击领取                                    手机收到通知：     │
│       ↓                                     "小火龙完成了      │
│       │                                      完成作业任务，     │
│       ↓                                     请输入验证码       │
│   系统生成验证码                              XXXXXX            │
│       ↓                                                             │
│       │ ←───────────────────── 家长输入验证码 ─────────────────│
│       ↓                                                             │
│   验证成功                                                         │
│       ↓                                                             │
│   小火龙获得食物！     ← 儿童看到动画反馈                          │
│       │                                                             │
│       ↓                                                             │
│   家长收到确认通知      ← 记录存档                                 │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 4.4 防止作弊机制
| 防护措施 | 说明 |
|---------|------|
| 验证码10分钟过期 | 防止提前获取验证码 |
| 家长推送通知 | 确保家长知情 |
| 任务描述细化 | 不能用"完成"模糊描述 |
| 随机抽查 | 家长可要求拍照/视频证明 |
| 作弊惩罚 | 虚假完成任务会降低亲密度 |
| 历史可追溯 | 所有验证记录永久保存 |

---

## 5. API 架构设计

### 5.1 基础信息
- **Base URL**: `https://api.fantasybuddy.com/v1`
- **协议**: HTTPS
- **数据格式**: JSON
- **字符编码**: UTF-8

### 5.2 应用端区分
```
儿童端: /child/*
家长端: /parent/*
通用:   /common/*
```

### 5.3 认证方式
```
# 儿童端：设备码登录后携带 Token
Header: Authorization: Bearer <child_token>
       X-App-Type: child

# 家长端：本地单机版，无需注册/登录，/parent/* 直接可用
Header: X-App-Type: parent
```

### 5.4 统一响应格式
```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "data": { ... },
  "timestamp": 1704067200000
}
```

### 5.5 错误码规范
| 错误码 | 说明 | HTTP状态码 |
|-------|------|-----------|
| 200 | 成功 | 200 |
| 1001 | 参数错误 | 400 |
| 1002 | Token无效 | 401 |
| 1003 | 无权限访问 | 403 |
| 1004 | 验证码错误 | 400 |
| 1005 | 验证码已过期 | 400 |
| 1006 | 任务未完成 | 400 |
| 1007 | 奖励已领取 | 400 |
| 1008 | 家长验证未通过 / 审批密码错误（连续 5 次错误锁定 5 分钟） | 403 |
| 2001 | 还需要家长验证 | 需要验证码 |

---

## 6. 数据模型设计

### 6.1 家长账号 (Parent)

> 本地单机版：全应用只有一个家长账号，首次访问时自动创建，**无需注册/登录**。

```json
{
  "parent_id": "uuid-string",
  "phone": "__local__",                 // 本地单机版固定标记
  "email": "string (optional)",
  "password_hash": "string",            // 本地单机版未使用
  "approval_pin_hash": "string | null",  // 家长自设的 6 位审批密码（bcrypt 哈希，仅 pin 模式使用）
  "children_ids": ["array of child_user_ids"],
  "settings": {
    "verify_mode": "strict | pin | normal",  // strict=任务验证码 / pin=审批密码 / normal=免校验
    "auto_verify_easy_tasks": false,
    "daily_game_time_limit": 60,
    "notification_enabled": true
  },
  "created_at": "timestamp"
}
```

### 6.2 儿童账号 (Child)
```json
{
  "child_id": "uuid-string",
  "parent_id": "uuid-string",
  "nickname": "string",
  "avatar_id": "string",
  "level": "integer",
  "game_time_today_minutes": "integer",
  "created_at": "timestamp",
  "生物": { ... }
}
```

### 6.3 任务 (Task)
```json
{
  "task_id": "uuid-string",
  "child_id": "uuid-string",
  "task_template_id": "string",
  "name": "string",
  "description": "string",
  "category": "string (study/housework/habit/challenge)",
  "difficulty": "string (easy/medium/hard/challenge)",
  "rewards": {
    "fire_fruit": "integer",
    "magic_ball": "integer",
    "exp": "integer"
  },
  "status": "string (pending/claimed/verified/rejected)",
  "verification": {
    "code": "string (6位数字)",
    "code_expires_at": "timestamp",
    "verified_by_parent": "boolean",
    "verified_at": "timestamp",
    "reject_reason": "string (optional)"
  },
  "created_at": "timestamp",
  "completed_at": "timestamp",
  "expires_at": "timestamp (当天23:59)"
}
```

### 6.4 验证码记录 (VerificationRecord)
```json
{
  "record_id": "uuid-string",
  "parent_id": "uuid-string",
  "task_id": "uuid-string",
  "child_id": "uuid-string",
  "code": "string (6位数字)",
  "status": "string (pending/verified/expired/rejected)",
  "created_at": "timestamp",
  "expires_at": "timestamp",
  "verified_at": "timestamp (optional)",
  "rejected_reason": "string (optional)"
}
```

### 6.5 生物 (Creature)
```json
{
  "creature_id": "uuid-string",
  "child_id": "uuid-string",
  "creature_type": "string (dragon/unicorn/turtle/butterfly/lion)",
  "name": "string",
  "stage": "string (egg/baby/adult/legendary)",
  "level": "integer",
  "experience": "integer",
  "attributes": {
    "hunger": "integer 0-100",
    "cleanliness": "integer 0-100",
    "mood": "integer 0-100",
    "intimacy": "integer 0-1000"
  },
  "skills": ["array of skill_ids"],
  "inventory": {
    "fire_fruit": 5,
    "magic_ball": 2,
    "bubble_lotion": 3,
    "fire_stone": 0,
    "dragon_scale": 0
  },
  "last_interaction_at": "timestamp"
}
```

### 6.6 材料表 (Material)
```json
{
  "material_id": "uuid-string",
  "child_id": "uuid-string",
  "material_type": "string",
  "quantity": "integer",
  "source": "string (task_reward/purchase/gift)",
  "obtained_at": "timestamp",
  "task_id": "string (nullable)"
}
```

---

## 7. API 端点详细设计

### 7.1 儿童端 API (Child)

#### 7.1.1 获取今日任务列表
```
GET /child/tasks/today
Response:
{
  "success": true,
  "data": {
    "date": "2026-01-10",
    "tasks": [
      {
        "task_id": "uuid",
        "name": "完成作业",
        "description": "认真完成语文和数学作业",
        "category": "study",
        "difficulty": "medium",
        "status": "pending",
        "rewards": { "fire_fruit": 2, "exp": 20 },
        "expires_at": "2026-01-10T23:59:59Z"
      },
      {
        "task_id": "uuid2",
        "name": "整理房间",
        "description": "把玩具和书本放回原位",
        "category": "housework",
        "difficulty": "easy",
        "status": "completed",
        "rewards": { "fire_fruit": 1, "magic_ball": 1 },
        "can_claim": true,
        "verification_required": true
      }
    ],
    "completed_count": 1,
    "total_count": 3
  }
}
```

#### 7.1.2 完成任务并申请奖励
```
POST /child/tasks/{task_id}/complete
Request:
{
  "notes": "写完了数学和语文作业"  // 可选，儿童备注
}
Response:
{
  "success": true,
  "data": {
    "status": "awaiting_verification",
    "message": "太棒了！请让爸爸妈妈输入验证码来领取奖励~",
    "verification": {
      "code": "XXXXXX",  // 展示给儿童
      "expires_in_seconds": 600,
      "show_to_child": true  // 儿童看到这个验证码后告诉家长
    },
    "rewards_preview": {
      "fire_fruit": 2,
      "magic_ball": 1,
      "exp": 20
    }
  }
}
```

#### 7.1.3 验证状态轮询
```
GET /child/tasks/{task_id}/verification-status
Response:
{
  "success": true,
  "data": {
    "status": "pending | verified | rejected | expired",
    "message": "等待爸妈验证中...",
    "verification_attempts": 3,
    "reject_reason": null,
    "can_resubmit": false
  }
}
```

#### 7.1.4 获取验证码（重新获取）
```
POST /child/tasks/{task_id}/resend-code
Response:
{
  "success": true,
  "data": {
    "code": "YYYYYY",
    "expires_in_seconds": 600,
    "message": "新验证码已生成，请告诉爸妈"
  }
}
```

---

#### 7.1.5 领取奖励
```
POST /child/tasks/{task_id}/claim-reward
Response:
{
  "success": true,
  "data": {
    "rewards_claimed": {
      "fire_fruit": 2,
      "magic_ball": 1,
      "exp": 20
    },
    "creature": {
      "name": "小火焰",
      "happiness_increased": true,
      "new_mood": 95
    },
    "animation": "reward_together",
    "message": "小火焰好开心呀！它说谢谢你的努力！"
  }
}
```

#### 7.1.6 获取材料背包
```
GET /child/inventory
Response:
{
  "success": true,
  "data": {
    "materials": [
      {
        "material_type": "fire_fruit",
        "name": "火焰果",
        "icon_url": "https://...",
        "quantity": 5,
        "description": "小火龙最爱的食物"
      },
      {
        "material_type": "magic_ball",
        "name": "魔法球",
        "icon_url": "https://...",
        "quantity": 2
      }
    ],
    "total_slots": 20,
    "used_slots": 5
  }
}
```

#### 7.1.7 喂食生物
```
POST /child/creature/feed
Request:
{
  "material_type": "fire_fruit",
  "quantity": 1
}
Response:
{
  "success": true,
  "data": {
    "hunger_before": 50,
    "hunger_after": 70,
    "remaining_materials": {
      "fire_fruit": 4
    },
    "creature_reaction": {
      "emotion": "happy",
      "message": "好吃！谢谢你！",
      "animation": "eating"
    },
    "exp_gained": 10
  }
}
```

#### 7.1.8 玩耍互动
```
POST /child/creature/play
Request:
{
  "toy_type": "magic_ball"
}
Response:
{
  "success": true,
  "data": {
    "mood_before": 60,
    "mood_after": 85,
    "intimacy_gained": 15,
    "exp_gained": 15,
    "remaining_materials": {
      "magic_ball": 1
    },
    "creature_reaction": {
      "emotion": "excited",
      "message": "太好玩啦！再来再来！",
      "animation": "playing"
    }
  }
}
```

#### 7.1.9 洗澡
```
POST /child/creature/bath
Request:
{
  "material_type": "bubble_lotion"   // 可选，默认 bubble_lotion
}
Response:
{
  "success": true,
  "data": {
    "cleanliness_before": 65,
    "cleanliness_after": 100,
    "remaining_materials": { "bubble_lotion": 2 },
    "creature_reaction": {
      "emotion": "relaxed",
      "message": "洗得香香的~舒服！",
      "animation": "bathing"
    },
    "exp_gained": 5
  }
}
```

#### 7.1.10 获取生物状态
```
GET /child/creature/status
Response:
{
  "success": true,
  "data": {
    "creature": {
      "name": "小火焰",
      "stage": "baby",
      "level": 8
    },
    "status": {
      "hunger": 70,
      "cleanliness": 85,
      "mood": 85,
      "intimacy": 250
    },
    "alerts": [
      { "type": "hunger", "level": "normal", "message": "" },
      { "type": "cleanliness", "level": "good", "message": "" }
    ],
    "suggestions": [
      {
        "action": "feed",
        "name": "喂食",
        "available": true,
        "materials_available": { "fire_fruit": 4 }
      },
      {
        "action": "play",
        "name": "玩耍", 
        "available": true,
        "materials_available": { "magic_ball": 1 }
      },
      {
        "action": "bath",
        "name": "洗澡",
        "available": true,
        "materials_available": { "bubble_lotion": 3 }
      }
    ]
  }
}
```

---

### 7.2 家长端 API (Parent)

#### 7.2.1 获取待验证任务
```
GET /parent/tasks/pending
Response:
{
  "success": true,
  "data": {
    "tasks": [
      {
        "task_id": "uuid",
        "child_name": "小明",
        "task_name": "完成作业",
        "task_description": "认真完成语文和数学作业",
        "category": "study",
        "child_notes": "写完了语文和数学作业",
        "submitted_at": "2026-01-10T15:30:00Z",
        "verification_code": "123456",
        "expires_at": "2026-01-10T15:40:00Z",
        "rewards": { "fire_fruit": 2, "exp": 20 }
      }
    ],
    "total_pending": 1
  }
}
```

#### 7.2.2 审批任务完成（家长操作）
```
POST /parent/tasks/{task_id}/verify
// 本地单机版：家长端无需 Token

// 审批方式由家长的 verify_mode 决定：
//   strict → 必须携带任务验证码 code（孩子端显示、10 分钟有效）
//   pin    → 必须携带家长审批密码 approval_pin（家长在设置中自设 6 位）
//   normal → 无需任何凭据，家长确认即可
Request:
{
  "action": "approve | reject",
  "code": "123456",           // 仅 strict 模式
  "approval_pin": "654321",   // 仅 pin 模式
  "reject_reason": "任务没有认真完成"  // 仅 reject 时
}
Response:
{
  "success": true,
  "data": {
    "result": "approved",
    "message": "验证成功！奖励已发放给小明",
    "notification_sent_to_child": true
  }
}
```

#### 7.2.3 家长主动添加任务
```
POST /parent/tasks
Request:
{
  "child_id": "uuid",
  "task_template_id": "custom",
  "name": "练习写字",
  "description": "认真练习写10个字",
  "category": "study",
  "difficulty": "medium",
  "rewards": {
    "fire_fruit": 1,
    "exp": 10
  }
}
Response:
{
  "success": true,
  "data": {
    "task_id": "uuid",
    "message": "任务已添加到明天的任务列表"
  }
}
```

#### 7.2.4 设置每日任务计划
```
PUT /parent/children/{child_id}/daily-tasks
Request:
{
  "daily_task_ids": [
    "task_template_homework",
    "task_template_tidy_room", 
    "task_template_early_morning"
  ],
  "auto_add_enabled": true  // 开启后每天自动添加这些任务
}
```

#### 7.2.5 获取孩子任务报告
```
GET /parent/children/{child_id}/reports
Query: ?period=week
Response:
{
  "success": true,
  "data": {
    "period": "week",
    "date_range": "2026-01-04 ~ 2026-01-10",
    "summary": {
      "total_tasks": 21,
      "completed_tasks": 18,
      "completion_rate": 85.7,
      "total_exp_earned": 360,
      "most_completed_category": "study"
    },
    "daily_breakdown": [
      { "date": "2026-01-04", "completed": 3, "total": 3 },
      { "date": "2026-01-05", "completed": 2, "total": 3 },
      ...
    ],
    "category_breakdown": [
      { "category": "study", "completed": 10, "total": 11 },
      { "category": "housework", "completed": 5, "total": 7 },
      { "category": "habit", "completed": 3, "total": 3 }
    ]
  }
}
```

#### 7.2.6 查看生物状态
```
GET /parent/children/{child_id}/creature
Response:
{
  "success": true,
  "data": {
    "creature": {
      "name": "小火焰",
      "type": "dragon",
      "stage": "baby",
      "level": 8,
      "health_status": "good",  // good / warning / critical
      "days_without_care": 0
    },
    "attributes": {
      "hunger": 70,
      "cleanliness": 85,
      "mood": 85
    },
    "recent_interactions": [
      { "type": "feed", "at": "2026-01-10T14:00:00Z" },
      { "type": "play", "at": "2026-01-10T12:00:00Z" }
    ]
  }
}
```

#### 7.2.7 家长控制设置
```
GET /parent/settings
Response:
{
  "success": true,
  "data": {
    "settings": {
      "verify_mode": "strict",           // strict | pin | normal
      "auto_verify_easy_tasks": false,
      "daily_game_time_limit": 60,
      "notification_enabled": true,
      "night_lock_start": "21:00",
      "night_lock_end": "07:00"
    },
    "has_approval_pin": true             // 是否已设置家长审批密码（不返回哈希本身）
  }
}

PUT /parent/settings
Request:            // 字段均可选，仅更新传入项
{
  "verify_mode": "pin",                 // 切到 pin 模式前必须先设置 approval_pin
  "auto_verify_easy_tasks": false,
  "daily_game_time_limit_minutes": 60,   // 也可用 daily_game_time_limit
  "notification_enabled": true,
  "approval_pin": "654321"              // 可选：设置/重置 6 位审批密码（必须 6 位数字）
}
Response:
{
  "success": true,
  "data": {
    "settings": { "...": "更新后的完整设置" },
    "has_approval_pin": true
  }
}
```

#### 7.2.8 获取孩子列表
```
GET /parent/children
Response:
{
  "success": true,
  "data": {
    "children": [
      {
        "child_id": "uuid-string",
        "nickname": "小明",
        "avatar_id": "avatar_default",
        "level": 3,
        "device_code": "PLIG96",
        "creature": {
          "name": "小明的小伙伴",
          "creature_type": "dragon",
          "stage": "baby",
          "level": 2,
          "attributes": { "hunger": 80, "cleanliness": 90, "mood": 95, "intimacy": 120 }
        },
        "today": { "total": 3, "completed": 1 },
        "daily_task_plan": null
      }
    ]
  }
}
```

---

### 7.3 通用 API (Common)

> 家长端相关接口（`/parent/*`、`/common/parent/*`）在本地单机版下**无需鉴权**。

#### 7.3.1 儿童登录（设备码）
```
POST /common/auth/child-login
Request:
{
  "device_code": "PLIG96"
}
Response:
{
  "success": true,
  "data": {
    "access_token": "jwt-token",
    "child": { "child_id": "uuid", "nickname": "小明", "level": 1 }
  }
}
```

#### 7.3.2 绑定孩子账号
```
POST /common/parent/bind-child
// 本地单机版：无需家长 Token
Request:
{
  "child_nickname": "小明",                          // 新建孩子时必填
  "parent_verification_code": "child's device code"  // 可选：绑定已存在的孩子设备码
}
Response:
{
  "success": true,
  "data": {
    "child_id": "uuid",
    "nickname": "小明",
    "device_code": "PLIG96",
    "creature_id": "uuid",
    "child_access_token": "jwt-token"
  }
}
```

#### 7.3.3 获取任务模板列表（供家长选择）
```
GET /common/task-templates
Query: ?category=study
Response:
{
  "success": true,
  "data": {
    "categories": [
      {
        "category_id": "study",
        "category_name": "学业任务",
        "templates": [
          {
            "template_id": "homework",
            "name": "完成作业",
            "description": "认真完成老师布置的家庭作业",
            "default_rewards": { "fire_fruit": 2, "exp": 20 },
            "requires_verification": true
          },
          ...
        ]
      },
      ...
    ]
  }
}
```

---

## 8. 核心功能流程

### 8.1 任务完成与奖励领取流程
```
┌─────────────────────────────────────────────────────────────────┐
│                  完整任务奖励流程                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📅 每日任务分配（家长操作，一次性）                               │
│  └─ 家长从任务池选择任务 → 分配给孩子                             │
│                                                                 │
│  👧 儿童完成任务                                                 │
│  └─ 完成任务后点击"我完成了"                                      │
│                                                                 │
│  🔐 申请验证码                                                   │
│  └─ 系统生成6位验证码 → 显示给儿童                                │
│  └─ 同时推送通知给家长手机                                        │
│                                                                 │
│  👨 向家长展示验证码                                             │
│  └─ 儿童："爸妈，验证码是 XXX"                                    │
│                                                                 │
│  ✅ 家长验证                                                     │
│  └─ 家长在APP输入验证码 → 选择同意/拒绝                            │
│  └─ 或者家长在手机通知里直接操作                                   │
│                                                                 │
│  🎁 奖励发放                                                     │
│  └─ 验证通过 → 材料发放到背包                                     │
│  └─ 儿童获得奖励 → 与生物互动                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 系统消息通知
```
┌────────────────────────────────────────────────────────────────┐
│                    消息通知流程                                  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  👧 儿童完成任务后                                               │
│  └─ 儿童端：显示"请告诉爸妈验证码：XXX"                           │
│  └─ 家长端：收到推送"小明完成了'完成作业'，验证码：XXX"            │
│                                                                │
│  👨 家长验证后                                                   │
│  └─ 儿童端：收到通知"太棒了！你获得了2个火焰果！"                  │
│  └─ 家长端：显示验证记录                                          │
│                                                                │
│  ⚠️ 验证码过期前5分钟                                            │
│  └─ 儿童端：提示"验证码快过期了，快告诉爸妈"                       │
│  └─ 家长端：提示"验证码即将过期"                                  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 8.3 典型一天的游戏流程
```
┌─────────────────────────────────────────────────────────────────┐
│                    儿童的一天                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🌅 早上起床                                                     │
│  └─ 打开APP → 打卡"早起"任务 → 申请验证 → 等待爸妈验证             │
│  └─ 获得1个火焰果                                                │
│  └─ 给小火焰喂食 → 饱食度+30                                     │
│  └─ 上学去了                                                     │
│                                                                 │
│  🏫 放学后                                                       │
│  └─ 做作业                                                       │
│  └─ 完成作业 → 点击"完成了" → 获得验证码                          │
│  └─ 妈妈下班回家 → 输入验证码 → 验证通过                          │
│  └─ 获得2个火焰果 + 1个魔法球                                     │
│                                                                 │
│  🌙 晚上                                                         │
│  └─ 和小火焰玩耍（使用魔法球）→ 心情+30                            │
│  └─ 给小火焰洗澡（使用泡泡液）→ 清洁度+50                          │
│  └─ 完成今日任务目标 → 额外奖励：龙鳞碎片                          │
│                                                                 │
│  📊 睡前                                                         │
│  └─ 查看今日成就：小火焰今天很开心！                               │
│  └─ 明天继续加油！                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. 技术实现建议

### 9.1 推送通知
```
儿童完成任务 → 极光/FCM推送 → 家长手机
                     ↓
              包含验证码（在通知中显示）
              包含任务名称
              包含孩子姓名
```

### 9.2 安全考虑
| 安全点 | 实现方式 |
|-------|---------|
| 验证码生成 | 6位随机数，服务端生成 |
| 验证码有效期 | 10分钟，过期后需重新生成 |
| 验证次数限制 | 最多3次错误后需重新生成 |
| 作弊检测 | 记录完成时间，不能秒完成 |
| 数据加密 | HTTPS + 数据加密存储 |

### 9.3 防沉迷机制
```
- 每日游戏时长上限（家长可设置，默认60分钟）
- 任务完成后才能进行游戏互动
- 晚间自动锁定（家长设置睡觉时间）
```

---

## 10. 后续扩展方向

### v1.1 新增功能
- 🎁 完成任务获得装扮物品
- 📊 周报/月报生成
- 🏆 成就系统

### v1.2 新增功能
- 👨‍👩‍👧 家庭排行榜（哪个孩子完成任务最多）
- 🎪 周末特别任务
- 🎁 节假任务主题

### v2.0 社交扩展
- 👫 添加好友，共同完成任务
- 🎁 互送礼物
- 🏆 班级/学校排行榜

---

*文档版本: v2.0（任务驱动+家长验证机制）*
*最后更新: 2026-01-10*
*核心创新: 以任务完成作为材料获取来源，家长验证确保真实性*