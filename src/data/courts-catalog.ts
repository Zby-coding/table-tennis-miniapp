import { Court } from '@/types';
import { getApiBaseUrl } from '@/services/api';
import snapshot from './courts-snapshot.json';

const toBool = (value: unknown) => value === true || value === 1 || value === '1' || value === 'true';

export const COURT_PREVIEW_KEY = (id: number) => `court_preview_${id}`;

export const formatTableCount = (count: number | undefined | null): string => {
  const n = Number(count);
  return Number.isFinite(n) && n > 0 ? `${n}张` : '待确认';
};

/** Turn /uploads/... into absolute URL using API origin (strip trailing /api). */
export const resolvePublicAssetUrl = (url: string): string => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  const origin = getApiBaseUrl().replace(/\/api\/?$/, '');
  return `${origin}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
};

export const isUsableCourtThumb = (url: string): boolean => {
  const resolved = resolvePublicAssetUrl(url);
  return /^https?:\/\//i.test(resolved);
};

const resolveUrlList = (urls: unknown): string[] => {
  if (!Array.isArray(urls)) return [];
  return [...new Set(urls.map((u) => resolvePublicAssetUrl(String(u || ''))).filter(Boolean))];
};

const hasUsablePhotos = (court: Pick<Court, 'livePhotos' | 'photo' | 'galleryImages' | 'facilityPhotos'>) => {
  const all = [
    ...(court.livePhotos || []),
    court.photo || '',
    ...(court.galleryImages || []),
    ...(court.facilityPhotos || []),
  ];
  return all.some((u) => isUsableCourtThumb(u));
};

export const normalizeCourt = (court: any): Court => {
  const livePhotos = resolveUrlList(court.livePhotos);
  const galleryImages = resolveUrlList(court.galleryImages);
  const facilityPhotos = resolveUrlList(court.facilityPhotos);
  const photo = resolvePublicAssetUrl(court.photo || '') || livePhotos[0] || '';

  return {
    ...court,
    id: Number(court.id),
    isFree: toBool(court.isFree),
    isIndoor: toBool(court.isIndoor),
    hasLighting: toBool(court.hasLighting),
    activePlayers: Number(court.activePlayers || 0),
    tableCount: Number(court.tableCount || 0),
    lat: Number(court.lat),
    lng: Number(court.lng),
    rating: Number(court.rating || 0),
    photo,
    galleryImages,
    livePhotos,
    photoSource: court.photoSource,
    description: court.description || '',
    facilityPhotos,
    enrichmentMeta: court.enrichmentMeta || null,
    features: court.features || [],
    reviews: court.reviews || [],
    venueType: court.venueType,
    coordVerified: court.coordVerified === true || court.features?.includes('坐标已核实'),
    name: court.name || '未知场地',
    address: court.address || '',
    distanceStr: court.distanceStr || '',
    material: court.material || '—',
    openHours: court.openHours || '—',
  };
};

/** Prefer remote fields when present; keep local description/media/meta if remote is empty. */
export const mergeCourtMedia = (remote: Court, local: Court | null): Court => {
  if (!local) return remote;
  const remoteHasPhotos = hasUsablePhotos(remote);
  const localHasPhotos = hasUsablePhotos(local);

  return {
    ...local,
    ...remote,
    description: (remote.description && remote.description.trim()) || local.description || '',
    photo: remoteHasPhotos ? (remote.photo || local.photo) : (local.photo || remote.photo),
    livePhotos: remoteHasPhotos && remote.livePhotos?.length
      ? remote.livePhotos
      : (local.livePhotos?.length ? local.livePhotos : remote.livePhotos || []),
    galleryImages: remoteHasPhotos && remote.galleryImages?.length
      ? remote.galleryImages
      : (local.galleryImages?.length ? local.galleryImages : remote.galleryImages || []),
    facilityPhotos: remoteHasPhotos && remote.facilityPhotos?.length
      ? remote.facilityPhotos
      : (local.facilityPhotos?.length ? local.facilityPhotos : remote.facilityPhotos || []),
    enrichmentMeta: remote.enrichmentMeta || local.enrichmentMeta || null,
    photoSource: remote.photoSource || local.photoSource,
    features: (remote.features?.length ? remote.features : local.features) || [],
  };
};

const SNAPSHOT_COURTS: Court[] = (snapshot as any[]).map(normalizeCourt);

export const getSnapshotCourts = (): Court[] => SNAPSHOT_COURTS.map((court) => ({ ...court }));

export const getSnapshotCourtById = (id: number): Court | null => {
  const found = SNAPSHOT_COURTS.find((court) => Number(court.id) === Number(id));
  return found ? { ...found } : null;
};

export const filterSnapshotCourts = (
  filter: string,
  query: string,
  origin?: { lat: number; lng: number },
): Court[] => {
  let list = getSnapshotCourts();
  if (filter === '免费') list = list.filter((court) => court.isFree);
  if (filter === '室内') list = list.filter((court) => court.isIndoor);
  if (filter === '有灯光') list = list.filter((court) => court.hasLighting);
  if (query) {
    const q = query.toLowerCase();
    list = list.filter(
      (court) => court.name.toLowerCase().includes(q) || court.address.toLowerCase().includes(q),
    );
  }

  if (origin) {
    list = list.map((court) => {
      const dKm = haversineKm(origin.lat, origin.lng, court.lat, court.lng);
      return {
        ...court,
        distanceStr: dKm < 1 ? `${Math.round(dKm * 1000)}m` : `${dKm.toFixed(1)}km`,
      };
    }).sort((a, b) => parseDistance(a.distanceStr) - parseDistance(b.distanceStr));
  }

  return list;
};

const parseDistance = (value: string) => {
  if (!value) return Number.MAX_SAFE_INTEGER;
  if (value.endsWith('m') && !value.endsWith('km')) return Number(value.replace('m', '')) / 1000;
  return Number(value.replace('km', '')) || Number.MAX_SAFE_INTEGER;
};

const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const getCourtThumb = (court: Court): string => {
  const candidates = [
    court.livePhotos?.[0],
    court.photo,
    court.galleryImages?.[0],
    court.facilityPhotos?.[0],
  ];
  for (const candidate of candidates) {
    const url = resolvePublicAssetUrl(candidate || '');
    if (isUsableCourtThumb(url)) return url;
  }
  return '';
};
