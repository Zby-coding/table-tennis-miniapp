/**
 * 真机联调准备：同步 LAN IP → api.ts / server/.env，并探测后端可达性。
 * 运行: node scripts/prepare-device-debug.mjs
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const API_TS = path.join(ROOT, 'src/services/api.ts');
const SERVER_ENV = path.join(ROOT, 'server/.env');
const PORT = '3017';

const VIRTUAL_IFACE = /virtual|vmware|vbox|hyper-v|docker|wsl|loopback|vethernet|tap|tun/i;

function listIpv4() {
  const nets = os.networkInterfaces();
  const out = [];
  for (const [name, addrs] of Object.entries(nets)) {
    if (!addrs) continue;
    if (VIRTUAL_IFACE.test(name)) continue;
    for (const a of addrs) {
      if (a.family !== 'IPv4' && a.family !== 4) continue;
      if (a.internal) continue;
      out.push({ name, address: a.address });
    }
  }
  return out;
}

function pickLanIp(candidates) {
  const preferred = candidates.find((c) => c.address.startsWith('192.168.0.'));
  if (preferred) return preferred.address;
  const lan = candidates.find((c) => /^192\.168\./.test(c.address));
  if (lan) return lan.address;
  const private10 = candidates.find((c) => /^10\./.test(c.address));
  if (private10) return private10.address;
  return candidates[0]?.address || null;
}

function readCurrentLanIp() {
  const src = fs.readFileSync(API_TS, 'utf8');
  const m = src.match(/const LAN_IP = '([^']+)'/);
  return m ? m[1] : null;
}

function writeLanIp(ip) {
  let src = fs.readFileSync(API_TS, 'utf8');
  if (!/const LAN_IP = '[^']+'/.test(src)) {
    throw new Error('无法在 src/services/api.ts 定位 LAN_IP');
  }
  src = src.replace(/const LAN_IP = '[^']+'/, `const LAN_IP = '${ip}'`);
  fs.writeFileSync(API_TS, src, 'utf8');
}

function upsertEnv(key, value) {
  let text = fs.existsSync(SERVER_ENV) ? fs.readFileSync(SERVER_ENV, 'utf8') : '';
  const line = `${key}=${value}`;
  if (new RegExp(`^${key}=`, 'm').test(text)) {
    text = text.replace(new RegExp(`^${key}=.*$`, 'm'), line);
  } else {
    text = `${text.trimEnd()}\n${line}\n`;
  }
  fs.writeFileSync(SERVER_ENV, text, 'utf8');
}

async function probe(ip) {
  const url = `http://${ip}:${PORT}/api/courts/nearby?lat=32.9908&lng=112.5285&radius=150000`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const json = await res.json();
    const list = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
    return { ok: res.ok, count: list.length, url };
  } catch (err) {
    return { ok: false, count: 0, url, error: err instanceof Error ? err.message : String(err) };
  }
}

function printGuide(ip) {
  console.log(`
========== 真机调试 / 预览步骤 ==========
1. 手机与电脑连同一 WiFi，关闭 VPN/代理
2. 微信开发者工具 → 详情 → 本地设置：勾选「不校验合法域名、web-view、TLS…」
3. 优先试「真机调试 2.0」；若仍报 -50005/服务器忙，改用「预览」扫码（功能验证以预览为准）
4. 确认 Windows 防火墙放行入站 TCP ${PORT}
5. 小程序请求基址: http://${ip}:${PORT}/api
6. 图片基址:     http://${ip}:${PORT}/uploads/...
详见 docs/device-debug.md
========================================
`);
}

async function main() {
  const candidates = listIpv4();
  console.log('检测到网卡 IPv4:');
  for (const c of candidates) console.log(`  - ${c.name}: ${c.address}`);

  const lanIp = pickLanIp(candidates);
  if (!lanIp) {
    console.error('❌ 未找到可用局域网 IPv4');
    process.exit(1);
  }

  const prev = readCurrentLanIp();
  if (prev !== lanIp) {
    writeLanIp(lanIp);
    console.log(`✓ 已更新 api.ts LAN_IP: ${prev} → ${lanIp}`);
  } else {
    console.log(`✓ api.ts LAN_IP 已是 ${lanIp}`);
  }

  const publicUrl = `http://${lanIp}:${PORT}`;
  upsertEnv('API_PUBLIC_URL', publicUrl);
  console.log(`✓ server/.env API_PUBLIC_URL=${publicUrl}`);

  const result = await probe(lanIp);
  if (result.ok) {
    console.log(`✓ 后端可达: ${result.url}（nearby=${result.count}）`);
  } else {
    console.warn(`⚠️  后端探测失败: ${result.url}`);
    console.warn(`   ${result.error || 'HTTP 非 2xx'}`);
    console.warn('   请确认: Nest 已启动、监听 0.0.0.0、防火墙放行、手机与电脑同网段');
  }

  printGuide(lanIp);
  if (!result.ok) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
