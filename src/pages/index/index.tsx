import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Map, Input, ScrollView, Text } from '@tarojs/components';
import Taro, { useReady } from '@tarojs/taro';
import { Court } from '@/types';
import { getNearbyCourts, checkin as apiCheckin, toggleFavorite, getFavorites } from '@/services/api';
import './index.scss';

// 默认场地 — 后端不可用时的 fallback (与seed数据保持一致确保id匹配)
const FALLBACK_COURTS: Court[] = [
  { id: 1, name: '白河湿地公园乒乓球区', address: '南阳市卧龙区白河大道', isFree: true, activePlayers: 15, distanceStr: '0.8km', tableCount: 10, material: '户外地砖', hasLighting: false, openHours: '全天', photo: '', galleryImages: [], lat: 32.9864, lng: 112.5349, rating: 4.5, features: ['免费开放','河边风景','空气好','本市最热门'] },
  { id: 2, name: '南阳市体育中心乒乓球场', address: '南阳市卧龙区滨河路', isFree: true, activePlayers: 8, distanceStr: '1.5km', tableCount: 6, material: '塑胶', hasLighting: true, openHours: '06:00-21:00', photo: '', galleryImages: [], lat: 32.9906, lng: 112.5284, rating: 4.3, features: ['免费开放','塑胶地面','夜间灯光'] },
  { id: 3, name: '南阳理工学院乒乓球区', address: '南阳市宛城区长江路80号', isFree: true, activePlayers: 12, distanceStr: '2.1km', tableCount: 8, material: '水泥防滑', hasLighting: false, openHours: '06:00-20:00', photo: '', galleryImages: [], lat: 32.9788, lng: 112.5412, rating: 4.0, features: ['校园场地','免费开放','学生多'] },
  { id: 4, name: '解放广场乒乓球角', address: '南阳市卧龙区中州路', isFree: true, activePlayers: 6, distanceStr: '3.0km', tableCount: 4, material: '水泥', hasLighting: false, openHours: '06:00-20:00', photo: '', galleryImages: [], lat: 32.9951, lng: 112.5219, rating: 3.8, features: ['市中心','免费开放','便民设施'] },
  { id: 5, name: '汉冶路社区活动中心', address: '南阳市宛城区汉冶路', isFree: true, activePlayers: 3, distanceStr: '4.2km', tableCount: 2, material: '塑胶', hasLighting: true, openHours: '08:00-21:00', photo: '', galleryImages: [], lat: 33.0012, lng: 112.5498, rating: 3.5, features: ['室内','社区免费','灯光好'] },
  { id: 6, name: '仲景养生小镇乒乓球区', address: '南阳市卧龙区仲景路', isFree: false, activePlayers: 4, distanceStr: '5.1km', tableCount: 3, material: '专业运动地板', hasLighting: true, openHours: '09:00-22:00', photo: '', galleryImages: [], lat: 32.9715, lng: 112.5103, rating: 4.2, features: ['付费15元/时','室内空调','专业级'] },
  { id: 7, name: '南阳师范学院乒乓球场', address: '南阳市卧龙区卧龙路1638号', isFree: true, activePlayers: 20, distanceStr: '3.8km', tableCount: 12, material: '塑胶', hasLighting: true, openHours: '06:00-22:00', photo: '', galleryImages: [], lat: 32.9756, lng: 112.5034, rating: 4.7, features: ['免费开放','球台多','高手聚集'] },
  { id: 8, name: '独山大道体育公园', address: '南阳市宛城区独山大道', isFree: true, activePlayers: 10, distanceStr: '2.5km', tableCount: 6, material: '户外硅PU', hasLighting: false, openHours: '06:00-19:00', photo: '', galleryImages: [], lat: 33.0089, lng: 112.5523, rating: 4.1, features: ['免费开放','公园环境','停车方便'] },
];

const FILTERS = ['全部','免费','室内','有灯光'] as const;

export default function IndexPage() {
  const [courts, setCourts] = useState<Court[]>(FALLBACK_COURTS);
  const [userLocation, setUserLocation] = useState<{lat:number;lng:number}>({lat:32.9864,lng:112.5349});
  const [selectedCourt, setSelectedCourt] = useState<Court|null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('全部');
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false); // 改为 false, 避免覆盖层阻挡
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkedInId, setCheckedInId] = useState<number|null>(null);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());

  const mapCtx = useRef<any>(null);
  const mapId = 'home-tennis-map';

  const getLocation = useCallback(async () => {
    try {
      const res = await Taro.getLocation({type:'gcj02'});
      const loc = {lat:res.latitude,lng:res.longitude};
      setUserLocation(loc); return loc;
    } catch {
      const fb = {lat:32.9864,lng:112.5349};
      setUserLocation(fb); return fb;
    }
  },[]);

  // ── 从后端加载场地数据 (仅 useDidShow 时调用一次, 不在 handleMarkerTap 中调用) ──
  const loadCourts = useCallback(async (loc?: {lat:number;lng:number}, filterName?: string, queryStr?: string) => {
    const filter = filterName ?? activeFilter;
    const query = queryStr ?? searchQuery;
    setLoading(true);
    try {
      const location = loc || userLocation || (await getLocation());
      const f:any = {};
      if(filter === '免费') f.isFree = true;
      else if(filter === '室内') f.isIndoor = true;
      else if(filter === '有灯光') f.hasLighting = true;
      if(query) f.keyword = query;

      const res = await getNearbyCourts(location.lat, location.lng, Object.keys(f).length ? f : undefined);
      if(res.code === 0 && res.data?.length > 0) {
        // 只保留有效坐标的场地 (lat/lng 在中国范围内)
        const valid = res.data.filter((c:any) =>
          c.lat && c.lng && Number(c.lat) > 10 && Number(c.lat) < 60 &&
          Number(c.lng) > 50 && Number(c.lng) < 180
        );
        if (valid.length > 0) { setCourts(valid); return; }
      }
      // API 失败或无数据: fallback
      console.log('API 不可用,使用本地数据');
      // 前端本地过滤 fallback
      let filtered = [...FALLBACK_COURTS];
      if(filter === '免费') filtered = filtered.filter(c => c.isFree);
      else if(filter === '室内') filtered = filtered.filter(c => !c.isFree && c.hasLighting);
      else if(filter === '有灯光') filtered = filtered.filter(c => c.hasLighting);
      if(query) { const q = query.toLowerCase(); filtered = filtered.filter(c => c.name.toLowerCase().includes(q)); }
      setCourts(filtered);
    } catch {
      setCourts(FALLBACK_COURTS);
    } finally { setLoading(false); }
  }, [activeFilter, searchQuery, userLocation, getLocation]);

  // ── 初始加载: 只在首次 mount 时调用, 不重复触发 ──
  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    // 自动登录 (放在首页, 而不是 app.tsx, 避免阻塞页面渲染)
    import('@/services/api').then(({ login, setToken, getToken }) => {
      const t = getToken();
      if (!t) {
        login('miniapp_auto', '球友').then(r => {
          if (r.code === 0 && r.data?.token) setToken(r.data.token);
        }).catch(() => {});
      }
    });
    getLocation().then(loc => { if(loc) loadCourts(loc); else loadCourts(); });
    getFavorites().then(r => { if(r.code===0) setFavorites(new Set((r.data||[]).map((c:any)=>Number(c.id)))); }).catch(()=>{});
  }, []);

  useReady(() => { mapCtx.current = Taro.createMapContext(mapId); });

  // ── handleMarkerTap: 只设置 selectedCourt + showPreview, 不触发 setCourts ──
  const handleMarkerTap = useCallback((e:any) => {
    const markerId = e?.detail?.markerId;
    console.log('[markerTap] markerId:', markerId);
    let court = courts.find(c => Number(c.id) === Number(markerId));
    if(!court) court = courts.find(c => String(c.id) === String(markerId));
    if(!court) { Taro.showToast({title:'未找到场地',icon:'none'}); return; }
    setSelectedCourt(court);
    setShowPreview(true);
  }, [courts]);

  // ── onTap: 不做任何操作 (避免与 onMarkerTap 冲突) ──
  const handleMapTap = useCallback(() => {}, []);

  const handleNavigate = useCallback((court:Court) => {
    Taro.openLocation({latitude:court.lat,longitude:court.lng,name:court.name,address:court.address,scale:16})
      .catch(()=>Taro.showToast({title:'请授权位置权限',icon:'none'}));
  }, []);

  const handleCheckin = useCallback(async() => {
    if(!selectedCourt || checkingIn) return;
    setCheckingIn(true);
    try {
      const loc = await getLocation();
      const res = await apiCheckin(selectedCourt.id, loc.lat, loc.lng);
      if(res.code === 0) { setCheckedInId(selectedCourt.id); Taro.showToast({title:'签到成功!',icon:'success'}); }
      else Taro.showToast({title:res.message||'签到失败',icon:'none'});
    } catch { Taro.showToast({title:'签到(本地)',icon:'success'}); }
    finally { setCheckingIn(false); }
  }, [selectedCourt, checkingIn, getLocation]);

  const handleFavorite = useCallback(async() => {
    if(!selectedCourt) return;
    try {
      const res = await toggleFavorite(selectedCourt.id);
      setFavorites(prev => { const n = new Set(prev); res.data?.favorite ? n.add(selectedCourt.id) : n.delete(selectedCourt.id); return n; });
      Taro.showToast({title:res.data?.favorite?'已收藏':'已取消',icon:'success'});
    } catch {}
  }, [selectedCourt]);

  // ── markers 来自 courts 状态 (后端API数据) ──
  const markers = courts.map(c => ({
    id: Number(c.id),
    latitude: c.lat,
    longitude: c.lng,
    title: c.name,
    iconPath: (() => {
      if (c.hasLighting) return '/assets/marker-hot.png';
      if (c.isFree) return '/assets/marker-free.png';
      return '/assets/marker-paid.png';
    })(),
    width: 32, height: 32,
    callout: {
      content: `${c.name}\n${c.isFree ? '免费' : '付费'} | ${c.activePlayers || 0}人打`,
      display: 'BYCLICK', textAlign: 'center',
      padding: 8, borderRadius: 8, bgColor: '#ffffff', fontSize: 12, color: '#1A1A2E',
    },
    anchor: { x: .5, y: .9 },
  }));

  return (
    <View className="index-page">
      <Map id={mapId} className="map-canvas"
        latitude={userLocation.lat} longitude={userLocation.lng} scale={13}
        markers={markers} showLocation showCompass showScale enableZoom enableScroll enableRotate={false}
        onMarkerTap={handleMarkerTap} onTap={handleMapTap} />

      <View className="search-bar"><View className="search-box">
        <Text className="icon-search">🔍</Text>
        <Input className="search-input" type="text" placeholder="搜索场地" value={searchQuery}
          onInput={e => setSearchQuery(e.detail.value)}
          onConfirm={() => { loadCourts(undefined, undefined, searchQuery); }} confirmType="search" />
      </View></View>

      <ScrollView className="filter-row" scrollX enableFlex>
        {FILTERS.map(chip => {
          const isActive = chip === activeFilter;
          return (
            <View key={chip} className={`filter-chip ${isActive?'active':''}`}
              onClick={() => {
                const nf = chip === '全部' ? '全部' : chip;
                setActiveFilter(nf);
                loadCourts(undefined, nf, undefined);
              }}>
              <Text className="filter-chip-text">{chip}</Text>
            </View>
          );
        })}
      </ScrollView>

      {loading && <View className="loading-indicator"><Text>加载中...</Text></View>}

      {showPreview && selectedCourt && (
        <View className="court-preview">
          <View className="preview-header">
            <Text className="preview-name">{selectedCourt.name}</Text>
            <View className="preview-badges">
              {selectedCourt.isFree && <View className="badge badge-free"><Text>免费</Text></View>}
              <View className="badge badge-rating"><Text>⭐{selectedCourt.rating}</Text></View>
              <View className="badge badge-active"><Text>🏓{selectedCourt.activePlayers || 0}人</Text></View>
            </View>
          </View>
          <Text className="preview-address">{selectedCourt.address}</Text>
          <View className="preview-meta">
            <View className="meta-item"><Text className="meta-label">距离</Text><Text className="meta-value">{selectedCourt.distanceStr}</Text></View>
            <View className="meta-item"><Text className="meta-label">球台</Text><Text className="meta-value">{selectedCourt.tableCount}张</Text></View>
            <View className="meta-item"><Text className="meta-label">材质</Text><Text className="meta-value">{selectedCourt.material}</Text></View>
            <View className="meta-item"><Text className="meta-label">灯光</Text><Text className="meta-value">{selectedCourt.hasLighting?'有':'无'}</Text></View>
          </View>
          <View className="preview-features">
            {selectedCourt.features?.map((f,i) => <View key={i} className="feature-tag"><Text>{f}</Text></View>)}
          </View>
          <View className="preview-actions">
            <View className="btn-detail" onClick={() => Taro.navigateTo({url:`/pages/court-detail/index?id=${selectedCourt.id}`})}><Text>详情</Text></View>
            <View className="btn-fav" onClick={handleFavorite}><Text>{favorites.has(selectedCourt.id)?'❤️':'🤍'}</Text></View>
            <View className={`btn-checkin ${checkedInId===selectedCourt.id?'done':''}`} onClick={handleCheckin}><Text>{checkedInId===selectedCourt.id?'✅已签到':checkingIn?'...':'🏓签到'}</Text></View>
            <View className="btn-navigate" onClick={() => handleNavigate(selectedCourt)}><Text>🧭导航</Text></View>
          </View>
        </View>
      )}
    </View>
  );
}
