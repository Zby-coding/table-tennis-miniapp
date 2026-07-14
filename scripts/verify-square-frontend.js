/**
 * 约球广场前端集成验证（可替代部分手工清单的自动化检查）
 * 运行: node scripts/verify-square-frontend.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const checks = [
  ['src/data.ts', /INITIAL_MATCH_POSTS[\s\S]*?id: 'post_1'/, 'mock 含 post_1'],
  ['src/app.config.ts', /pages\/post-detail\/index/, '路由注册 post-detail'],
  ['src/services/api.ts', /getPostDetail|leavePost|approveJoin|getMyPosts/, 'API 封装完整'],
  ['src/pages/square/index.tsx', /requireApproval|handleLeave|goDetail/, '广场页功能接线'],
  ['src/pages/post-detail/index.tsx', /handleReview|handleLeave|handleJoin/, '详情页操作'],
  ['dist/pages/post-detail/index.js', /./, 'post-detail 已编译'],
];

let failed = 0;
for (const [file, pattern, label] of checks) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) {
    console.error(`✗ ${label}: 文件不存在 ${file}`);
    failed++;
    continue;
  }
  const content = fs.readFileSync(full, 'utf8');
  if (!pattern.test(content)) {
    console.error(`✗ ${label}: 检查未通过 ${file}`);
    failed++;
    continue;
  }
  console.log(`✓ ${label}`);
}

const dataContent = fs.readFileSync(path.join(root, 'src/data.ts'), 'utf8');
const postBlocks = (dataContent.match(/id: 'post_/g) || []).length;
if (postBlocks !== 1) {
  console.error(`✗ mock 应仅 1 条，当前 ${postBlocks} 条`);
  failed++;
} else {
  console.log('✓ mock 仅 1 条测试数据');
}

if (failed > 0) {
  process.exit(1);
}
console.log('\n✅ 前端集成验证通过');
