/**
 * 收藏/签到/勋章/背景审核 — 源码与 API 面底线检查
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

const mustExist = [
  'manage/src/pages/UsersPage.tsx',
  'manage/src/pages/CheckinFavoritePage.tsx',
  'manage/src/pages/AchievementsPage.tsx',
  'manage/src/pages/BackgroundAuditPage.tsx',
  'server/src/modules/admin/admin-ops.controller.ts',
  'server/src/entities/achievement-def.entity.ts',
  'server/src/entities/court-background-submission.entity.ts',
  'src/pages/favorites/index.tsx',
];

for (const rel of mustExist) {
  if (fs.existsSync(path.join(root, rel))) ok(`exists ${rel}`);
  else fail(`missing ${rel}`);
}

const ops = fs.readFileSync(path.join(root, 'server/src/modules/admin/admin-ops.controller.ts'), 'utf8');
for (const route of ['checkins', 'favorites', 'achievements', 'court-backgrounds']) {
  if (ops.includes(route)) ok(`admin route mentions ${route}`);
  else fail(`admin ops missing ${route}`);
}

const detail = fs.readFileSync(path.join(root, 'src/pages/court-detail/index.tsx'), 'utf8');
if (detail.includes('上传实拍') && detail.includes('submitCourtBackground')) ok('detail has upload entry');
else fail('detail missing upload flow');
if (detail.includes('示意素材，非实拍')) ok('detail has stock hint');
else fail('detail missing stock hint');

const profile = fs.readFileSync(path.join(root, 'src/pages/profile/index.tsx'), 'utf8');
if (profile.includes('我的收藏') && profile.includes('getCheckinHistory')) ok('profile has favorites + checkin history');
else fail('profile missing favorites/checkin');

const index = fs.readFileSync(path.join(root, 'src/pages/index/index.tsx'), 'utf8');
if (index.includes('签到(本地)') || index.includes("签到成功(本地)")) fail('index still fakes checkin success offline');
else ok('index does not fake offline checkin success');

if (process.exitCode) console.error('\nverify-engagement FAILED');
else console.log('\nverify-engagement PASSED');
