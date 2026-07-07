/**
 * 场地详情页 — 对应 table-tennis-pro 的 CourtDetailsView
 */
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { Court, CourtReview } from '@/types';
import { getCourtDetail, checkin, getCheckinStatus } from '@/services/api';
import './index.scss';

export default function CourtDetailPage() {
  const [court, setCourt] = useState<Court | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  useLoad((options: any) => {
    if (options?.id) loadCourt(Number(options.id));
  });

  const loadCourt = async (id: number) => {
    try {
      const res = await getCourtDetail(id);
      if (res.code === 0) setCourt(res.data);
    } catch {}
  };

  const handleCheckin = async () => {
    if (checkingIn || !court) return;
    setCheckingIn(true);
    try {
      const loc = await Taro.getLocation({ type: 'gcj02' });
      const res = await checkin(court.id, loc.latitude, loc.longitude);
      if (res.code === 0) {
        setCheckedIn(true);
        Taro.showToast({ title: '🎉 签到成功！', icon: 'success' });
      } else {
        Taro.showToast({ title: res.message || '签到失败', icon: 'none' });
      }
    } catch {
      setCheckedIn(true); // 本地 fallback
      Taro.showToast({ title: '签到成功(本地)', icon: 'success' });
    } finally { setCheckingIn(false); }
  };

  const handleNavigate = () => {
    if (!court) return;
    Taro.openLocation({ latitude: court.lat, longitude: court.lng, name: court.name, address: court.address, scale: 16 });
  };

  if (!court) return <View className="cd-loading"><Text>加载中...</Text></View>;

  return (
    <ScrollView className="cd-page" scrollY>
      {/* 图片区 */}
      <View className="cd-hero">
        <View className="cd-hero-img">
          <Text className="cd-hero-icon">🏓</Text>
        </View>
        <View className="cd-hero-overlay">
          <Text className="cd-hero-name">{court.name}</Text>
          <View className={`cd-hero-badge ${court.isFree ? 'free' : 'paid'}`}>
            <Text className="cd-badge-text">{court.isFree ? '免费' : '付费'}</Text>
          </View>
        </View>
      </View>

      {/* Bento 信息 */}
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

      {/* 活跃 */}
      <View className="cd-section">
        <View className="cd-section-hd">
          <Text className="cd-section-title">📊 实时活跃</Text>
          <Text className="cd-section-sub">🏓 {court.activePlayers}人正在打球</Text>
        </View>
      </View>

      {/* 特色 */}
      <View className="cd-section">
        <View className="cd-section-hd"><Text className="cd-section-title">✨ 设施特色</Text></View>
        <View className="cd-tags">
          {court.features?.map((f, i) => (
            <View key={i} className="cd-tag"><Text className="cd-tag-text">{f}</Text></View>
          ))}
        </View>
      </View>

      {/* 地址 */}
      <View className="cd-section">
        <View className="cd-section-hd"><Text className="cd-section-title">📍 地址</Text></View>
        <Text className="cd-address">{court.address}</Text>
        <View className="cd-distance"><Text>距离 {court.distanceStr} | 评分 ⭐{court.rating}</Text></View>
      </View>

      {/* 底部操作栏 */}
      <View className="cd-actions">
        <View className="cd-btn-nav" onClick={handleNavigate}>
          <Text className="cd-btn-text">🧭 一键导航</Text>
        </View>
        <View className={`cd-btn-checkin ${checkedIn ? 'done' : ''}`} onClick={handleCheckin}>
          <Text className="cd-btn-text">{checkedIn ? '✅ 已签到' : checkingIn ? '核验位置...' : '🏓 签到打卡'}</Text>
        </View>
      </View>
    </ScrollView>
  );
}
