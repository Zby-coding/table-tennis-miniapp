/**
 * Dedupe server/uploads by MD5 using hard links (paths unchanged).
 *
 * Classification (by filename role under courts/{id}/):
 *   live-*      → 详情实况轮播
 *   gallery-*   → 相册
 *   facility-*  → 设施图
 *   other       → 根目录通用上传 / 无法识别
 *
 * Usage (from server/):
 *   node scripts/dedupe-uploads.mjs
 *   node scripts/dedupe-uploads.mjs --dry-run
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsRoot = path.resolve(__dirname, '../uploads');
const dryRun = process.argv.includes('--dry-run');

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (st.isFile()) acc.push(p);
  }
  return acc;
}

function roleOf(filePath) {
  const base = path.basename(filePath).toLowerCase();
  if (base.startsWith('live-')) return 'live';
  if (base.startsWith('gallery-')) return 'gallery';
  if (base.startsWith('facility-')) return 'facility';
  return 'other';
}

function md5File(filePath) {
  return crypto.createHash('md5').update(fs.readFileSync(filePath)).digest('hex');
}

if (!fs.existsSync(uploadsRoot)) {
  console.error(`uploads not found: ${uploadsRoot}`);
  process.exit(1);
}

const files = walk(uploadsRoot);
const byHash = new Map();
const roleCount = { live: 0, gallery: 0, facility: 0, other: 0 };

for (const file of files) {
  roleCount[roleOf(file)] += 1;
  const hash = md5File(file);
  if (!byHash.has(hash)) byHash.set(hash, []);
  byHash.get(hash).push(file);
}

let linked = 0;
let failed = 0;
const groups = [...byHash.entries()].filter(([, list]) => list.length > 1);

for (const [, list] of groups) {
  const canonical = list[0];
  for (let i = 1; i < list.length; i += 1) {
    const target = list[i];
    try {
      if (dryRun) {
        linked += 1;
        continue;
      }
      // Replace duplicate with hard link to canonical (same bytes, path preserved)
      fs.unlinkSync(target);
      fs.linkSync(canonical, target);
      linked += 1;
    } catch (err) {
      failed += 1;
      console.warn(`link failed: ${target} <- ${canonical}: ${err.message}`);
      // Best-effort restore: if unlink succeeded but link failed, copy back
      if (!fs.existsSync(target) && fs.existsSync(canonical)) {
        try {
          fs.copyFileSync(canonical, target);
        } catch {
          // ignore
        }
      }
    }
  }
}

console.log(JSON.stringify({
  dryRun,
  uploadsRoot,
  files: files.length,
  unique: byHash.size,
  dupGroups: groups.length,
  hardLinkedOrWouldLink: linked,
  failed,
  byRole: roleCount,
}, null, 2));
