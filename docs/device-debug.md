# 真机调试与预览

## 错误说明

`连接断开，服务器忙，cmdId:1003，errCode:-50005` 通常是**微信开发者工具 ↔ 手机调试通道**失败，不等于后端 Nest 返回 500。业务功能验证请优先使用「预览」扫码。

## 一键准备

```bash
# 同步局域网 IP、写入 API_PUBLIC_URL，并探测 :3017
node scripts/prepare-device-debug.mjs

# 后端（另开终端）
cd server && npm run start:dev

# 全量场地 + 实景图可达性
node scripts/verify-court-media.mjs
```

修改 `LAN_IP` 或 `API_PUBLIC_URL` 后需：

1. 重启 Nest（让 `API_PUBLIC_URL` 生效）
2. `npm run build:weapp` 或 watch，再重新预览

## 实况图与开发工具不一致

若开发者工具能出图、真机详情「场点实况」空白/裂图：

1. 图片 URL 不得含 `127.0.0.1` / `localhost`（手机上指向自身）。运行 `prepare-device-debug.mjs` 后重启后端。
2. 勾选「不校验合法域名」。
3. 真机调试优先 **2.0**；仍报 `cmdId:1003 / errCode:-50005` 则改用 **预览**（功能验收以预览为准）。
4. 详情页会对局域网图先 `downloadFile` 再展示临时路径，与开发工具观感对齐。

## 开发者工具

1. 从仓库根目录打开项目（`miniprogramRoot` 为 `dist/`）
2. 详情 → 本地设置：勾选「不校验合法域名、web-view、TLS 版本以及 HTTPS 证书」
3. `project.private.config.json` 已开启 `useLanDebug: true`
4. 真机调试优先选 **2.0**；仍断连则改用 **预览**
5. 修改代码后务必重新编译 `npm run build:weapp`（或 watch）再扫码
## 网络

- 手机与电脑同一 WiFi（避免访客网络隔离）
- 关闭 VPN / 系统代理
- Windows 防火墙放行入站 TCP `3017`
- 手机浏览器可先访问：`http://<电脑LAN>:3017/api/courts/nearby?lat=32.9908&lng=112.5285&radius=150000`

## 真机验证清单

| 项 | 标准 |
|----|------|
| 首页地图 | 约 95 个点；含西峡与市中心 |
| 点 marker | 进入对应详情，名称一致 |
| 有实景场 | 「场点实况」Swiper 出图（仅 `/uploads` 本地实景；已剔除不可达 Unsplash） |
| 无图场 | 占位文案，不白屏 |
| 收藏 / 签到 | 可点不崩 |

### 抽检 ID（`verify-court-media.mjs` 输出示例）

- 西峡：`910051` / `910049` / `910050` / `910052`
- 市中心：`910034`、`900011`、`5`
- 本地实景：`910024` 梅溪乒乓球俱乐部
- 无图占位：`9` 二技校对面河边乒乓球区

跑完校验脚本后以终端最新打印为准。
