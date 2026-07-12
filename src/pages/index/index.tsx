import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Map as TaroMap, Input, ScrollView, Text } from '@tarojs/components';
import Taro, { useReady } from '@tarojs/taro';
import { Court } from '@/types';
import { getNearbyCourts, checkin as apiCheckin, toggleFavorite, getFavorites } from '@/services/api';
import './index.scss';

const withReviews = (court: Omit<Court, 'reviews'>): Court => ({ ...court, reviews: [] });

const FALLBACK_COURTS: Court[] = [
  withReviews({ id: 1, name: '白河湿地公园乒乓球区', address: '南阳市卧龙区白河大道', isFree: true, isIndoor: false, activePlayers: 15, distanceStr: '0.8km', tableCount: 10, material: '户外地砖', hasLighting: false, openHours: '全天', photo: '', galleryImages: [], lat: 32.9864, lng: 112.5349, rating: 4.5, features: ['免费开放', '河边风景', '空气好', '本市最热门'] }),
  withReviews({ id: 2, name: '南阳市体育中心乒乓球场', address: '南阳市卧龙区滨河路', isFree: true, isIndoor: false, activePlayers: 8, distanceStr: '1.5km', tableCount: 6, material: '塑胶', hasLighting: true, openHours: '06:00-21:00', photo: '', galleryImages: [], lat: 32.9906, lng: 112.5284, rating: 4.3, features: ['免费开放', '塑胶地面', '夜间灯光'] }),
  withReviews({ id: 3, name: '南阳理工学院乒乓球区', address: '南阳市宛城区长江路80号', isFree: true, isIndoor: false, activePlayers: 12, distanceStr: '2.1km', tableCount: 8, material: '水泥防滑', hasLighting: false, openHours: '06:00-20:00', photo: '', galleryImages: [], lat: 32.9788, lng: 112.5412, rating: 4.0, features: ['校园场地', '免费开放', '学生多'] }),
  withReviews({ id: 4, name: '解放广场乒乓球角', address: '南阳市卧龙区中州路', isFree: true, isIndoor: false, activePlayers: 6, distanceStr: '3.0km', tableCount: 4, material: '水泥', hasLighting: false, openHours: '06:00-20:00', photo: '', galleryImages: [], lat: 32.9951, lng: 112.5219, rating: 3.8, features: ['市中心', '免费开放', '便民设施'] }),
  withReviews({ id: 5, name: '汉冶路社区活动中心', address: '南阳市宛城区汉冶路', isFree: true, isIndoor: true, activePlayers: 3, distanceStr: '4.2km', tableCount: 2, material: '塑胶', hasLighting: true, openHours: '08:00-21:00', photo: '', galleryImages: [], lat: 33.0012, lng: 112.5498, rating: 3.5, features: ['室内', '社区免费', '灯光好'] }),
  withReviews({ id: 6, name: '仲景养生小镇乒乓球区', address: '南阳市卧龙区仲景路', isFree: false, isIndoor: true, activePlayers: 4, distanceStr: '5.1km', tableCount: 3, material: '专业运动地板', hasLighting: true, openHours: '09:00-22:00', photo: '', galleryImages: [], lat: 32.9715, lng: 112.5103, rating: 4.2, features: ['付费15元/时', '室内空调', '专业级'] }),
  withReviews({ id: 7, name: '南阳师范学院乒乓球场', address: '南阳市卧龙区卧龙路1638号', isFree: true, isIndoor: false, activePlayers: 20, distanceStr: '3.8km', tableCount: 12, material: '塑胶', hasLighting: true, openHours: '06:00-22:00', photo: '', galleryImages: [], lat: 32.9756, lng: 112.5034, rating: 4.7, features: ['免费开放', '球台多', '高手聚集'] }),
  withReviews({ id: 8, name: '独山大道体育公园', address: '南阳市宛城区独山大道', isFree: true, isIndoor: false, activePlayers: 10, distanceStr: '2.5km', tableCount: 6, material: '户外硅PU', hasLighting: false, openHours: '06:00-19:00', photo: '', galleryImages: [], lat: 33.0089, lng: 112.5523, rating: 4.1, features: ['免费开放', '公园环境', '停车方便'] }),
  withReviews({ id: 9, name: '二技校对面河边附近', address: '南阳市第二技工学校对面白河沿岸（点位待现场核验）', isFree: true, isIndoor: false, activePlayers: 0, distanceStr: '待定位', tableCount: 2, material: '户外水泥', hasLighting: false, openHours: '全天', photo: '', galleryImages: [], lat: 32.9942, lng: 112.5318, rating: 3.8, features: ['免费开放', '河边公共空间', '位置待核验'] }),
  withReviews({ id: 10, name: '罗洼公园乒乓球区', address: '南阳市罗洼公园公共活动区（点位待现场核验）', isFree: true, isIndoor: false, activePlayers: 0, distanceStr: '待定位', tableCount: 2, material: '户外水泥', hasLighting: false, openHours: '全天', photo: '', galleryImages: [], lat: 32.9821, lng: 112.5667, rating: 3.8, features: ['免费开放', '公园公共设施', '位置待核验'] }),
  withReviews({ id: 900001, name: '卓悦乒搏俱乐部', address: '南阳市区付费乒乓球俱乐部', isFree: false, isIndoor: true, activePlayers: 0, distanceStr: '1.4km', tableCount: 8, material: '专业运动地胶', hasLighting: true, openHours: '09:00-22:00', photo: '', galleryImages: [], lat: 32.9902, lng: 112.5288, rating: 4.6, features: ['第三方付费场馆', '乒乓球俱乐部', '室内球台', '需确认价格'] }),
  withReviews({ id: 900008, name: '淘气猫梦幻岛（乒乓球区）', address: '南阳市淘气猫梦幻岛综合娱乐场所（具体门店与球台位置待核验）', isFree: false, isIndoor: true, activePlayers: 0, distanceStr: '待定位', tableCount: 2, material: '室内综合场地', hasLighting: true, openHours: '营业时间待核验', photo: '', galleryImages: [], lat: 32.9940, lng: 112.5310, rating: 4.0, features: ['综合娱乐场所', '疑似设有乒乓球区', '收费状态待核实', '坐标待核验'] }),
];

const FILTERS = ['全部', '免费', '室内', '有灯光'] as const;
const FILTER_TONES: Record<typeof FILTERS[number], string> = { 全部: 'all', 免费: 'free', 室内: 'indoor', 有灯光: 'lighting' };
const DEFAULT_LOCATION = { lat: 32.9864, lng: 112.5349 };
const INITIAL_MAP_SCALE = 14;
const isH5 = process.env.TARO_ENV === 'h5';

const isValidCoord = (lat: unknown, lng: unknown) => {
  const nLat = Number(lat);
  const nLng = Number(lng);
  return Number.isFinite(nLat) && Number.isFinite(nLng) && nLat > 10 && nLat < 60 && nLng > 50 && nLng < 180;
};

const toBool = (value: unknown) => value === true || value === 1 || value === '1' || value === 'true';

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
  features: court.features || [],
  reviews: court.reviews || [],
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
  if (!court.isFree) return '../../assets/marker-paid.png';
  if (court.isIndoor) return '../../assets/marker-indoor.png';
  if (court.hasLighting) return '../../assets/marker-hot.png';
  return '../../assets/marker-free.png';
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

  const markerTapFlagRef = useRef(false);
  const loadedRef = useRef(false);
  const mapCenterRef = useRef(DEFAULT_LOCATION);
  const mapId = 'home-tennis-map';

  const getLocation = useCallback(async () => {
    try {
      const setting = await Taro.getSetting();
      if (setting.authSetting?.['scope.userLocation'] === false) return DEFAULT_LOCATION;
      const res = await Taro.getLocation({ type: 'gcj02' });
      const loc = isValidCoord(res.latitude, res.longitude) ? { lat: Number(res.latitude), lng: Number(res.longitude) } : DEFAULT_LOCATION;
      setUserLocation(loc);
      return loc;
    } catch {
      setUserLocation(DEFAULT_LOCATION);
      return DEFAULT_LOCATION;
    }
  }, []);

  const loadCourts = useCallback(async (loc?: { lat: number; lng: number }, filterName?: string, queryStr?: string) => {
    const filter = filterName ?? activeFilter;
    const query = queryStr ?? searchQuery;
    setLoading(true);

    try {
      const location = loc || userLocation || (await getLocation());
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
  }, [activeFilter, getLocation, searchQuery, userLocation]);

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

      loadCourts(DEFAULT_LOCATION).catch((error) => console.error('[Courts] Failed:', error));
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

  const mapCenter = mapCenterRef.current;

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
    Taro.openLocation({ latitude: court.lat, longitude: court.lng, name: court.name, address: court.address, scale: 16 })
      .catch(() => Taro.showToast({ title: '请授权位置权限', icon: 'none' }));
  }, []);

  const handleCheckin = useCallback(async () => {
    if (!selectedCourt || checkingIn) return;
    setCheckingIn(true);
    try {
      const loc = await getLocation();
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
  }, [checkingIn, getLocation, selectedCourt]);

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
          <View className="preview-header">
            <Text className="preview-name">{selectedCourt.name}</Text>
            <View className="preview-badges">
              {selectedCourt.isFree ? <View className="badge badge-free"><Text>免费</Text></View> : <View className="badge badge-paid"><Text>付费</Text></View>}
              <View className="badge badge-rating"><Text>⭐{selectedCourt.rating}</Text></View>
              <View className="badge badge-active"><Text>🏓{selectedCourt.activePlayers || 0}人</Text></View>
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