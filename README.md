# 奇幻小伙伴 (Fantasy Buddy)

一个面向 5–12 岁儿童的亲子任务养成游戏：孩子在现实中完成任务 → 家长验证 → 获得材料奖励 → 用材料养育自己的奇幻小伙伴。

**默认是「本地模式」**：纯前端应用 + 浏览器本地数据库（IndexedDB），**不需要后端、不需要联网、不需要注册登录**，数据保存在当前设备上。后端代码保留在仓库中，作为可选的「服务端模式」。

## 项目结构

```
llm-play/
├── start.bat / start.ps1     # Windows 一键启动（默认本地模式）
├── fantasy-buddy-client/     # 前端（React 18 + Vite 5，单应用双端，PWA）
│   ├── src/
│   │   ├── api.js            # 数据源门面：按 VITE_DATA_SOURCE 选 local / server
│   │   ├── localdb/          # 本地模式：IndexedDB 数据层（模型 + 端点复刻）
│   │   ├── serverApi.js      # 服务端模式：/v1 HTTP 客户端
│   │   ├── parentGate.jsx    # 家长端 PIN 门禁
│   │   ├── pages/child/      # 儿童端页面
│   │   ├── pages/parent/     # 家长端页面
│   │   ├── components/       # 通用组件
│   │   └── constants/        # 小伙伴/材料/分类元数据
│   ├── scripts/localdb-smoke.mjs  # 本地数据层冒烟测试
│   └── pwa-assets.config.js  # PWA 图标生成配置
└── fantasy-buddy-server/     # 后端 API（Node.js + Express，可选）
```

## 功能特性

### 儿童端
- 设备码登录，首次登录可选择小伙伴种类（小龙 / 独角兽 / 精灵龟 / 梦蝶仙子 / 火焰狮）并命名
- 查看今日任务，完成任务时可附加文字说明或拍照作为凭据
- 自己提议新任务（「我想领个新任务」），等待爸妈同意
- 领取奖励、查看材料背包
- 喂食 / 玩耍 / 洗澡，提升小伙伴的饱食度、心情、清洁度和亲密度

### 家长端
- 本地单账号，无需注册登录；进入家长端需输入**家长 PIN**（单设备下防止孩子自行审批）
- 绑定孩子账号（生成设备码）、布置任务（可从任务模板选择）
- 验证孩子提交的任务，支持三种模式：
  - **strict**：孩子展示 6 位任务验证码，家长输入验证（默认）
  - **pin**：家长输入自设的 6 位审批 PIN（在设置页配置，连续错 5 次锁定 5 分钟）
  - **normal**：无需任何验证码，直接确认
- 审批孩子提议的任务：同意（可调整奖励）或拒绝（附理由）
- 查看周报与材料统计

## 快速启动

### 环境要求

- Node.js ≥ 18（本地模式仅用于启动前端开发服务器）
- npm

### 一键启动（Windows）

双击根目录的 **`start.bat`**（内部调用中文提示的 `start.ps1`）：检查 Node.js、首次运行自动装前端依赖、启动前端并打开浏览器。

也可在 PowerShell 中手动运行：

```bash
powershell -ExecutionPolicy Bypass -File start.ps1
```

### 手动启动（本地模式，推荐）

```bash
cd fantasy-buddy-client
npm install
npm run dev
```

打开 **http://localhost:5173** 即可（数据全部保存在浏览器本地，无需后端）。

- 家长端：`http://localhost:5173/#/parent`（首次进入需设置家长 PIN）
- 儿童端：`http://localhost:5173/#/child/login`

### 生产构建

```bash
cd fantasy-buddy-client
npm run build      # 产物输出到 dist/
npm run preview    # 本地预览构建产物
```

## 在平板上使用（PWA）

本地模式自带 PWA 支持：

1. 把 `fantasy-buddy-client/dist/` 部署到任意**静态托管**（见下节），或用 `npm run preview` 在内网提供；
2. 平板浏览器打开网址 → **添加到主屏幕**（iOS 用 Safari 的分享菜单，Android 用 Chrome 菜单）；
3. 之后像 App 一样从桌面图标打开，**离线也能玩**，数据存在平板本地。

> 建议：首次进入时保持联网完成安装；数据存在浏览器中，清理浏览器/站点数据会丢失记录。

## 部署（免费静态托管）

- **GitHub Pages**：已内置 `.github/workflows/deploy-pages.yml`。推送到 `main` 后，在仓库 Settings → Pages 选择 **GitHub Actions** 即可。产物使用相对路径（`base: './'`）+ HashRouter，子路径也能正常安装/启动。
- **Cloudflare Pages**：构建命令 `cd fantasy-buddy-client && npm ci && npm run build`，输出目录 `fantasy-buddy-client/dist`。
- 两者默认 HTTPS，满足 PWA 与 Web Crypto 的要求。

## 服务端模式（可选）

仓库保留了 Express 后端。默认不启用；如需多设备通过 HTTP 共享数据，可切到服务端模式：

```bash
# 终端 1：启动后端
cd fantasy-buddy-server
npm install
npm start

# 终端 2：以前端服务端模式启动
cd fantasy-buddy-client
npm run dev:server
```

或一键：`start.bat -Server` / `powershell -ExecutionPolicy Bypass -File start.ps1 -Server`

> 注意：服务端模式通过 Vite 代理把 `/v1` 转发到后端，`BASE=/v1` 是绝对路径，**不适合子路径静态托管**，仅建议在本地/根路径使用。

## 数据与存储

| 模式 | 数据存放 | 说明 |
|------|----------|------|
| 本地（默认） | 浏览器 **IndexedDB** | 持久保存在当前设备/浏览器；换设备或清理站点数据会丢失 |
| 服务端 | 后端进程内存 | 服务重启即清零，仅适合开发/演示 |

- 儿童会话（设备码登录态）保存在 `localStorage`。
- 家长端门禁解锁态保存在 `sessionStorage`（关闭标签页即失效，有效期 15 分钟）。
- 照片证据以压缩后的 data URL 存于 IndexedDB。

## 环境变量

| 变量 | 位置 | 默认值 | 说明 |
|------|------|--------|------|
| `VITE_DATA_SOURCE` | 前端 | `local` | `local`（默认，IndexedDB）或 `server`（走 `/v1` HTTP）。见 `.env.server` |
| `API_TARGET` | 前端 | `http://localhost:3000` | 服务端模式下 Vite 代理的后端地址 |
| `PORT` | 后端 | `3000` | API 服务端口 |
| `CODE_TTL_SECONDS` | 后端 | `600` | 任务验证码有效期（秒），调试过期态时可调小 |

## 使用流程

1. **家长**：打开 `/#/parent`，首次进入设置家长 PIN；然后输入孩子昵称绑定账号，记下生成的**设备码**
2. **孩子**：打开 `/#/child/login`，输入设备码登录
3. **首次登录**：孩子选择小伙伴种类并起名
4. 孩子做任务 → 提交（可拍照/留言）→ 家长进入家长端验证
5. 验证通过后孩子领取奖励 → 喂养小伙伴，见证它成长进化

## 开发

```bash
cd fantasy-buddy-client

npm run dev          # 本地模式开发
npm run dev:server   # 服务端模式开发
npm run build        # 构建（本地模式产物）
npm run build:server # 构建（服务端模式产物）
npm run gen:icons    # 重新生成 PWA 图标（源图 public/logo.svg）
npm run test:localdb # 本地数据层冒烟测试
```

## 注意事项

- 家长门禁是 **UI 层防护**，用于防止孩子误入家长端；数据都在本机浏览器中，并非安全边界。
- 儿童端与家长端在同一设备上轮流使用；也可在平板浏览器中安装为 PWA。
- 健康检查（仅服务端模式）：`GET http://localhost:3000/health`
