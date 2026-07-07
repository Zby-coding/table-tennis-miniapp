import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Map, Input, ScrollView, Text } from '@tarojs/components';
import Taro, { useDidShow, useReady } from '@tarojs/taro';
import { Court } from '@/types';
import { getNearbyCourts } from '@/services/api';
import { INITIAL_COURTS } from '@/data';
import './index.scss';

// 默认场地 (API不可用时的fallback)
const DEFAULT_COURTS: Court[] = INITIAL_COURTS;

const FILTERS = ['全部', '免费', '室内', '有灯光'] as const;

export default function IndexPage() {
  const [courts, setCourts] = useState<Court[]>(DEFAULT_COURTS);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({
    lat: 39.9042, lng: 116.4074, // 北京天安门默认
  });
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('全部');
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);

  const mapCtx = useRef<Taro.MapContext | null>(null);
  const mapId = 'home-tennis-map';

  // 获取用户位置
  const getLocation = useCallback(async () => {
    try {
      const res = await Taro.getLocation({ type: 'gcj02' });
      const loc = { lat: res.latitude, lng: res.longitude };
      setUserLocation(loc);
      return loc;
    } catch (err) {
      console.warn('获取位置失败，使用北京默认', err);
      const fallback = { lat: 39.9042, lng: 116.4074 };
      setUserLocation(fallback);
      return fallback;
    }
  }, []);

  // 加载场地
  const loadCourts = useCallback(async () => {
    setLoading(true);
    try {
      const loc = userLocation || await getLocation();

      const filters: any = { isFree: activeFilter === '免费' ? true : undefined };
      if (activeFilter === '免费') filters.isFree = true;
      else if (activeFilter === '室内') filters.isIndoor = true;
      else if (activeFilter === '有灯光') filters.hasLighting = true;
      if (searchQuery) filters.keyword = searchQuery;

      const res = await getNearbyCourts(loc.lat, loc.lng, Object.keys(filters).length ? filters : undefined);
      if (res.code === 0 && res.data?.length > 0) {
        setCourts(res.data);
      }
    } catch (err) {
      console.log('API不可用，使用默认数据');
    } finally {
      setLoading(false);
    }
  }, [activeFilter, searchQuery, userLocation, getLocation]);

  // 页面显示时初始化
  useDidShow(() => {
    getLocation().then((loc) => {
      if (loc) {
        loadCourts();
      }
    });
  });

  useReady(() => {
    mapCtx.current = Taro.createMapContext(mapId);
  });

  // 搜索
  const handleSearch = useCallback(() => {
    loadCourts();
  }, [loadCourts]);

  // Marker 点击
  const handleMarkerTap = useCallback((e: any) => {
    const id = e.detail?.markerId;
    const court = courts.find(c => Number(c.id) === Number(id));
    if (court) { setSelectedCourt(court); setShowPreview(true); }
  }, [courts]);

  // 一键导航
  const handleNavigate = useCallback((court: Court) => {
    Taro.openLocation({
      latitude: court.lat, longitude: court.lng,
      name: court.name, address: court.address,
      scale: 16,
    }).catch(() => Taro.showToast({ title: '请确认已授权位置权限', icon: 'none' }));
  }, []);

  // 构造 markers
  const markers = courts.map(c => ({
    id: Number(c.id),
    latitude: c.lat,
    longitude: c.lng,
    title: c.name,
    iconPath: c.isFree ? '/assets/marker-free.png' : '/assets/marker-paid.png',
    width: 36, height: 36,
    callout: {
      content: `${c.name}\n${c.isFree ? '免费' : '付费'} | ${c.activePlayers || 0}人`,
      display: 'BYCLICK', textAlign: 'center',
      padding: 8, borderRadius: 8, bgColor: '#fff', fontSize: 12, color: '#1A1A2E',
    },
    anchor: { x: 0.5, y: 1 },
  }));

  return (
    <View className="index-page">
      <Map id={mapId} className="map-canvas"
        latitude={userLocation.lat}
        longitude={userLocation.lng}
        scale={14}
        markers={markers}
        showLocation showCompass showScale
        enableZoom enableScroll
        enableRotate={false}
        onMarkerTap={handleMarkerTap}
        onTap={() => setShowPreview(false)}
      />

      {/* 搜索栏 */}
      <View className="search-bar">
        <View className="search-box">
          <Text className="icon-search">🔍</Text>
          <Input className="search-input" type="text"
            placeholder="搜索场地"
            value={searchQuery}
            onInput={e => setSearchQuery(e.detail.value)}
            onConfirm={handleSearch} confirmType="search"
          />
        </View>
      </View>

      {/* 筛选条 */}
      <ScrollView className="filter-row" scrollX enableFlex>
        {FILTERS.map(chip => {
          const isActive = chip === activeFilter;
          return (
            <View key={chip} className={`filter-chip ${isActive ? 'active' : ''}`}
              onClick={() => { setActiveFilter(chip === '全部' ? '全部' : chip); loadCourts(); }}>
              <Text className="filter-chip-text">{chip}</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* 加载中 */}
      {loading && <View className="loading-indicator"><Text>加载中...</Text></View>}

      {/* 场地预览卡 */}
      {showPreview && selectedCourt && (
        <View className="court-preview">
          <View className="preview-header">
            <Text className="preview-name">{selectedCourt.name}</Text>
            <View className="preview-badges">
              {selectedCourt.isFree && <View className="badge badge-free"><Text>免费</Text></View>}
              <View className="badge badge-rating"><Text>⭐ {selectedCourt.rating}</Text></View>
              <View className="badge badge-active"><Text>🏓 {selectedCourt.activePlayers || 0}人</Text></View>
            </View>
          </View>
          <Text className="preview-address">{selectedCourt.address}</Text>

          <View className="preview-meta">
            <View className="meta-item"><Text className="meta-label">距离</Text><Text className="meta-value">{selectedCourt.distanceStr}</Text></View>
            <View className="meta-item"><Text className="meta-label">球台</Text><Text className="meta-value">{selectedCourt.tableCount}张</Text></View>
            <View className="meta-item"><Text className="meta-label">材质</Text><Text className="meta-value">{selectedCourt.material}</Text></View>
            <View className="meta-item"><Text className="meta-label">灯光</Text><Text className="meta-value">{selectedCourt.hasLighting ? '有' : '无'}</Text></View>
          </View>

          <View className="preview-actions">
            <View className="btn-detail"
              onClick={() => Taro.navigateTo({ url: `/pages/court-detail/index?id=${selectedCourt.id}` })}>
              <Text>查看详情</Text>
            </View>
            <View className="btn-navigate" onClick={() => handleNavigate(selectedCourt)}>
              <Text>🧭 一键导航</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
