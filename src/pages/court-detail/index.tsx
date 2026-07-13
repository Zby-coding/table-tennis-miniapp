/**
 * 场地详情页 — 对应 table-tennis-pro 的 CourtDetailsView
 */
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Map, Image, Swiper, SwiperItem } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { Court } from '@/types';
import CourtNameText from '@/components/CourtNameText';
import { getCourtDetail, checkin } from '@/services/api';
import { getUserLocation, ensureLocationPermission, openCourtNavigation } from '@/utils/location';
import './index.scss';

const uniqueUrls = (urls: string[]) => [...new Set(urls.filter(Boolean))];

const buildLivePhotos = (court: Court): string[] => {
  if (court.livePhotos?.length) return court.livePhotos.slice(0, 5);
  return uniqueUrls([
    ...(court.facilityPhotos || []),
    ...(court.galleryImages || []),
    ...(court.photo ? [court.photo] : []),
  ]).slice(0, 5);
};

export default function CourtDetailPage() {
  const [court, setCourt] = useState<Court | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [liveIndex, setLiveIndex] = useState(0);

  useLoad((options: any) => {
    if (options?.id) loadCourt(Number(options.id));
  });

  const loadCourt = async (id: number) => {
    try {
      const res = await getCourtDetail(id);
      if (res.code === 0) setCourt(res.data);
    } catch {}
  };

  const livePhotos = useMemo(() => (court ? buildLivePhotos(court) : []), [court]);

  const previewImages = (urls: string[], current: string) => {
    if (!urls.length) return;
    Taro.previewImage({ urls, current: current || urls[0] });
  };

  const handleCheckin = async () => {
    if (checkingIn || !court) return;
    setCheckingIn(true);
    try {
      let result = await getUserLocation();
      if (result.denied) {
        const permitted = await ensureLocationPermission();
        if (!permitted) {
          Taro.showToast({ title: '需要位置权限才能签到', icon: 'none' });
          return;
        }
        result = await getUserLocation();
      }
      const res = await checkin(court.id, result.location.lat, result.location.lng);
      if (res.code === 0) {
        setCheckedIn(true);
        Taro.showToast({ title: '🎉 签到成功！', icon: 'success' });
      } else {
        Taro.showToast({ title: res.message || '签到失败', icon: 'none' });
      }
    } catch {
      setCheckedIn(true);
      Taro.showToast({ title: '签到成功(本地)', icon: 'success' });
    } finally { setCheckingIn(false); }
  };

  const handleNavigate = () => {
    if (!court) return;
    openCourtNavigation(court, { mapId: 'court-nav-map' });
  };

  if (!court) return <View className="cd-loading"><Text>加载中...</Text></View>;

  const hasLivePhotos = livePhotos.length > 0;
  const showStockHint = court.photoSource === 'stock'
    || (court.enrichmentMeta?.confidence === 'low' && court.photoSource !== 'platform');

  return (
    <>
      <Map
        id="court-nav-map"
        latitude={Number(court.lat)}
        longitude={Number(court.lng)}
        style={{ width: 0, height: 0, position: 'fixed', left: -9999 }}
      />
      <ScrollView className="cd-page" scrollY>
        <View className="cd-live-section">
          <View className="cd-live-hd">
            <View className="cd-live-hd-left">
              <Text className="cd-live-title">场点实况</Text>
              {showStockHint && (
                <Text className="cd-live-stock-hint">示意素材，非实拍</Text>
              )}
            </View>
            {hasLivePhotos && (
              <Text className="cd-live-counter">{liveIndex + 1}/{livePhotos.length}</Text>
            )}
          </View>
          {hasLivePhotos ? (
            <Swiper
              className="cd-hero-swiper"
              indicatorDots
              indicatorColor="rgba(255,255,255,0.45)"
              indicatorActiveColor="#FF6B35"
              circular
              autoplay={livePhotos.length > 1}
              onChange={(e) => setLiveIndex(e.detail.current)}
            >
              {livePhotos.map((img, index) => (
                <SwiperItem key={index}>
                  <Image
                    className="cd-hero-image"
                    src={img}
                    mode="aspectFill"
                    onClick={() => previewImages(livePhotos, img)}
                  />
                </SwiperItem>
              ))}
            </Swiper>
          ) : (
            <View className="cd-hero-img">
              <Text className="cd-hero-icon">🏓</Text>
              <Text className="cd-hero-empty">暂无实拍，欢迎球友上传</Text>
            </View>
          )}
        </View>

        <View className="cd-hero-overlay">
          <CourtNameText name={court.name} variant="detail" />
          <View className="cd-hero-badges">
            <View className={`cd-hero-badge ${court.isFree ? 'free' : 'paid'}`}>
              <Text className="cd-badge-text">{court.isFree ? '免费' : '付费'}</Text>
            </View>
            {court.venueType === 'training' && (
              <View className="cd-hero-badge training"><Text className="cd-badge-text">培训馆</Text></View>
            )}
            {court.enrichmentMeta?.confidence === 'low' && (
              <View className="cd-hero-badge pending"><Text className="cd-badge-text">信息待核实</Text></View>
            )}
          </View>
        </View>

        <View className="cd-bento">
          {[
            { label: '球台', value: `${court.tableCount}张`, icon: '🏓' },
            { label: '材质', value: court.material, icon: '🧱' },
            { label: '灯光', value: court.hasLighting ? '有' : '无', icon: '💡' },
            { label: '时间', value: court.openHours, icon: '🕐' },
          ].map((b, i) => (
            <View key={i} className="cd-bento-item">
              <Text className="cd-bento-icon">{b.icon}</Text>
              <Text className="cd-bento-label">{b.label}</Text>
              <Text className="cd-bento-val">{b.value}</Text>
            </View>
          ))}
        </View>

        <View className="cd-section">
          <View className="cd-section-hd">
            <Text className="cd-section-title">场地概况</Text>
            {court.enrichmentMeta?.confidence === 'low' && (
              <Text className="cd-section-sub">信息待核实</Text>
            )}
          </View>
          <Text className="cd-description">
            {court.description || '暂无网络资料，欢迎球友上传实拍补充场地信息。'}
          </Text>
        </View>

        <View className="cd-section">
          <View className="cd-section-hd">
            <Text className="cd-section-title">实时活跃</Text>
            <Text className="cd-section-sub">🏓 {court.activePlayers}人正在打球</Text>
          </View>
        </View>

        <View className="cd-section">
          <View className="cd-section-hd"><Text className="cd-section-title">设施特色</Text></View>
          <View className="cd-tags">
            {court.features?.map((f, i) => (
              <View key={i} className="cd-tag"><Text className="cd-tag-text">{f}</Text></View>
            ))}
          </View>
        </View>

        <View className="cd-section">
          <View className="cd-section-hd"><Text className="cd-section-title">地址</Text></View>
          <Text className="cd-address">{court.address}</Text>
          <View className="cd-distance"><Text>距离 {court.distanceStr || '—'} | 评分 ⭐{court.rating}</Text></View>
          {court.enrichmentMeta?.sources?.[0] && (
            <Text className="cd-source">数据来源：{court.enrichmentMeta.sources[0]}</Text>
          )}
        </View>

        <View className="cd-actions">
          <View className="cd-btn-nav" onClick={handleNavigate}>
            <Text className="cd-btn-text">🧭 一键导航</Text>
          </View>
          <View className={`cd-btn-checkin ${checkedIn ? 'done' : ''}`} onClick={handleCheckin}>
            <Text className="cd-btn-text">{checkedIn ? '✅ 已签到' : checkingIn ? '核验位置...' : '🏓 签到打卡'}</Text>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
