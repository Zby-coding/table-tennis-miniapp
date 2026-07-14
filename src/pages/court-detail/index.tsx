/**
 * 场地详情页 — 对应 table-tennis-pro 的 CourtDetailsView
 */
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, Map, Image, Swiper, SwiperItem } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { Court } from '@/types';
import CourtNameText from '@/components/CourtNameText';
import { getCourtDetail, checkin, toggleFavorite, getFavorites, uploadFile, submitCourtBackground, getBackgroundEligibility } from '@/services/api';
import {
  COURT_PREVIEW_KEY,
  formatTableCount,
  getSnapshotCourtById,
  mergeCourtMedia,
  normalizeCourt,
} from '@/data/courts-catalog';
import { getUserLocation, ensureLocationPermission, openCourtNavigation } from '@/utils/location';
import './index.scss';

const uniqueUrls = (urls: string[]) => [...new Set(urls.filter(Boolean))];

const readCourtPreview = (id: number): Court | null => {
  try {
    const cached = Taro.getStorageSync(COURT_PREVIEW_KEY(id));
    if (cached && typeof cached === 'object' && Number(cached.id) === id) {
      return normalizeCourt(cached);
    }
  } catch {
    // ignore
  }
  return null;
};

const resolveOfflineCourt = (id: number): Court | null =>
  readCourtPreview(id) || getSnapshotCourtById(id);

const buildLivePhotos = (court: Court): string[] => {
  if (court.livePhotos?.length) return court.livePhotos.slice(0, 3);
  return uniqueUrls([
    ...(court.facilityPhotos || []),
    ...(court.galleryImages || []),
    ...(court.photo ? [court.photo] : []),
  ]).slice(0, 5);
};

export default function CourtDetailPage() {
  const [courtId, setCourtId] = useState<number | null>(null);
  const [court, setCourt] = useState<Court | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [liveIndex, setLiveIndex] = useState(0);
  const [favorited, setFavorited] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);

  const loadCourt = useCallback(async (id: number, preferCache = true) => {
    setCourtId(id);
    setLoading(true);
    setError('');

    if (preferCache) {
      const offline = resolveOfflineCourt(id);
      if (offline) setCourt(offline);
    }

    try {
      const [res, favRes] = await Promise.all([
        getCourtDetail(id),
        getFavorites().catch(() => null),
      ]);
      if (favRes && favRes.code === 0) {
        setFavorited((favRes.data || []).some((c: any) => Number(c.id) === Number(id)));
      }
      if (res.code === 0 && res.data) {
        const remote = normalizeCourt(res.data);
        const local = resolveOfflineCourt(id);
        setCourt(mergeCourtMedia(remote, local));
        setError('');
        return;
      }

      const offline = resolveOfflineCourt(id);
      if (offline) {
        setCourt(offline);
        setError(res.message || '接口未返回完整数据，已展示本地数据');
      } else {
        setCourt(null);
        setError(res.message || '场地不存在');
      }
    } catch {
      const offline = resolveOfflineCourt(id);
      if (offline) {
        setCourt(offline);
        setError('网络异常，已展示本地数据');
      } else {
        setCourt(null);
        setError('加载失败，请检查网络后重试');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useLoad((options: any) => {
    if (options?.id) loadCourt(Number(options.id), true);
    else {
      setLoading(false);
      setError('缺少场地 ID');
    }
  });

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
        const unlocked = res.data?.newAchievements?.length
          ? `解锁 ${res.data.newAchievements.length} 枚勋章`
          : '签到成功！';
        Taro.showToast({ title: unlocked, icon: 'success' });
      } else {
        Taro.showToast({ title: res.message || '签到失败', icon: 'none' });
      }
    } catch (err: any) {
      Taro.showToast({ title: err?.message || '签到失败，请检查网络与位置', icon: 'none' });
    } finally { setCheckingIn(false); }
  };

  const handleFavorite = async () => {
    if (!court) return;
    try {
      const res = await toggleFavorite(court.id);
      if (res.code === 0) {
        setFavorited(!!res.data?.favorite);
        Taro.showToast({ title: res.data?.favorite ? '已收藏' : '已取消', icon: 'success' });
      } else {
        Taro.showToast({ title: res.message || '收藏失败', icon: 'none' });
      }
    } catch {
      Taro.showToast({ title: '收藏需连接服务器', icon: 'none' });
    }
  };

  const handleUploadBackground = async () => {
    if (!court || uploadingBg) return;
    try {
      const eligibility = await getBackgroundEligibility(court.id);
      if (eligibility.code !== 0 || !eligibility.data?.canContribute) {
        Taro.showToast({ title: eligibility.data?.reason || eligibility.message || '当前不可上传实拍', icon: 'none' });
        return;
      }
    } catch {
      Taro.showToast({ title: '无法确认上传资格', icon: 'none' });
      return;
    }
    try {
      const choose = await Taro.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'] });
      const filePath = choose.tempFilePaths?.[0];
      if (!filePath) return;
      setUploadingBg(true);
      const uploaded = await uploadFile(filePath);
      if (uploaded.code !== 0 || !uploaded.data?.url) {
        Taro.showToast({ title: uploaded.message || '上传失败', icon: 'none' });
        return;
      }
      const res = await submitCourtBackground(court.id, uploaded.data.url);
      if (res.code === 0) {
        Taro.showToast({ title: '已提交审核', icon: 'success' });
      } else {
        Taro.showToast({ title: res.message || '提交失败', icon: 'none' });
      }
    } catch (err: any) {
      Taro.showToast({ title: err?.errMsg || err?.message || '上传取消或失败', icon: 'none' });
    } finally {
      setUploadingBg(false);
    }
  };

  const handleNavigate = () => {
    if (!court) return;
    openCourtNavigation(court, { mapId: 'court-nav-map' });
  };

  const handleRetry = () => {
    if (courtId != null) loadCourt(courtId, false);
  };

  if (loading && !court) {
    return <View className="cd-loading"><Text>加载中...</Text></View>;
  }

  if (!court) {
    return (
      <View className="cd-loading cd-error">
        <Text className="cd-error-text">{error || '加载失败'}</Text>
        <View className="cd-retry-btn" onClick={handleRetry}>
          <Text className="cd-retry-text">重试</Text>
        </View>
      </View>
    );
  }

  const hasLivePhotos = livePhotos.length > 0;
  const showStockHint = court.showStockHint
    ?? (!hasLivePhotos || court.photoSource !== 'platform');
  const canContribute = court.canContribute ?? showStockHint;

  return (
    <>
      <Map
        id="court-nav-map"
        latitude={Number(court.lat)}
        longitude={Number(court.lng)}
        style={{ width: 0, height: 0, position: 'fixed', left: -9999 }}
      />
      <ScrollView className="cd-page" scrollY>
        {error ? (
          <View className="cd-banner-warn" onClick={handleRetry}>
            <Text className="cd-banner-text">{error}（点此重试）</Text>
          </View>
        ) : null}

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
            {canContribute ? (
              <Text className="cd-upload-entry" onClick={handleUploadBackground}>
                {uploadingBg ? '上传中…' : '上传实拍'}
              </Text>
            ) : null}
          </View>
          {hasLivePhotos ? (
            <Swiper
              className="cd-hero-swiper"
              indicatorDots
              indicatorColor="rgba(255,255,255,0.45)"
              indicatorActiveColor="#FF6B35"
              circular
              autoplay
              interval={3000}
              duration={500}
              onChange={(e) => setLiveIndex(e.detail.current)}
            >
              {livePhotos.map((img, index) => (
                <SwiperItem key={`${court.id}-live-${index}`}>
                  <Image
                    className="cd-hero-image"
                    src={img}
                    mode="aspectFill"
                    lazyLoad={false}
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
            { label: '球台', value: formatTableCount(court.tableCount), icon: '🏓' },
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
          <View className="cd-btn-fav" onClick={handleFavorite}>
            <Text className="cd-btn-text">{favorited ? '❤️ 已收藏' : '🤍 收藏'}</Text>
          </View>
          <View className="cd-btn-nav" onClick={handleNavigate}>
            <Text className="cd-btn-text">🧭 导航</Text>
          </View>
          <View className={`cd-btn-checkin ${checkedIn ? 'done' : ''}`} onClick={handleCheckin}>
            <Text className="cd-btn-text">{checkedIn ? '✅ 已签到' : checkingIn ? '核验位置...' : '🏓 签到'}</Text>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
