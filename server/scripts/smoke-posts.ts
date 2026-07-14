/**
 * Posts API 冒烟测试 — 使用 supertest + dev auth
 * 运行: npm run smoke:posts
 */
process.env.ENABLE_DEV_AUTH = 'true';
process.env.NODE_ENV = 'development';

import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

async function login(app: INestApplication<App>, code: string): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ code })
    .expect(201);
  if (res.body.code !== 0 || !res.body.data?.token) {
    throw new Error(`login failed: ${JSON.stringify(res.body)}`);
  }
  return res.body.data.token as string;
}

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

async function run() {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());
  await app.init();

  const tokenA = await login(app, 'smoke_user_a');
  const tokenB = await login(app, 'smoke_user_b');
  const authA = { Authorization: `Bearer ${tokenA}` };
  const authB = { Authorization: `Bearer ${tokenB}` };

  console.log('✓ login user A & B');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  const startTime = tomorrow.toISOString();

  const createRes = await request(app.getHttpServer())
    .post('/api/posts')
    .set(authA)
    .send({
      title: 'Smoke测试约球',
      courtId: 1,
      startTime,
      totalCapacity: 3,
      feeType: '免费',
      feeValue: 0,
      description: '自动化冒烟',
      requireApproval: true,
    })
    .expect(201);
  assert(createRes.body.code === 0, 'create failed');
  const postId = parseInt(String(createRes.body.data.id).replace('post_', ''), 10);
  console.log(`✓ POST /api/posts → id=${postId}`);

  const listRes = await request(app.getHttpServer())
    .get('/api/posts?keyword=Smoke')
    .set(authA)
    .expect(200);
  assert(listRes.body.code === 0, 'list failed');
  assert(listRes.body.data.some((p: { title: string }) => p.title.includes('Smoke')), 'keyword filter failed');
  console.log('✓ GET /api/posts?keyword=Smoke');

  const afternoonRes = await request(app.getHttpServer())
    .get('/api/posts?timeFilter=下午')
    .set(authA)
    .expect(200);
  assert(afternoonRes.body.code === 0, 'timeFilter failed');
  console.log('✓ GET /api/posts?timeFilter=下午');

  const detailRes = await request(app.getHttpServer())
    .get(`/api/posts/${postId}`)
    .set(authA)
    .expect(200);
  assert(detailRes.body.data.members !== undefined, 'detail missing members');
  console.log('✓ GET /api/posts/:id');

  const joinRes = await request(app.getHttpServer())
    .post(`/api/posts/${postId}/join`)
    .set(authB)
    .expect(201);
  assert(joinRes.body.data.status === 'pending', 'join should be pending');
  console.log('✓ POST /api/posts/:id/join (pending)');

  const detailPending = await request(app.getHttpServer())
    .get(`/api/posts/${postId}`)
    .set(authA)
    .expect(200);
  const pendingMember = detailPending.body.data.pendingMembers?.[0];
  assert(pendingMember, 'pendingMembers empty for organizer');
  console.log('✓ pendingMembers 对发起人可见');

  const detailAsB = await request(app.getHttpServer())
    .get(`/api/posts/${postId}`)
    .set(authB)
    .expect(200);
  assert(
    !detailAsB.body.data.pendingMembers?.length,
    'non-organizer must not see pendingMembers',
  );
  assert(detailAsB.body.data.pendingCount === 0, 'non-organizer pendingCount must be 0');
  console.log('✓ pendingMembers 对非发起人隐藏');

  const badStatus = await request(app.getHttpServer())
    .get('/api/posts?status=cancelled')
    .set(authA)
    .expect(400);
  assert(badStatus.body.code !== 0 || badStatus.status === 400, 'cancelled status should be rejected');
  console.log('✓ status=cancelled 被白名单拒绝');

  await request(app.getHttpServer())
    .post(`/api/posts/${postId}/joins/${pendingMember.joinId}/approve`)
    .set(authA)
    .expect(201);
  console.log('✓ POST approve join');

  const afterApprove = await request(app.getHttpServer())
    .get(`/api/posts/${postId}`)
    .set(authB)
    .expect(200);
  assert(afterApprove.body.data.isJoinedByMe === true, 'should be joined after approve');
  console.log('✓ 审批后 isJoinedByMe=true');

  await request(app.getHttpServer())
    .post(`/api/posts/${postId}/leave`)
    .set(authB)
    .expect(201);
  console.log('✓ POST leave');

  const createDirect = await request(app.getHttpServer())
    .post('/api/posts')
    .set(authA)
    .send({
      title: 'Smoke直接加入',
      courtId: 2,
      startTime,
      totalCapacity: 4,
      feeType: 'AA制',
      feeValue: 15,
      requireApproval: false,
    })
    .expect(201);
  const directId = parseInt(String(createDirect.body.data.id).replace('post_', ''), 10);

  await request(app.getHttpServer())
    .post(`/api/posts/${directId}/join`)
    .set(authB)
    .expect(201);
  console.log('✓ 直接加入 requireApproval=false');

  await request(app.getHttpServer())
    .patch(`/api/posts/${postId}`)
    .set(authA)
    .send({ title: 'Smoke测试约球-已编辑' })
    .expect(200);
  console.log('✓ PATCH /api/posts/:id');

  const mineRes = await request(app.getHttpServer())
    .get('/api/posts/mine')
    .set(authA)
    .expect(200);
  assert(mineRes.body.data.length > 0, 'mine should not be empty');
  console.log('✓ GET /api/posts/mine');

  await request(app.getHttpServer())
    .delete(`/api/posts/${postId}`)
    .set(authA)
    .expect(200);
  console.log('✓ DELETE /api/posts/:id');

  await request(app.getHttpServer())
    .get(`/api/posts/${postId}`)
    .set(authB)
    .expect(404);
  console.log('✓ 已取消帖对路人 404');

  const cancelledAsOrganizer = await request(app.getHttpServer())
    .get(`/api/posts/${postId}`)
    .set(authA)
    .expect(200);
  assert(cancelledAsOrganizer.body.data.id === `post_${postId}`, 'organizer can still view cancelled');
  console.log('✓ 已取消帖发起人可查看');

  await app.close();
  console.log('\n✅ Posts API 冒烟测试全部通过');
}

run().catch((err) => {
  console.error('❌ 冒烟测试失败:', err);
  process.exit(1);
});
