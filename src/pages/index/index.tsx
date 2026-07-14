import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Map as TaroMap, Input, ScrollView, Text, Image } from '@tarojs/components';
import Taro, { useReady } from '@tarojs/taro';
import { Court } from '@/types';
import CourtNameText from '@/components/CourtNameText';
import {
  getNearbyCourts,
  getFavorites,
  toggleFavorite,
  checkin as apiCheckin,
} from '@/services/api';
import {
  COURT_PREVIEW_KEY,
  filterSnapshotCourts,
  formatTableCount,
  getCourtThumb,
  getSnapshotCourts,
  isUsableCourtThumb,
  normalizeCourt,
} from '@/data/courts-catalog';
import {
  DEFAULT_LOCATION,
  isValidCoord,
  getUserLocation,
  ensureLocationPermission,
  openCourtNavigation,
} from '@/utils/location';
import './index.scss';

const FILTERS = ['全部', '免费', '室内', '有灯光'] as const;
const FILTER_TONES: Record<typeof FILTERS[number], string> = { 全部: 'all', 免费: 'free', 室内: 'indoor', 有灯光: 'lighting' };
const INITIAL_MAP_SCALE = 14;
const isH5 = process.env.TARO_ENV === 'h5';

/** Root-absolute paths work reliably on real-device WeChat maps. */
const getMarkerIconPath = (court: Court) => {
  if (!court.isFree) return '/assets/markers/marker-paid.png';
  if (court.isIndoor) return '/assets/markers/marker-indoor.png';
  if (court.hasLighting) return '/assets/markers/marker-hot.png';
  return '/assets/markers/marker-free.png';
};

const saveCourtPreview = (court: Court) => {
  try {
    Taro.setStorageSync(COURT_PREVIEW_KEY(court.id), court);
  } catch {
    // ignore
  }
};

const openCourtDetail = (court: Court) => {
  saveCourtPreview(court);
  Taro.navigateTo({ url: `/pages/court-detail/index?id=${court.id}` });
};

export default function IndexPage() {
  const [courts, setCourts] = useState<Court[]>(() => getSnapshotCourts());
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>(DEFAULT_LOCATION);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('全部');
  const [loading, setLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState(DEFAULT_LOCATION);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkedInId, setCheckedInId] = useState<number | null>(null);

  const markerTapFlagRef = useRef(false);
  const navigatingRef = useRef(false);
  const selectedCourtRef = useRef<Court | null>(null);
  const markerIdToCourtIdRef = useRef<Map<number, number>>(new Map());
  const loadedRef = useRef(false);
  const mapId = 'home-tennis-map';

  const resolveUserLocation = useCallback(async (requestPermission = false) => {
    const result = await getUserLocation();
    if (result.denied && requestPermission) {
      const permitted = await ensureLocationPermission();
      if (!permitted) return { location: DEFAULT_LOCATION, denied: true, fromGps: false };
      const retry = await getUserLocation();
      setUserLocation(retry.location);
      return retry;
    }
    setUserLocation(result.location);
    return result;
  }, []);

  const applyCourts = useCallback((list: Court[], source: 'api' | 'snapshot') => {
    setCourts(list);
    setShowPreview(false);
    setSelectedCourt(null);
    selectedCourtRef.current = null;
    // Do NOT set includePoints / fitBounds — known to timeout the home map page.
    console.info('[Courts]', source, list.length);
  }, []);

  const loadCourts = useCallback(async (loc?: { lat: number; lng: number }, filterName?: string, queryStr?: string) => {
    const filter = filterName ?? activeFilter;
    const query = queryStr ?? searchQuery;
    setLoading(true);

    const location = loc || userLocation || (await resolveUserLocation()).location;

    try {
      const params: { isFree?: boolean; isIndoor?: boolean; hasLighting?: boolean; keyword?: string } = {};
      if (filter === '免费') params.isFree = true;
      if (filter === '室内') params.isIndoor = true;
      if (filter === '有灯光') params.hasLighting = true;
      if (query) params.keyword = query;

      const res = await getNearbyCourts(location.lat, location.lng, Object.keys(params).length ? params : undefined);
      if (res.code === 0 && Array.isArray(res.data)) {
        const valid = res.data.filter((court: any) => isValidCoord(court.lat, court.lng)).map(normalizeCourt);
        if (valid.length > 0) {
          applyCourts(valid, 'api');
          return;
        }
      }

      applyCourts(filterSnapshotCourts(filter, query, location), 'snapshot');
    } catch (error) {
      console.warn('[Courts] API failed, use snapshot:', error);
      applyCourts(filterSnapshotCourts(filter, query, location), 'snapshot');
    } finally {
      setLoading(false);
    }
  }, [activeFilter, applyCourts, resolveUserLocation, searchQuery, userLocation]);

  useReady(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    setTimeout(async () => {
      let authReady = false;
      try {
        const { login, setToken, getToken } = await import('@/services/api');
        authReady = Boolean(getToken());
        if (!authReady) {
          const res = await login('miniapp_auto', '球友');
          if (res.code === 0 && res.data?.token) setToken(res.data.token);
          authReady = Boolean(getToken());
        }
      } catch (error) {
        console.warn('[Auth] Login failed:', error);
      }

      if (authReady) {
        getFavorites()
          .then((res) => {
            if (res.code === 0 && Array.isArray(res.data)) {
              setFavorites(new Set(res.data.map((item: any) => Number(item.id || item.courtId))));
            }
          })
          .catch((error) => console.warn('[Favorites] Load failed:', error));
      }

      resolveUserLocation()
        .then((result) => {
          setUserLocation(result.location);
          if (result.fromGps && isValidCoord(result.location.lat, result.location.lng)) {
            setMapCenter(result.location);
          }
          return loadCourts(result.location);
        })
        .catch((error) => {
          console.error('[Courts] Failed:', error);
          applyCourts(filterSnapshotCourts('全部', '', DEFAULT_LOCATION), 'snapshot');
        });
    }, 200);
  });

  const markers = useMemo(() => {
    const idMap = new Map<number, number>();
    const next = courts
      .filter((court) => Number.isFinite(Number(court.id)) && isValidCoord(court.lat, court.lng))
      .map((court, index) => {
        const markerId = index + 1;
        idMap.set(markerId, Number(court.id));
        return {
          id: markerId,
          latitude: Number(court.lat),
          longitude: Number(court.lng),
          title: court.name,
          iconPath: getMarkerIconPath(court),
          width: 28,
          height: 28,
          anchor: { x: 0.5, y: 1 },
        };
      });
    markerIdToCourtIdRef.current = idMap;
    return next;
  }, [courts]);

  const handleMarkerTap = useCallback((event: any) => {
    const markerId = Number(event?.detail?.markerId ?? event?.markerId);
    const courtId = markerIdToCourtIdRef.current.get(markerId) ?? markerId;
    const court = courts.find((item) => Number(item.id) === courtId);
    if (!court) {
      Taro.showToast({ title: '未找到场地', icon: 'none' });
      return;
    }

    markerTapFlagRef.current = true;
    selectedCourtRef.current = court;
    setSelectedCourt(court);
    setShowPreview(true);
  }, [courts]);

  const handleMapTap = useCallback(() => {
    if (navigatingRef.current) return;
    if (markerTapFlagRef.current) {
      markerTapFlagRef.current = false;
      return;
    }
    setShowPreview(false);
  }, []);

  const handleClosePreview = useCallback(() => {
    setShowPreview(false);
  }, []);

  const handleOpenDetail = useCallback(() => {
    const court = selectedCourtRef.current || selectedCourt;
    if (!court) return;
    navigatingRef.current = true;
    openCourtDetail(court);
    setTimeout(() => { navigatingRef.current = false; }, 800);
  }, [selectedCourt]);

  const handleNavigate = useCallback(() => {
    const court = selectedCourtRef.current || selectedCourt;
    if (!court) return;
    openCourtNavigation(court, { mapId });
  }, [selectedCourt]);

  const handleFavorite = useCallback(async () => {
    const court = selectedCourtRef.current || selectedCourt;
    if (!court) return;
    try {
      const res = await toggleFavorite(court.id);
      setFavorites((prev) => {
        const next = new Set(prev);
        res.data?.favorite ? next.add(court.id) : next.delete(court.id);
        return next;
      });
      Taro.showToast({ title: res.data?.favorite ? '已收藏' : '已取消', icon: 'success' });
    } catch {
      Taro.showToast({ title: '收藏需连接服务器', icon: 'none' });
    }
  }, [selectedCourt]);

  const handleCheckin = useCallback(async () => {
    const court = selectedCourtRef.current || selectedCourt;
    if (!court || checkingIn) return;
    setCheckingIn(true);
    try {
      const { location: loc, denied } = await resolveUserLocation(true);
      if (denied) {
        Taro.showToast({ title: '需要位置权限才能签到', icon: 'none' });
        return;
      }
      const res = await apiCheckin(court.id, loc.lat, loc.lng);
      if (res.code === 0) {
        setCheckedInId(court.id);
        const unlocked = res.data?.newAchievements?.length
          ? `解锁勋章 ×${res.data.newAchievements.length}`
          : '签到成功!';
        Taro.showToast({ title: unlocked, icon: 'success' });
      } else {
        Taro.showToast({ title: res.message || '签到失败', icon: 'none' });
      }
    } catch (err: any) {
      Taro.showToast({ title: err?.message || '签到失败，请检查网络', icon: 'none' });
    } finally {
      setCheckingIn(false);
    }
  }, [checkingIn, resolveUserLocation, selectedCourt]);

  const handleFilterTap = useCallback((filter: string) => {
    const nextFilter = filter === '全部' ? '全部' : filter;
    setActiveFilter(nextFilter);
    setShowPreview(false);
    loadCourts(undefined, nextFilter, searchQuery);
  }, [loadCourts, searchQuery]);

  const preview = selectedCourt;
  const thumb = preview ? getCourtThumb(preview) : '';
  const hasThumb = isUsableCourtThumb(thumb);

  return (
    <View className="index-page">
      <View className="map-chrome">
        <View className="search-bar">
          <View className="search-box">
            <Text className="icon-search">🔍</Text>
            <Input
              className="search-input"
              type="text"
              placeholder="搜索场地"
              value={searchQuery}
              onInput={(event) => setSearchQuery(event.detail.value)}
              onConfirm={() => loadCourts(undefined, undefined, searchQuery)}
              confirmType="search"
            />
            {loading && <Text className="search-loading">加载中</Text>}
          </View>
        </View>
        <ScrollView className="filter-row" scrollX enableFlex>
          {FILTERS.map((chip) => {
            const isActive = chip === activeFilter;
            return (
              <View
                key={chip}
                className={`filter-chip filter-${FILTER_TONES[chip]}${isActive ? ' active' : ''}`}
                onClick={() => handleFilterTap(chip)}
              >
                <Text className="filter-chip-text">{chip}</Text>
              </View>
            );
          })}
        </ScrollView>
      </View>

      <View className="map-area">
        {isH5 ? (
          <View className="h5-map-fallback">
            <View className="h5-map-grid" />
            <View className="h5-map-label"><Text>H5 场地预览</Text></View>
            {markers.slice(0, 12).map((marker, index) => (
              <View
                key={marker.id}
                className="h5-map-marker"
                style={{ left: `${18 + (index * 17) % 64}%`, top: `${26 + (index * 23) % 50}%` }}
                onClick={() => handleMarkerTap({ detail: { markerId: marker.id } })}
              >
                <Text>🏓</Text>
              </View>
            ))}
          </View>
        ) : (
          <TaroMap
            id={mapId}
            className="map-canvas"
            latitude={mapCenter.lat}
            longitude={mapCenter.lng}
            scale={INITIAL_MAP_SCALE}
            markers={markers}
            showLocation
            showCompass
            showScale
            enableZoom
            enableScroll
            enableRotate={false}
            onMarkerTap={handleMarkerTap}
            onTap={handleMapTap}
          />
        )}
      </View>

      {showPreview && preview ? (
        <View className="court-preview">
          <View className="preview-close" onClick={handleClosePreview}><Text>✕</Text></View>
          <View className="preview-header">
            <CourtNameText name={preview.name} variant="preview" />
            <View className={`preview-sub-row${hasThumb ? '' : ' preview-sub-row--no-thumb'}`}>
              {hasThumb ? (
                <Image className="preview-thumb" src={thumb} mode="aspectFill" />
              ) : null}
              <View className="preview-badges">
                {preview.isFree
                  ? <View className="badge badge-free"><Text>免费</Text></View>
                  : <View className="badge badge-paid"><Text>付费</Text></View>}
                {preview.venueType === 'training' ? (
                  <View className="badge badge-training"><Text>培训馆</Text></View>
                ) : null}
                {preview.coordVerified ? (
                  <View className="badge badge-verified"><Text>坐标已核实</Text></View>
                ) : null}
                <View className="badge badge-rating"><Text>⭐{preview.rating || '—'}</Text></View>
                <View className="badge badge-active"><Text>🏓{preview.activePlayers || 0}人</Text></View>
              </View>
            </View>
          </View>

          <Text className={`preview-address${hasThumb ? '' : ' preview-address--compact'}`}>{preview.address}</Text>

          <View className="preview-meta">
            <View className="meta-item">
              <Text className="meta-label">距离</Text>
              <Text className="meta-value">{preview.distanceStr || '—'}</Text>
            </View>
            <View className="meta-item">
              <Text className="meta-label">球台</Text>
              <Text className="meta-value">{formatTableCount(preview.tableCount)}</Text>
            </View>
            <View className="meta-item">
              <Text className="meta-label">材质</Text>
              <Text className="meta-value">{preview.material || '—'}</Text>
            </View>
            <View className="meta-item">
              <Text className="meta-label">灯光</Text>
              <Text className="meta-value">{preview.hasLighting ? '有' : '无'}</Text>
            </View>
            <View className="meta-item">
              <Text className="meta-label">场地</Text>
              <Text className="meta-value">{preview.isIndoor ? '室内' : '户外'}</Text>
            </View>
          </View>

          {preview.features?.length ? (
            <View className="preview-features">
              {preview.features.slice(0, 6).map((feature, index) => (
                <View key={`${feature}-${index}`} className="feature-tag"><Text>{feature}</Text></View>
              ))}
            </View>
          ) : null}

          <View className="preview-actions">
            <View className="btn-detail" onClick={handleOpenDetail}><Text>详情</Text></View>
            <View className="btn-fav" onClick={handleFavorite}>
              <Text>{favorites.has(preview.id) ? '❤️' : '🤍'}</Text>
            </View>
            <View
              className={`btn-checkin ${checkedInId === preview.id ? 'done' : ''}`}
              onClick={handleCheckin}
            >
              <Text>{checkedInId === preview.id ? '✅已签到' : checkingIn ? '...' : '🏓签到'}</Text>
            </View>
            <View className="btn-navigate" onClick={handleNavigate}><Text>🧭导航</Text></View>
          </View>
        </View>
      ) : null}
    </View>
  );
}
