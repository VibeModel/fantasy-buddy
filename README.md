# 奇幻小伙伴 (Fantasy Buddy)

一个面向 5–12 岁儿童的亲子任务养成游戏：孩子在现实中完成任务 → 家长验证 → 获得材料奖励 → 用材料养育自己的奇幻小伙伴。

本地单机小体量设计：家长无需注册登录，数据保存在服务端内存中，开箱即用。

## 项目结构

```
llm-play/
├── fantasy-buddy-server/    # 后端 API（Node.js + Express）
│   └── src/
│       ├── index.js         # 服务入口（端口 3000）
│       ├── config.js        # 运行时配置（环境变量）
│       ├── models/          # 内存数据库模型
│       ├── routes/          # /v1/child、/v1/parent、/v1/common
│       └── middleware/      # 鉴权、限流、错误处理
└── fantasy-buddy-client/    # 前端（React 18 + Vite 5，单应用双端）
    └── src/
        ├── pages/child/     # 儿童端页面
        ├── pages/parent/    # 家长端页面
        ├── components/      # 通用组件
        └── constants/       # 小伙伴/材料/分类元数据
```

## 功能特性

### 儿童端（/child）
- 设备码登录，首次登录可选择小伙伴种类（小龙 / 独角兽 / 精灵龟 / 梦蝶仙子 / 火焰狮）并命名
- 查看今日任务，完成任务时可附加文字说明或拍照作为凭据
- 自己提议新任务（「我想领个新任务」），等待爸妈同意
- 领取奖励、查看材料背包
- 喂食 / 玩耍 / 洗澡，提升小伙伴的饱食度、心情、清洁度和亲密度

### 家长端（/parent）
- 本地单账号，无需登录注册
- 绑定孩子账号（生成设备码）、布置任务（可从任务模板选择）
- 验证孩子提交的任务，支持三种模式：
  - **strict**：孩子展示 6 位任务验证码，家长输入验证（默认）
  - **pin**：家长输入自设的 6 位审批 PIN（在设置页配置，连续错 5 次锁定 5 分钟）
  - **normal**：无需任何验证码，直接确认
- 审批孩子提议的任务：同意（可调整奖励）或拒绝（附理由）
- 查看周报与材料统计

## 快速启动

### 环境要求

- Node.js ≥ 16（建议 18+）
- npm

### 0. 一键启动（Windows）

直接双击根目录的 **`start.bat`**（内部调用中文提示的 `start.ps1`）：自动检查 Node.js、首次运行时安装依赖，分别弹出后端与前端窗口，并自动打开浏览器。关闭两个窗口即停止服务。

也可在 PowerShell 中手动运行：`powershell -ExecutionPolicy Bypass -File start.ps1`

以下为手动启动步骤：

### 1. 启动后端 API 服务

```bash
cd fantasy-buddy-server
npm install
npm start          # 生产启动
# 或
npm run dev        # 开发模式（nodemon 热重载）
```

启动后输出：

```
🌟 《奇幻小伙伴》API 服务器已启动 🌟
   地址: http://localhost:3000
```

### 2. 启动前端开发服务器

新开一个终端：

```bash
cd fantasy-buddy-client
npm install
npm run dev
```

启动后访问 **http://localhost:5173**。

前端通过 Vite 代理把 `/v1` 请求转发到后端（默认 `http://localhost:3000`），无需额外配置跨域。

### 3. 生产构建（可选）

```bash
cd fantasy-buddy-client
npm run build      # 产物输出到 dist/
npm run preview    # 本地预览构建产物
```

## 环境变量

| 变量 | 位置 | 默认值 | 说明 |
|------|------|--------|------|
| `PORT` | 后端 | `3000` | API 服务端口 |
| `CODE_TTL_SECONDS` | 后端 | `600` | 任务验证码有效期（秒），调试过期态时可调小，如 `CODE_TTL_SECONDS=5 npm start` |
| `API_TARGET` | 前端 | `http://localhost:3000` | Vite 代理的后端地址 |

## 使用流程

1. **家长**：浏览器打开 `http://localhost:5173/parent`，输入孩子昵称绑定账号，记下生成的**设备码**；按需在设置页配置审批 PIN / 验证模式
2. **孩子**：打开 `http://localhost:5173/child/login`，输入设备码登录
3. **首次登录**：孩子选择小伙伴种类并起名
4. 孩子做任务 → 提交（可拍照/留言）→ 家长在 `/parent` 验证
5. 验证通过后孩子领取奖励 → 喂养小伙伴，见证它成长进化

## 注意事项

- **数据存于内存**：服务重启后所有账号、任务、小伙伴数据清零，适合本地体验与演示
- 家长端与儿童端可分别在不同设备/平板浏览器打开，界面已适配手机与平板
- 健康检查：`GET http://localhost:3000/health`
