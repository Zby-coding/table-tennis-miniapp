import * as fs from 'fs';
import * as path from 'path';
import { CourtEnrichmentMeta, PhotoSource } from '../../entities/court-enrichment.types';

export interface CourtMediaFields {
  photo: string;
  galleryImages: string[];
  facilityPhotos: string[];
  livePhotos: string[];
  description: string;
  enrichmentMeta: CourtEnrichmentMeta | null;
  photoSource: PhotoSource;
}

interface EnrichmentCacheEntry {
  photos?: string[];
  facilityPhotos?: string[];
  description?: string;
  enrichmentMeta?: CourtEnrichmentMeta | null;
}

let enrichmentCache: Record<string, EnrichmentCacheEntry> | null = null;

function getApiBase(): string {
  return process.env.API_PUBLIC_URL || 'http://192.168.0.102:3017';
}

function toPublicUrl(value: string, base: string): string {
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return `${base}${value.startsWith('/') ? '' : '/'}${value}`;
}

function isPlatformUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return /dpfile\.com|meituan\.net|dianping\.com|pstatp\.com|douyinpic\.com|xiaohongshu\.com|xhscdn\.com/.test(lower);
}

function isStockUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return /unsplash\.com|pexels\.com|picsum\.photos/.test(lower);
}

function scorePhotoUrl(url: string): number {
  if (isPlatformUrl(url)) return 100;
  if (isStockUrl(url)) return 10;
  if (url.startsWith('/uploads/')) return 80;
  return 50;
}

function detectPhotoSource(urls: string[], meta?: CourtEnrichmentMeta | null): PhotoSource {
  if (meta?.photoSource) return meta.photoSource;
  const platformCount = urls.filter(isPlatformUrl).length;
  const stockCount = urls.filter(isStockUrl).length;
  if (platformCount > 0 && stockCount === 0) return 'platform';
  if (stockCount > 0 && platformCount === 0) return 'stock';
  if (platformCount > 0 && stockCount > 0) return 'mixed';
  return 'stock';
}

export function loadEnrichmentCache(): Record<string, EnrichmentCacheEntry> {
  if (enrichmentCache) return enrichmentCache;
  const cachePath = path.join(process.cwd(), 'data', 'court-enrichment-cache.json');
  if (!fs.existsSync(cachePath)) {
    enrichmentCache = {};
    return enrichmentCache;
  }
  try {
    enrichmentCache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  } catch {
    enrichmentCache = {};
  }
  return enrichmentCache!;
}

export function mapCourtMedia(court: {
  photos?: string[] | null;
  facilityPhotos?: string[] | null;
  description?: string | null;
  enrichmentMeta?: CourtEnrichmentMeta | null;
  id?: number;
}): CourtMediaFields {
  const cacheEntry = court.id ? loadEnrichmentCache()[String(court.id)] : undefined;
  const photos = court.photos?.length ? court.photos : (cacheEntry?.photos || []);
  const facilityPhotos = court.facilityPhotos?.length
    ? court.facilityPhotos
    : (cacheEntry?.facilityPhotos || []);
  const description = court.description || cacheEntry?.description || '';
  const enrichmentMeta = court.enrichmentMeta || cacheEntry?.enrichmentMeta || null;
  const base = getApiBase();

  const galleryUrls = photos.map((p) => toPublicUrl(p, base)).filter((u) => u && !isStockUrl(u));
  const facilityUrls = facilityPhotos.map((p) => toPublicUrl(p, base)).filter((u) => u && !isStockUrl(u));
  const merged = [...new Set([...facilityUrls, ...galleryUrls])].filter(Boolean);
  const livePhotos = merged
    .sort((a, b) => scorePhotoUrl(b) - scorePhotoUrl(a))
    .slice(0, 3);
  const photoSource = detectPhotoSource(livePhotos, enrichmentMeta);

  return {
    photo: livePhotos[0] || '',
    galleryImages: galleryUrls,
    facilityPhotos: facilityUrls,
    livePhotos,
    description,
    enrichmentMeta,
    photoSource,
  };
}
