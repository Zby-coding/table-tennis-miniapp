import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Map as TaroMap, Input, ScrollView, Text, Image } from '@tarojs/components';
import Taro, { useReady } from '@tarojs/taro';
import { Court } from '@/types';
import CourtNameText from '@/components/CourtNameText';
import { getNearbyCourts, checkin as apiCheckin, toggleFavorite, getFavorites } from '@/services/api';
import {
  DEFAULT_LOCATION,
  isValidCoord,
  getUserLocation,
  ensureLocationPermission,
  openCourtNavigation,
} from '@/utils/location';
import './index.scss';

const withReviews = (court: Omit<Court, 'reviews'>): Court => ({ ...court, reviews: [] });

const FALLBACK_COURTS: Court[] = [
  withReviews({ id: 1, name: '白河湿地公园乒乓球区', address: '河南省南阳市卧龙区白河大道白河湿地公园', isFree: true, isIndoor: false, activePlayers: 15, distanceStr: '0.8km', tableCount: 10, material: '户外地砖', hasLighting: false, openHours: '全天', photo: '', galleryImages: [], lat: 32.9864, lng: 112.5349, rating: 4.5, features: ['免费开放', '河边风景', '空气好', '本市最热门'], coordVerified: true }),
  withReviews({ id: 2, name: '南阳市体育中心乒乓球场', address: '河南省南阳市宛城区滨河东路与鼎盛路交叉口东205米路北南阳体育中心', isFree: true, isIndoor: false, activePlayers: 8, distanceStr: '1.5km', tableCount: 6, material: '塑胶', hasLighting: true, openHours: '06:00-21:00', photo: '', galleryImages: [], lat: 32.990969, lng: 112.575669, rating: 4.3, features: ['免费开放', '塑胶地面', '夜间灯光'], coordVerified: true }),
  withReviews({ id: 3, name: '南阳理工学院乒乓球区', address: '河南省南阳市宛城区长江路80号南阳理工学院', isFree: true, isIndoor: false, activePlayers: 12, distanceStr: '2.1km', tableCount: 8, material: '水泥防滑', hasLighting: false, openHours: '06:00-20:00', photo: '', galleryImages: [], lat: 32.9788, lng: 112.5412, rating: 4.0, features: ['校园场地', '免费开放', '学生多'], coordVerified: true }),
  withReviews({ id: 4, name: '解放广场乒乓球角', address: '河南省南阳市卧龙区中州中路解放广场', isFree: true, isIndoor: false, activePlayers: 6, distanceStr: '3.0km', tableCount: 4, material: '水泥', hasLighting: false, openHours: '06:00-20:00', photo: '', galleryImages: [], lat: 32.9951, lng: 112.5219, rating: 3.8, features: ['市中心', '免费开放', '便民设施'], coordVerified: true }),
  withReviews({ id: 5, name: '汉冶路社区活动中心', address: '河南省南阳市宛城区汉冶路汉冶路社区活动中心', isFree: true, isIndoor: true, activePlayers: 3, distanceStr: '4.2km', tableCount: 2, material: '塑胶', hasLighting: true, openHours: '08:00-21:00', photo: '', galleryImages: [], lat: 33.0012, lng: 112.5498, rating: 3.5, features: ['室内', '社区免费', '灯光好'], coordVerified: true }),
  withReviews({ id: 6, name: '仲景养生小镇乒乓球区', address: '河南省南阳市卧龙区仲景路仲景养生小镇', isFree: false, isIndoor: true, activePlayers: 4, distanceStr: '5.1km', tableCount: 3, material: '专业运动地板', hasLighting: true, openHours: '09:00-22:00', photo: '', galleryImages: [], lat: 32.9715, lng: 112.5103, rating: 4.2, features: ['付费15元/时', '室内空调', '专业级'], coordVerified: true }),
  withReviews({ id: 7, name: '南阳师范学院乒乓球场', address: '河南省南阳市卧龙区卧龙路1638号南阳师范学院', isFree: true, isIndoor: false, activePlayers: 20, distanceStr: '3.8km', tableCount: 12, material: '塑胶', hasLighting: true, openHours: '06:00-22:00', photo: '', galleryImages: [], lat: 32.9756, lng: 112.5034, rating: 4.7, features: ['免费开放', '球台多', '高手聚集'], coordVerified: true }),
  withReviews({ id: 8, name: '独山大道体育公园', address: '河南省南阳市宛城区独山大道体育公园', isFree: true, isIndoor: false, activePlayers: 10, distanceStr: '2.5km', tableCount: 6, material: '户外硅PU', hasLighting: false, openHours: '06:00-19:00', photo: '', galleryImages: [], lat: 33.0089, lng: 112.5523, rating: 4.1, features: ['免费开放', '公园环境', '停车方便'], coordVerified: true }),
  withReviews({ id: 9, name: '二技校对面河边乒乓球区', address: '河南省南阳市卧龙区滨河中路256号南阳市第二技工学校对面白河沿岸', isFree: true, isIndoor: false, activePlayers: 0, distanceStr: '1.2km', tableCount: 2, material: '户外水泥', hasLighting: false, openHours: '全天', photo: '', galleryImages: [], lat: 32.9945, lng: 112.5278, rating: 3.8, features: ['免费开放', '河边公共空间', '坐标已核实'], coordVerified: true }),
  withReviews({ id: 10, name: '罗洼公园乒乓球区', address: '河南省南阳市宛城区张衡大道与新野路交叉口东南角罗洼体育公园北侧专业运动区', isFree: true, isIndoor: false, activePlayers: 0, distanceStr: '2.8km', tableCount: 2, material: '户外水泥', hasLighting: false, openHours: '全天', photo: '', galleryImages: [], lat: 32.9875, lng: 112.5718, rating: 3.8, features: ['免费开放', '公园公共设施', '坐标已核实'], coordVerified: true }),
  withReviews({ id: 900001, name: '卓悦乒搏俱乐部', address: '河南省南阳市卧龙区张衡街道两相东路实验学校西666米瑞金福邸西头三楼', isFree: false, isIndoor: true, activePlayers: 0, distanceStr: '3.5km', tableCount: 8, material: '专业运动地胶', hasLighting: true, openHours: '09:00-22:00', photo: '', galleryImages: [], lat: 32.9986, lng: 112.5142, rating: 4.6, features: ['乒乓球培训', '室内球台', '坐标已核实'], venueType: 'training', coordVerified: true }),
  withReviews({ id: 900002, name: '挥扬乒乓球运动俱乐部', address: '河南省南阳市宛城区汉冶街道金苑福润花园8号楼商业区2楼北1号', isFree: false, isIndoor: true, activePlayers: 0, distanceStr: '2.1km', tableCount: 6, material: '室内运动地胶', hasLighting: true, openHours: '09:00-21:30', photo: '', galleryImages: [], lat: 33.0042, lng: 112.5488, rating: 4.5, features: ['乒乓球培训', '少儿培训', '坐标已核实'], venueType: 'training', coordVerified: true }),
  withReviews({ id: 900009, name: '南阳市青少年体育运动训练中心', address: '河南省南阳市宛城区滨河东路与鼎盛路交叉口东205米路北第一体育健身中心游泳馆三楼', isFree: false, isIndoor: true, activePlayers: 0, distanceStr: '2.0km', tableCount: 50, material: '专业运动地板', hasLighting: true, openHours: '09:00-17:00', photo: '', galleryImages: [], lat: 32.990969, lng: 112.575669, rating: 4.8, features: ['市级体校', '专业训练', '坐标已核实'], venueType: 'training', coordVerified: true }),
  withReviews({ id: 900010, name: '爱尚乒乓', address: '河南省南阳市示范区商苑社区经十路与长江路口向东五十米路南兴华花园2楼西侧商业', isFree: false, isIndoor: true, activePlayers: 0, distanceStr: '2.4km', tableCount: 6, material: '室内运动地胶', hasLighting: true, openHours: '09:00-21:00', photo: '', galleryImages: [], lat: 32.9786, lng: 112.5548, rating: 4.0, features: ['乒乓球培训', '坐标已核实'], venueType: 'training', coordVerified: true }),
];

const FILTERS = ['全部', '免费', '室内', '有灯光'] as const;
const FILTER_TONES: Record<typeof FILTERS[number], string> = { 全部: 'all', 免费: 'free', 室内: 'indoor', 有灯光: 'lighting' };
const INITIAL_MAP_SCALE = 14;
const isH5 = process.env.TARO_ENV === 'h5';

const toBool = (value: unknown) => value === true || value === 1 || value === '1' || value === 'true';

const getCourtThumb = (court: Court): string => {
  const live = court.livePhotos?.[0];
  if (live) return live;
  if (court.galleryImages?.[0]) return court.galleryImages[0];
  if (court.facilityPhotos?.[0]) return court.facilityPhotos[0];
  return court.photo || '';
};

const normalizeCourt = (court: any): Court => ({
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
  photo: court.photo || '',
  galleryImages: court.galleryImages || [],
  livePhotos: court.livePhotos || [],
  photoSource: court.photoSource,
  description: court.description || '',
  facilityPhotos: court.facilityPhotos || [],
  enrichmentMeta: court.enrichmentMeta || null,
  features: court.features || [],
  reviews: court.reviews || [],
  venueType: court.venueType,
  coordVerified: court.coordVerified === true || court.features?.includes('坐标已核实'),
});

const filterFallbackCourts = (filter: string, query: string) => {
  let filtered = [...FALLBACK_COURTS];
  if (filter === '免费') filtered = filtered.filter((court) => court.isFree);
  if (filter === '室内') filtered = filtered.filter((court) => court.isIndoor);
  if (filter === '有灯光') filtered = filtered.filter((court) => court.hasLighting);
  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter((court) => court.name.toLowerCase().includes(q) || court.address.toLowerCase().includes(q));
  }
  return filtered;
};

const getMarkerIconPath = (court: Court) => {
  if (!court.isFree) return '../../assets/markers/marker-paid.png';
  if (court.isIndoor) return '../../assets/markers/marker-indoor.png';
  if (court.hasLighting) return '../../assets/markers/marker-hot.png';
  return '../../assets/markers/marker-free.png';
};

const pickInitialCenter = (courts: Court[]) => {
  const localCourts = courts
    .filter((court) => isValidCoord(court.lat, court.lng))
    .filter((court) => Math.abs(Number(court.lat) - DEFAULT_LOCATION.lat) < 0.25 && Math.abs(Number(court.lng) - DEFAULT_LOCATION.lng) < 0.35);
  const points = localCourts.length > 0 ? localCourts : courts.filter((court) => isValidCoord(court.lat, court.lng));
  if (points.length === 0) return DEFAULT_LOCATION;

  const center = points.reduce((sum, court) => ({
    lat: sum.lat + Number(court.lat) / points.length,
    lng: sum.lng + Number(court.lng) / points.length,
  }), { lat: 0, lng: 0 });

  return isValidCoord(center.lat, center.lng) ? center : DEFAULT_LOCATION;
};

export default function IndexPage() {
  const [courts, setCourts] = useState<Court[]>(FALLBACK_COURTS);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>(DEFAULT_LOCATION);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('全部');
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkedInId, setCheckedInId] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [mapCenter, setMapCenter] = useState(DEFAULT_LOCATION);

  const markerTapFlagRef = useRef(false);
  const loadedRef = useRef(false);
  const mapId = 'home-tennis-map';

  const moveMapToUser = useCallback((loc: { lat: number; lng: number }) => {
    if (isH5 || !isValidCoord(loc.lat, loc.lng)) return;
    try {
      Taro.createMapContext(mapId).moveToLocation();
    } catch {
      // ignore map context errors on unsupported runtimes
    }
  }, []);

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

  const loadCourts = useCallback(async (loc?: { lat: number; lng: number }, filterName?: string, queryStr?: string) => {
    const filter = filterName ?? activeFilter;
    const query = queryStr ?? searchQuery;
    setLoading(true);

    try {
      const location = loc || userLocation || (await resolveUserLocation()).location;
      const params: { isFree?: boolean; isIndoor?: boolean; hasLighting?: boolean; keyword?: string } = {};
      if (filter === '免费') params.isFree = true;
      if (filter === '室内') params.isIndoor = true;
      if (filter === '有灯光') params.hasLighting = true;
      if (query) params.keyword = query;

      const res = await getNearbyCourts(location.lat, location.lng, Object.keys(params).length ? params : undefined);
      if (res.code === 0 && Array.isArray(res.data)) {
        const valid = res.data.filter((court: any) => isValidCoord(court.lat, court.lng)).map(normalizeCourt);
        if (valid.length > 0) {
          setCourts(valid);
          return;
        }
      }

      setCourts(filterFallbackCourts(filter, query));
    } catch (error) {
      console.warn('[Courts] load failed, use fallback data:', error);
      setCourts(filterFallbackCourts(filter, query));
    } finally {
      setLoading(false);
    }
  }, [activeFilter, resolveUserLocation, searchQuery, userLocation]);

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
            if (res.code === 0) setFavorites(new Set((res.data || []).map((court: any) => Number(court.id))));
          })
          .catch((error) => console.warn('[Favorites] Load failed:', error));
      }

      resolveUserLocation()
        .then((result) => {
          setMapCenter(result.location);
          if (result.fromGps) moveMapToUser(result.location);
          return loadCourts(result.location);
        })
        .catch((error) => console.error('[Courts] Failed:', error));
    }, 200);
  });

  const markers = useMemo(() => courts
    .filter((court) => Number.isFinite(Number(court.id)) && isValidCoord(court.lat, court.lng))
    .map((court) => ({
      id: Number(court.id),
      latitude: Number(court.lat),
      longitude: Number(court.lng),
      title: court.name,
      iconPath: getMarkerIconPath(court),
      width: 26,
      height: 26,

      anchor: { x: 0.5, y: 0.9 },
    })), [courts]);

  const handleMarkerTap = useCallback((event: any) => {
    const markerId = Number(event?.detail?.markerId);
    const court = courts.find((item) => Number(item.id) === markerId);
    if (!court) {
      Taro.showToast({ title: '未找到场地', icon: 'none' });
      return;
    }

    markerTapFlagRef.current = true;
    setSelectedCourt(court);
    setShowPreview(true);
  }, [courts]);

  const handleMapTap = useCallback(() => {
    if (markerTapFlagRef.current) {
      markerTapFlagRef.current = false;
      return;
    }
    setShowPreview(false);
  }, []);

  const handleNavigate = useCallback((court: Court) => {
    openCourtNavigation(court, { mapId });
  }, [mapId]);

  const handleClosePreview = useCallback(() => {
    setShowPreview(false);
  }, []);

  const handleCheckin = useCallback(async () => {
    if (!selectedCourt || checkingIn) return;
    setCheckingIn(true);
    try {
      const { location: loc, denied } = await resolveUserLocation(true);
      if (denied) {
        Taro.showToast({ title: '需要位置权限才能签到', icon: 'none' });
        return;
      }
      const res = await apiCheckin(selectedCourt.id, loc.lat, loc.lng);
      if (res.code === 0) {
        setCheckedInId(selectedCourt.id);
        Taro.showToast({ title: '签到成功!', icon: 'success' });
      } else {
        Taro.showToast({ title: res.message || '签到失败', icon: 'none' });
      }
    } catch {
      Taro.showToast({ title: '签到(本地)', icon: 'success' });
    } finally {
      setCheckingIn(false);
    }
  }, [checkingIn, resolveUserLocation, selectedCourt]);

  const handleFavorite = useCallback(async () => {
    if (!selectedCourt) return;
    try {
      const res = await toggleFavorite(selectedCourt.id);
      setFavorites((prev) => {
        const next = new Set(prev);
        res.data?.favorite ? next.add(selectedCourt.id) : next.delete(selectedCourt.id);
        return next;
      });
      Taro.showToast({ title: res.data?.favorite ? '已收藏' : '已取消', icon: 'success' });
    } catch {}
  }, [selectedCourt]);

  const handleFilterTap = useCallback((filter: string) => {
    const nextFilter = filter === '全部' ? '全部' : filter;
    setActiveFilter(nextFilter);
    setShowPreview(false);
    loadCourts(undefined, nextFilter, searchQuery);
  }, [loadCourts, searchQuery]);

  return (
    <View className="index-page">
      {isH5 ? (
        <View className="h5-map-fallback">
          <View className="h5-map-grid" />
          <View className="h5-map-label"><Text>H5 场地预览</Text></View>
          {markers.slice(0, 12).map((marker, index) => (
            <View key={marker.id} className="h5-map-marker" style={{ left: `${18 + (index * 17) % 64}%`, top: `${26 + (index * 23) % 50}%` }} onClick={() => handleMarkerTap({ detail: { markerId: marker.id } })}>
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

      <View className="search-bar">
        <View className="search-box">
          <Text className="icon-search">🔍</Text>
          <Input className="search-input" type="text" placeholder="搜索场地" value={searchQuery} onInput={(event) => setSearchQuery(event.detail.value)} onConfirm={() => loadCourts(undefined, undefined, searchQuery)} confirmType="search" />
          {loading && <Text className="search-loading">加载中</Text>}
        </View>
      </View>

      <ScrollView className="filter-row" scrollX enableFlex>
        {FILTERS.map((chip) => {
          const isActive = chip === activeFilter;
          return (
            <View key={chip} className={`filter-chip filter-${FILTER_TONES[chip]}${isActive ? ' active' : ''}`} onClick={() => handleFilterTap(chip)}>
              <Text className="filter-chip-text">{chip}</Text>
            </View>
          );
        })}
      </ScrollView>

      {showPreview && selectedCourt && (
        <View className="court-preview">
          <View className="preview-close" onClick={handleClosePreview}><Text>✕</Text></View>
          <View className="preview-header">
            <CourtNameText name={selectedCourt.name} variant="preview" />
            <View className="preview-sub-row">
              {getCourtThumb(selectedCourt) ? (
                <Image className="preview-thumb" src={getCourtThumb(selectedCourt)} mode="aspectFill" />
              ) : null}
              <View className="preview-badges">
                {selectedCourt.isFree ? <View className="badge badge-free"><Text>免费</Text></View> : <View className="badge badge-paid"><Text>付费</Text></View>}
                {selectedCourt.venueType === 'training' ? <View className="badge badge-training"><Text>培训馆</Text></View> : null}
                {selectedCourt.coordVerified ? <View className="badge badge-verified"><Text>坐标已核实</Text></View> : null}
                <View className="badge badge-rating"><Text>⭐{selectedCourt.rating}</Text></View>
                <View className="badge badge-active"><Text>🏓{selectedCourt.activePlayers || 0}人</Text></View>
              </View>
            </View>
          </View>
          <Text className="preview-address">{selectedCourt.address}</Text>
          <View className="preview-meta">
            <View className="meta-item"><Text className="meta-label">距离</Text><Text className="meta-value">{selectedCourt.distanceStr}</Text></View>
            <View className="meta-item"><Text className="meta-label">球台</Text><Text className="meta-value">{selectedCourt.tableCount}张</Text></View>
            <View className="meta-item"><Text className="meta-label">材质</Text><Text className="meta-value">{selectedCourt.material}</Text></View>
            <View className="meta-item"><Text className="meta-label">灯光</Text><Text className="meta-value">{selectedCourt.hasLighting ? '有' : '无'}</Text></View>
            <View className="meta-item"><Text className="meta-label">场地</Text><Text className="meta-value">{selectedCourt.isIndoor ? '室内' : '户外'}</Text></View>
          </View>
          <View className="preview-features">
            {selectedCourt.features?.map((feature, index) => <View key={index} className="feature-tag"><Text>{feature}</Text></View>)}
          </View>
          <View className="preview-actions">
            <View className="btn-detail" onClick={() => Taro.navigateTo({ url: `/pages/court-detail/index?id=${selectedCourt.id}` })}><Text>详情</Text></View>
            <View className="btn-fav" onClick={handleFavorite}><Text>{favorites.has(selectedCourt.id) ? '❤️' : '🤍'}</Text></View>
            <View className={`btn-checkin ${checkedInId === selectedCourt.id ? 'done' : ''}`} onClick={handleCheckin}><Text>{checkedInId === selectedCourt.id ? '✅已签到' : checkingIn ? '...' : '🏓签到'}</Text></View>
            <View className="btn-navigate" onClick={() => handleNavigate(selectedCourt)}><Text>🧭导航</Text></View>
          </View>
        </View>
      )}
    </View>
  );
}