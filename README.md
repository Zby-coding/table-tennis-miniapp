<h1>🏓 TableTennisPro</h1>

<p>
  <b>TableTennisPro</b> 是一款面向乒乓球爱好者的微信小程序。用户可以通过腾讯地图发现附近的免费乒乓球场地、查看实时打球人数、一键导航到场、签到打卡、收藏场地、发布约球招募，并记录个人战绩与成就。
</p>

---

## 📋 项目背景

乒乓球是中国最受欢迎的全民运动之一，但在日常生活中，爱好者面临以下痛点：

- **找不到免费场地** — 不知道附近哪里有公共乒乓球台
- **不知道有没有人** — 去了场地才发现没人打球或球台被占满
- **找不到球友** — 想打球但没有人一起
- **缺少记录工具** — 想追踪自己的打球足迹和战绩

**TableTennisPro** 致力于解决这些问题，成为乒乓球爱好者的一站式工具。

---

## 🛠️ 技术栈

| 层面 | 技术 |
|------|------|
| **小程序框架** | Taro 4.x + React 18 |
| **语言** | TypeScript |
| **样式** | SCSS |
| **后端** | NestJS 10.x + TypeORM |
| **数据库** | SQLite (开发) / MySQL (生产) |
| **认证** | JWT (JSON Web Token) |
| **实时通信** | WebSocket (Socket.IO) |
| **地图** | 微信原生 `<map>` 组件 + 腾讯地图 |

---

## 📁 项目结构

```
table-tennis-miniapp/
├── src/                        ← Taro 小程序前端
│   ├── pages/
│   │   ├── index/              ← 首页 (地图选点 + 导航)
│   │   ├── square/             ← 约球广场
│   │   ├── profile/            ← 个人中心
│   │   ├── court-detail/       ← 场地详情
│   │   ├── records/            ← 战绩记录
│   │   ├── settings/           ← 系统设置
│   │   └── social/             ← 社区社交 (建设中)
│   ├── services/
│   │   └── api.ts              ← 后端 API 调用层
│   ├── types.ts                ← TypeScript 类型定义
│   ├── data.ts                 ← Mock 数据 / Fallback
│   ├── app.config.ts           ← 小程序全局配置
│   └── app.scss                ← 全局样式 + 设计 Token
├── server/                     ← NestJS 后端 API
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/           ← 微信登录认证
│   │   │   ├── user/           ← 用户管理
│   │   │   ├── court/          ← 场地查询 + 评价 + 收藏
│   │   │   ├── checkin/        ← 签到打卡 + 人数统计
│   │   │   ├── post/           ← 约球发布 + 加入
│   │   │   ├── match/          ← 战绩记录 + 球友匹配
│   │   │   ├── achievement/    ← 成就系统
│   │   │   ├── upload/         ← 文件上传
│   │   │   └── redis/          ← Redis 缓存
│   │   ├── entities/           ← TypeORM 实体 (9 张表)
│   │   ├── config/             ← 环境配置
│   │   └── common/             ← 守卫/过滤器/拦截器/装饰器
│   ├── seed.ts                 ← 种子数据 (南阳 8 个场地)
│   ├── package.json
│   └── .env
├── config/                     ← Taro 构建配置
├── dist/                       ← 小程序编译产物
└── package.json
```

---

## ✨ 已实现功能

### 🗺️ 地图页面 (首页)

| 功能 | 说明 |
|------|------|
| 腾讯地图展示 | 微信原生 `<map>` 组件, 全屏交互 |
| 场地标记点 | 8 个南阳市乒乓球场地, 5 种彩色 Marker 图标 |
| GPS 定位 | `wx.getLocation()` 自动获取用户位置 |
| 场地筛选 | 全部 / 免费 / 室内 / 有灯光 |
| 搜索场地 | 输入场地名, 回车搜索 |
| 场地预览卡 | 点击 Marker 弹出: 评分/人数/距离/球台/材质/灯光/特色 |
| 一键导航 | `wx.openLocation()` 唤起微信地图导航 |
| 签到打卡 | GPS 校验 + 后端 `/api/checkin/in` (防作弊) |
| 收藏夹 | ❤️/🤍 切换 + 后端 `/api/courts/:id/favorite` |

### 📝 约球广场

| 功能 | 说明 |
|------|------|
| 招募列表 | 搜索 + 水平筛选 + 时间筛选 |
| 加入约球 | 一键加入, 名额满自动关闭 |
| 发布约球 | FAB 按钮, 填写标题/场地/时间/人数/费用 |
| 我的约球 | Tab 切换查看自己参与/发起的约球 |

### 👤 个人中心

| 功能 | 说明 |
|------|------|
| 个人资料卡 | 头像/昵称/等级/打球总时/胜率/积分 |
| 成就勋章 | 🏆/☀️/⚡/🤝 4 种 Emoji 徽章 |
| 打球热力图 | GitHub 风格 26 周活跃日历 |
| 菜单导航 | 战绩记录/社区社交/收藏/纠错/设置 |

### 📊 其他页面

| 页面 | 功能 |
|------|------|
| 场地详情 | Bento 信息网格/设施特色/地址/导航/签到 |
| 战绩记录 | 排名卡/胜率统计/历史对局列表 |
| 设置 | 通知开关/缓存清理/系统菜单/退出登录 |
| 社交 | 社区圈子 (建设中) |

### 🔌 后端 API (27 个路由)

| 模块 | 路由 | 说明 |
|------|------|------|
| Auth | `POST /api/auth/login` | 微信登录 (dev模式支持) |
| User | `GET/PATCH /api/user/profile` | 用户资料 |
| Court | `GET /api/courts/nearby` | 场地附近搜索 + 筛选 |
| Court | `GET /api/courts/:id` | 场地详情 + 评价 |
| Court | `POST /api/courts/:id/review` | 添加评价 |
| Court | `POST /api/courts/:id/favorite` | 收藏/取消收藏 |
| Court | `GET /api/courts/user/favorites` | 收藏列表 |
| Court | `POST /api/courts/custom` | 自定义场地 |
| Checkin | `POST /api/checkin/in` | 签到打卡 (GPS 校验) |
| Checkin | `POST /api/checkin/out` | 签退 |
| Checkin | `GET /api/checkin/status` | 签到状态 |
| Checkin | `GET /api/checkin/court/:courtId` | 场地实时人数 |
| Post | `GET/POST /api/posts` | 约球列表 + 发布 |
| Post | `POST /api/posts/:id/join` | 加入约球 |
| Match | `GET/POST /api/matches/records` | 战绩记录 |
| Match | `GET /api/matches/nearby-players` | 附近球友 |
| Achievement | `GET /api/achievements` | 成就列表 |
| Upload | `POST /api/upload` | 文件上传 |
| WebSocket | `checkin` namespace | 实时人数广播 |

---

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 启动后端

```bash
cd server
npm install
npx nest build
npm start
# 后端运行在 http://localhost:3017
```

### 编译小程序

```bash
npm install
npx taro build --type weapp
# 产物在 dist/ 目录
```

### 开发模式

```bash
# 后端 (热重载)
cd server && npm run start:dev

# 前端 (监听编译)
npx taro build --type weapp --watch
```

### 打开微信开发者工具

1. 打开微信开发者工具
2. 导入项目 → 选择 `E:/code/WebFronted/table-tennis-miniapp`
3. AppID 使用测试号或替换为你的 AppID
4. 点击「编译」按钮
5. ⚠️ 务必勾选「不校验合法域名」(开发阶段)

### 种子数据

```bash
cd server && npm install && npm run build
# 插入 8 个南阳乒乓球场地数据
node dist/seed.js
```

---

## 🎨 设计系统

| 元素 | 值 |
|------|----|
| 主色 | `#FF6B35` (活力球橙) |
| 辅色 | `#1A73E8` (电光运动蓝) |
| 成功色 | `#0F9D58` |
| 警告色 | `#F59E0B` |
| 错误色 | `#D93025` |
| 圆角 | 8px / 12px / 16px / 20px / 24px |
| 阴影 | soft / card / elevated / floating / primary |

---

## 📝 License

MIT

---

## 🔗 相关链接

- [微信小程序前端仓库](https://github.com/Zby-coding/table-tennis-miniapp)
- [Web 模拟器版本](https://github.com/Zby-coding/table-tennis-pro)
- [Taro 官方文档](https://taro-docs.jd.com/)
- [NestJS 官方文档](https://docs.nestjs.com/)
