/**
 * 全量校验附近场地数量 + 详情实景图可达性。
 * 运行: node scripts/verify-court-media.mjs
 * 可选: API_BASE=http://192.168.x.x:3017 node scripts/verify-court-media.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const UPLOADS = path.join(ROOT, 'server/uploads');

const API_BASE = (process.env.API_BASE || 'http://127.0.0.1:3017').replace(/\/$/, '');
const EXPECTED_COUNT = Number(process.env.EXPECTED_COURT_COUNT || 95);

function collectMedia(court) {
  const urls = [
    ...(Array.isArray(court.livePhotos) ? court.livePhotos : []),
    ...(Array.isArray(court.galleryImages) ? court.galleryImages : []),
    ...(Array.isArray(court.facilityPhotos) ? court.facilityPhotos : []),
    court.photo,
  ].filter((u) => typeof u === 'string' && u.trim());
  return [...new Set(urls)];
}

function localUploadPath(url) {
  try {
    const u = new URL(url, API_BASE);
    if (!u.pathname.startsWith('/uploads/')) return null;
    return path.join(UPLOADS, u.pathname.replace(/^\/uploads\/?/, ''));
  } catch {
    if (url.startsWith('/uploads/')) {
      return path.join(UPLOADS, url.replace(/^\/uploads\/?/, ''));
    }
    return null;
  }
}

function isStockUrl(url) {
  return /unsplash\.com|pexels\.com|picsum\.photos/i.test(String(url || ''));
}

function isLoopbackUrl(url) {
  try {
    const host = new URL(url, API_BASE).hostname.toLowerCase();
    return host === '127.0.0.1' || host === 'localhost' || host === '::1';
  } catch {
    return /127\.0\.0\.1|localhost/i.test(String(url || ''));
  }
}

async function checkUrl(url) {
  // 示意外链在国内常不可达，不作为硬失败；详情 API 已过滤 stock
  if (isStockUrl(url)) {
    return { ok: true, reason: 'stockSkipped', detail: url };
  }

  if (isLoopbackUrl(url)) {
    return { ok: false, reason: 'loopbackUrl', detail: url };
  }

  const local = localUploadPath(url);
  if (local) {
    if (!fs.existsSync(local)) {
      return { ok: false, reason: 'missingFile', detail: local };
    }
  }

  const absolute = url.startsWith('http') ? url : `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
  try {
    let res = await fetch(absolute, { method: 'HEAD', signal: AbortSignal.timeout(8000) });
    if (res.status === 405 || res.status === 501) {
      res = await fetch(absolute, { method: 'GET', signal: AbortSignal.timeout(8000) });
    }
    if (!res.ok) {
      return { ok: false, reason: 'httpFail', detail: `${res.status} ${absolute}` };
    }
    return { ok: true, reason: 'ok', detail: absolute };
  } catch (err) {
    return {
      ok: false,
      reason: 'httpFail',
      detail: `${err instanceof Error ? err.message : String(err)} ${absolute}`,
    };
  }
}

async function fetchJson(pathname) {
  const res = await fetch(`${API_BASE}${pathname}`, { signal: AbortSignal.timeout(15000) });
  const json = await res.json();
  if (!res.ok) throw new Error(`HTTP ${res.status} ${pathname}`);
  return json?.data !== undefined ? json.data : json;
}

async function main() {
  console.log(`API_BASE=${API_BASE}`);

  const nearby = await fetchJson('/api/courts/nearby?lat=32.9908&lng=112.5285&radius=150000');
  if (!Array.isArray(nearby)) throw new Error('nearby 返回非数组');
  console.log(`nearby count=${nearby.length} (期望 ${EXPECTED_COUNT})`);
  if (nearby.length !== EXPECTED_COUNT) {
    throw new Error(`附近场地数量不符: got ${nearby.length}, expected ${EXPECTED_COUNT}`);
  }

  const withMedia = [];
  const withoutMedia = [];
  const failures = [];

  for (const item of nearby) {
    const id = Number(item.id);
    const detail = await fetchJson(`/api/courts/${id}`);
    const urls = collectMedia(detail);
    if (!urls.length) {
      withoutMedia.push({ id, name: detail.name });
      continue;
    }
    withMedia.push({ id, name: detail.name, urls });

    for (const url of urls) {
      if (isLoopbackUrl(url)) {
        failures.push({ id, name: detail.name, url, reason: 'loopbackUrl', detail: 'API 返回环回地址，真机不可用' });
        continue;
      }
      const result = await checkUrl(url);
      if (!result.ok) {
        failures.push({ id, name: detail.name, url, ...result });
      }
    }
  }

  // 抽样：nearby 首条有图场与 detail 媒体应一致且非环回
  const sample = withMedia[0];
  if (sample) {
    const again = await fetchJson(`/api/courts/${sample.id}`);
    const againUrls = collectMedia(again);
    const mismatch = sample.urls.length !== againUrls.length
      || sample.urls.some((u) => !againUrls.includes(u));
    if (mismatch) {
      failures.push({
        id: sample.id,
        name: sample.name,
        url: '',
        reason: 'inconsistent',
        detail: 'nearby/detail 媒体不一致',
      });
    }
  }

  const xixia = nearby.filter((c) => String(c.name || '').includes('西峡'));
  const centerish = nearby.filter((c) => /体育|中心|人民|训练/.test(String(c.name || ''))).slice(0, 5);
  const sampleLocal = withMedia.find((c) => c.urls.some((u) => String(u).includes('/uploads/')));
  const sampleRemote = withMedia.find((c) => c.urls.some((u) => /^https:\/\//i.test(String(u))));
  const sampleEmpty = withoutMedia[0];

  console.log(`有图场地: ${withMedia.length}`);
  console.log(`无图场地: ${withoutMedia.length}`);
  console.log(`失败 URL: ${failures.length}`);

  if (failures.length) {
    console.error('\n❌ 实景图校验失败:');
    for (const f of failures.slice(0, 40)) {
      console.error(`  #${f.id} ${f.name} [${f.reason}] ${f.url} → ${f.detail}`);
    }
    if (failures.length > 40) console.error(`  ... 另有 ${failures.length - 40} 条`);
    process.exit(1);
  }

  console.log('\n✅ 全部有图场地的 URL 可达');
  console.log('\n—— 真机抽检建议 ——');
  console.log(`西峡场馆 IDs: ${xixia.map((c) => c.id).join(', ') || '(无)'}`);
  console.log(`市中心样本: ${centerish.map((c) => `${c.id}:${c.name}`).join(' | ') || '(无)'}`);
  if (sampleLocal) console.log(`本地实景抽检: #${sampleLocal.id} ${sampleLocal.name}`);
  if (sampleRemote) console.log(`外链示意抽检: #${sampleRemote.id} ${sampleRemote.name}`);
  if (sampleEmpty) console.log(`无图占位抽检: #${sampleEmpty.id} ${sampleEmpty.name}`);
}

main().catch((e) => {
  console.error('❌ verify-court-media 失败:', e);
  process.exit(1);
});
