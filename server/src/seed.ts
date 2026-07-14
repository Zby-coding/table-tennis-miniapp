import * as fs from 'fs';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { Court } from './entities/court.entity';

interface SnapshotCourt {
  id?: number;
  name?: string;
  address?: string;
  lat?: number;
  lng?: number;
  isFree?: boolean;
  isIndoor?: boolean;
  hasLighting?: boolean;
  tableCount?: number;
  material?: string;
  openHours?: string;
  rating?: number;
  features?: string[];
  city?: string;
  description?: string;
  photo?: string;
  galleryImages?: string[];
  livePhotos?: string[];
  facilityPhotos?: string[];
  enrichmentMeta?: Court['enrichmentMeta'];
  status?: number;
}

/** 引用 courtId 的表，需在清空 courts 前删除，避免孤儿引用 */
const COURT_DEPENDENT_TABLES = [
  'post_joins',
  'match_posts',
  'court_reviews',
  'court_background_submissions',
  'favorites',
  'checkins',
  'match_records',
  'courts',
] as const;

function loadSnapshot(): SnapshotCourt[] {
  const candidates = [
    path.resolve(__dirname, '../../src/data/courts-snapshot.json'),
    path.resolve(process.cwd(), '../src/data/courts-snapshot.json'),
    path.resolve(process.cwd(), 'src/data/courts-snapshot.json'),
  ];
  for (const file of candidates) {
    if (fs.existsSync(file)) {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
      const list = Array.isArray(raw) ? raw : raw.courts || raw.data || [];
      if (!Array.isArray(list)) {
        throw new Error(`snapshot 格式无效（非数组）: ${file}`);
      }
      console.log(`📦 读取 snapshot: ${file} (${list.length} 条)`);
      return list as SnapshotCourt[];
    }
  }
  throw new Error('找不到 courts-snapshot.json，请确认路径 src/data/courts-snapshot.json');
}

function isValidCoord(lat: unknown, lng: unknown) {
  const la = Number(lat);
  const ln = Number(lng);
  return Number.isFinite(la) && Number.isFinite(ln) && la >= 10 && la <= 60 && ln >= 50 && ln <= 180;
}

function collectPhotos(row: SnapshotCourt): string[] {
  const photos = [
    ...(Array.isArray(row.livePhotos) ? row.livePhotos : []),
    ...(Array.isArray(row.galleryImages) ? row.galleryImages : []),
    ...(row.photo ? [row.photo] : []),
  ].filter((p): p is string => typeof p === 'string' && p.trim().length > 0);
  return [...new Set(photos)];
}

function isSqlite(dataSource: DataSource): boolean {
  return String(dataSource.options.type).includes('sqlite');
}

async function setForeignKeys(executor: { query: (sql: string) => Promise<unknown> }, sqlite: boolean, enabled: boolean) {
  if (sqlite) {
    await executor.query(`PRAGMA foreign_keys = ${enabled ? 'ON' : 'OFF'}`);
  } else {
    await executor.query(`SET FOREIGN_KEY_CHECKS = ${enabled ? 1 : 0}`);
  }
}

async function clearCourtTables(executor: { query: (sql: string) => Promise<unknown> }) {
  for (const table of COURT_DEPENDENT_TABLES) {
    try {
      await executor.query(`DELETE FROM ${table}`);
      console.log(`🗑️  已清空 ${table}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // 表可能尚未创建（首次迁移前），跳过即可
      console.warn(`⚠️  跳过 ${table}: ${msg}`);
    }
  }
}

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const repo = dataSource.getRepository(Court);
  const snapshot = loadSnapshot();
  const sqlite = isSqlite(dataSource);

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    await setForeignKeys(queryRunner, sqlite, false);
    await clearCourtTables(queryRunner);

    let inserted = 0;
    let skipped = 0;

    for (const row of snapshot) {
      if (!row?.name || !isValidCoord(row.lat, row.lng)) {
        skipped += 1;
        continue;
      }

      const photos = collectPhotos(row);
      const facilityPhotos = Array.isArray(row.facilityPhotos)
        ? row.facilityPhotos.filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
        : [];

      const entity = repo.create({
        id: Number.isFinite(Number(row.id)) ? Number(row.id) : undefined,
        name: String(row.name).slice(0, 128),
        address: String(row.address || '').slice(0, 512),
        lat: Number(row.lat),
        lng: Number(row.lng),
        isFree: row.isFree !== false,
        isIndoor: !!row.isIndoor,
        hasLighting: !!row.hasLighting,
        tableCount: Number(row.tableCount) > 0 ? Number(row.tableCount) : 1,
        material: String(row.material || '水泥').slice(0, 64),
        openHours: String(row.openHours || '全天').slice(0, 128),
        rating: Number.isFinite(Number(row.rating)) ? Number(row.rating) : 5,
        features: Array.isArray(row.features) ? row.features : [],
        city: row.city ? String(row.city).slice(0, 64) : '南阳',
        description: row.description ? String(row.description) : null,
        photos: photos.length ? photos : null,
        facilityPhotos: facilityPhotos.length ? facilityPhotos : null,
        enrichmentMeta: row.enrichmentMeta || null,
        status: row.status === 0 ? 0 : 1,
      } as Partial<Court>);

      await queryRunner.manager.save(Court, entity);
      inserted += 1;
    }

    await queryRunner.commitTransaction();
    console.log(`✅ 插入 ${inserted} 个南阳场地（跳过无效 ${skipped}）`);
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    try {
      await setForeignKeys(queryRunner, sqlite, true);
    } catch {
      // ignore restore failure
    }
    await queryRunner.release();
  }

  await app.close();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
