/**
 * 上线体验底线检查：
 * - 快照描述/图覆盖率
 * - 首页源码无快照吐司 / 「快照」角标文案
 * - resolvePublicAssetUrl 行为（与 catalog 逻辑一致）
 * - dist 无 process.env（若已 build）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const fail = (msg) => {
  console.error(`FAIL: ${msg}`);
  process.exitCode = 1;
};
const ok = (msg) => console.log(`OK: ${msg}`);

const snapshotPath = path.join(root, 'src/data/courts-snapshot.json');
const indexTsx = path.join(root, 'src/pages/index/index.tsx');
const catalogTs = path.join(root, 'src/data/courts-catalog.ts');

const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
const total = snapshot.length;
const withDesc = snapshot.filter((c) => String(c.description || '').trim()).length;
const withAnyPhoto = snapshot.filter((c) => {
  const urls = [
    ...(c.livePhotos || []),
    c.photo,
    ...(c.galleryImages || []),
    ...(c.facilityPhotos || []),
  ].filter(Boolean);
  return urls.length > 0;
}).length;

ok(`snapshot courts=${total}, description=${withDesc} (${((withDesc / total) * 100).toFixed(0)}%), photos=${withAnyPhoto} (${((withAnyPhoto / total) * 100).toFixed(0)}%)`);
if (withDesc / total < 0.5) fail('description coverage < 50%');

const indexSrc = fs.readFileSync(indexTsx, 'utf8');
if (/本地快照/.test(indexSrc) || /title:.*快照/.test(indexSrc)) {
  fail('index.tsx still has snapshot toast copy');
} else {
  ok('index.tsx has no snapshot toast copy');
}
if (/快照<\/Text>|['"]快照['"]/.test(indexSrc) && /search-loading/.test(indexSrc) && indexSrc.includes('>快照<')) {
  fail('index.tsx still shows 快照 badge');
} else if (indexSrc.includes('>快照<') || indexSrc.includes("'快照'") || indexSrc.includes('"快照"')) {
  fail('index.tsx still contains 快照 UI string');
} else {
  ok('index.tsx has no 快照 UI string');
}
if (/preview-thumb-empty/.test(indexSrc)) {
  fail('index.tsx still renders preview-thumb-empty');
} else {
  ok('index.tsx does not render empty thumb placeholder');
}

const catalogSrc = fs.readFileSync(catalogTs, 'utf8');
for (const name of ['resolvePublicAssetUrl', 'isUsableCourtThumb', 'mergeCourtMedia']) {
  if (!catalogSrc.includes(`export const ${name}`)) fail(`missing export ${name}`);
  else ok(`catalog exports ${name}`);
}

// Mirror resolvePublicAssetUrl for unit-ish check without Taro
const resolvePublicAssetUrl = (url, apiBase) => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  const origin = apiBase.replace(/\/api\/?$/, '');
  return `${origin}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
};

const base = 'http://192.168.0.102:3017/api';
const cases = [
  ['https://cdn.example.com/a.jpg', 'https://cdn.example.com/a.jpg'],
  ['/uploads/courts/1/live-0.jpg', 'http://192.168.0.102:3017/uploads/courts/1/live-0.jpg'],
  ['uploads/x.jpg', 'http://192.168.0.102:3017/uploads/x.jpg'],
  ['', ''],
];
for (const [input, expected] of cases) {
  const got = resolvePublicAssetUrl(input, base);
  if (got !== expected) fail(`resolvePublicAssetUrl(${JSON.stringify(input)}) => ${got}, expected ${expected}`);
  else ok(`resolvePublicAssetUrl(${JSON.stringify(input)})`);
}

const distJs = path.join(root, 'dist');
if (fs.existsSync(distJs)) {
  const walk = (dir, acc = []) => {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      const st = fs.statSync(p);
      if (st.isDirectory()) walk(p, acc);
      else if (/\.(js|wxml|json)$/.test(name)) acc.push(p);
    }
    return acc;
  };
  const files = walk(distJs);
  const processHits = files.filter((f) => {
    const text = fs.readFileSync(f, 'utf8');
    return text.includes('process.env');
  });
  if (processHits.length) fail(`dist still contains process.env in: ${processHits.map((f) => path.relative(root, f)).join(', ')}`);
  else ok(`dist scanned ${files.length} files, no process.env`);

  const indexDist = files.filter((f) => /pages[\\/]index[\\/]index\.js$/.test(f));
  for (const f of indexDist) {
    const text = fs.readFileSync(f, 'utf8');
    if (text.includes('本地快照') || /快照\s*\d+\s*个场地/.test(text)) {
      fail(`dist index still has snapshot toast: ${path.relative(root, f)}`);
    } else {
      ok(`dist index has no snapshot toast: ${path.relative(root, f)}`);
    }
  }
} else {
  console.log('SKIP: dist/ missing (run npm run build:weapp first for dist checks)');
}

if (process.exitCode) {
  console.error('\nverify-court-ux FAILED');
} else {
  console.log('\nverify-court-ux PASSED');
}
