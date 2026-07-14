#!/usr/bin/env node
/**
 * 场点名称横排校验：数据合法性 + 组件/样式契约 + 横排样式契约
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const INDEX_TSX = path.join(ROOT, 'src/pages/index/index.tsx');
const DETAIL_TSX = path.join(ROOT, 'src/pages/court-detail/index.tsx');
const INDEX_SCSS = path.join(ROOT, 'src/pages/index/index.scss');
const DETAIL_SCSS = path.join(ROOT, 'src/pages/court-detail/index.scss');
const COMPONENT_SCSS = path.join(ROOT, 'src/components/CourtNameText/index.scss');
const COMPONENT_TSX = path.join(ROOT, 'src/components/CourtNameText/index.tsx');
const TRAINING_JSON = path.join(ROOT, 'server/data/nanyang-training-courts.json');

const ZERO_WIDTH = /[\u200B-\u200D\uFEFF]/;
const MAX_NAME_LEN = 40;
const SPOT_NAMES = [
  '二技校对面河边乒乓球区',
  '罗洼公园乒乓球区',
  '南阳师范学院乒乓球场',
];

const errors = [];

function fail(msg) {
  errors.push(msg);
}

function loadCourtNames() {
  const courts = new Map();

  const indexSrc = fs.readFileSync(INDEX_TSX, 'utf8');
  const courtRe = /id:\s*(\d+),\s*name:\s*'((?:\\'|[^'])*)'/g;
  let m;
  while ((m = courtRe.exec(indexSrc)) !== null) {
    courts.set(m[1], m[2].replace(/\\'/g, "'"));
  }

  if (fs.existsSync(TRAINING_JSON)) {
    const training = JSON.parse(fs.readFileSync(TRAINING_JSON, 'utf8'));
    for (const court of training) {
      if (court.id != null && court.name) {
        courts.set(String(court.id), court.name);
      }
    }
  }

  return [...courts.entries()].map(([id, name]) => ({ id, name }));
}

function validateNameData(courts) {
  for (const { id, name } of courts) {
    if (!name || !name.trim()) {
      fail(`[data] id=${id}: 名称为空`);
      continue;
    }
    if (/[\n\r\t]/.test(name)) {
      fail(`[data] id=${id}: 名称含换行或制表符 "${name}"`);
    }
    if (ZERO_WIDTH.test(name)) {
      fail(`[data] id=${id}: 名称含零宽字符 "${name}"`);
    }
    if (name.length > MAX_NAME_LEN) {
      fail(`[data] id=${id}: 名称超过 ${MAX_NAME_LEN} 字 (${name.length}): "${name}"`);
    }
  }
}

function validateSpotCourts(courts) {
  for (const spot of SPOT_NAMES) {
    const found = courts.some((c) => c.name === spot);
    if (!found) {
      fail(`[spot] 未找到抽检场点名称: ${spot}`);
    }
  }
}

function validateTsxContract() {
  const indexSrc = fs.readFileSync(INDEX_TSX, 'utf8');
  const detailSrc = fs.readFileSync(DETAIL_TSX, 'utf8');
  const componentSrc = fs.readFileSync(COMPONENT_TSX, 'utf8');

  if (!indexSrc.includes('CourtNameText')) {
    fail('[tsx] index.tsx 未使用 CourtNameText 组件');
  }
  if (!detailSrc.includes('CourtNameText')) {
    fail('[tsx] court-detail/index.tsx 未使用 CourtNameText 组件');
  }
  if (/className="preview-name"/.test(indexSrc) || /<Text[^>]*preview-name/.test(indexSrc)) {
    fail('[tsx] index.tsx 仍使用裸 Text.preview-name 渲染场点名称');
  }
  if (/className="cd-hero-name"/.test(detailSrc) || /<Text[^>]*cd-hero-name/.test(detailSrc)) {
    fail('[tsx] court-detail/index.tsx 仍使用裸 Text.cd-hero-name 渲染场点名称');
  }
  if (!componentSrc.includes('court-name-inner')) {
    fail('[tsx] CourtNameText 应使用 court-name-inner 包裹 Text（避免微信 flex 宽度塌陷）');
  }
  if (!componentSrc.includes('numberOfLines')) {
    fail('[tsx] CourtNameText 未使用 numberOfLines 限制行数');
  }
}

function validateScssContract() {
  const files = [
    { label: 'index.scss', path: INDEX_SCSS, classes: ['.preview-name'] },
    { label: 'court-detail/index.scss', path: DETAIL_SCSS, classes: ['.cd-hero-name'] },
    { label: 'CourtNameText/index.scss', path: COMPONENT_SCSS, classes: ['.court-name-text', '.court-name-wrap', '.court-name-inner'] },
  ];

  for (const { label, path: filePath, classes } of files) {
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf8');
    for (const cls of classes) {
      if (!content.includes(cls)) continue;
      const blockRe = new RegExp(`${cls.replace('.', '\\.')}[^{]*\\{([^}]*)\\}`, 's');
      const block = content.match(blockRe);
      if (!block) continue;
      const rules = block[1];
      if (/flex:\s*1/.test(rules) && cls.includes('court-name-text')) {
        fail(`[scss] ${label} ${cls} 含 flex:1（易导致竖排）`);
      }
      if (/-webkit-box-orient:\s*vertical/.test(rules)) {
        fail(`[scss] ${label} ${cls} 含 -webkit-box-orient: vertical`);
      }
    }
  }

  if (fs.existsSync(INDEX_SCSS)) {
    const indexScss = fs.readFileSync(INDEX_SCSS, 'utf8');
    if (indexScss.includes('.preview-title-row')) {
      fail('[scss] index.scss 仍保留 .preview-title-row（名称应与缩略图分行）');
    }
    if (!/\.preview-header[^}]*align-items:\s*stretch/.test(indexScss)) {
      fail('[scss] preview-header 缺少 align-items: stretch');
    }
  }

  const componentScss = fs.readFileSync(COMPONENT_SCSS, 'utf8');
  if (!componentScss.includes('writing-mode: horizontal-tb')) {
    fail('[scss] CourtNameText 缺少 writing-mode: horizontal-tb');
  }
  if (!componentScss.includes('width: 100%')) {
    fail('[scss] CourtNameText 缺少 width: 100%');
  }
  if (/word-break:\s*break-all/.test(componentScss)) {
    fail('[scss] CourtNameText 不应使用 word-break:break-all（窄宽下会逐字竖排）');
  }
  if (!componentScss.includes('word-break: normal')) {
    fail('[scss] CourtNameText 应使用 word-break: normal 保证横排换行');
  }
  const wrapBlock = componentScss.match(/\.court-name-wrap[^{]*\{([^}]*)\}/s);
  if (wrapBlock && /overflow:\s*hidden/.test(wrapBlock[1])) {
    fail('[scss] court-name-wrap 不应使用 overflow:hidden（微信下易触发竖排）');
  }
}

function validateHorizontalLayoutRules(courts) {
  for (const { id, name } of courts) {
    if (name.length === 1) {
      fail(`[layout] id=${id}: 单字名称需确认展示 "${name}"`);
    }
  }
  console.log(`  spot checks: ${SPOT_NAMES.map((n) => courts.find((c) => c.name === n)?.id || '?').join(', ')}`);
}

const courts = loadCourtNames();
validateNameData(courts);
validateSpotCourts(courts);
validateTsxContract();
validateScssContract();
validateHorizontalLayoutRules(courts);

if (errors.length > 0) {
  console.error('Court name validation FAILED:\n');
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

console.log(`OK: ${courts.length} court names validated (horizontal layout contract)`);
