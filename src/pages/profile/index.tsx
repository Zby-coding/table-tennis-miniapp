/**
 * 个人中心 — 对应 table-tennis-pro 的 MeProfileView
 */
import React, { useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { UserProfile } from '@/types';
import { getUserProfile, getAchievements } from '@/services/api';
import { INITIAL_USER_PROFILE } from '@/data';
import './index.scss';

const DEFAULT_PROFILE: UserProfile = INITIAL_USER_PROFILE;

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);

  useDidShow(() => {
    loadProfile();
  });

  const loadProfile = async () => {
    try {
      const [pRes, aRes] = await Promise.all([getUserProfile(), getAchievements()]);
      if (pRes.code === 0) {
        // 合并后端成就到 profile
        setProfile({ ...pRes.data, achievements: aRes.code === 0 ? aRes.data : pRes.data.achievements || [] });
      }
      if (aRes.code === 0 && pRes.code !== 0) {
        setProfile(prev => ({ ...prev, achievements: aRes.data }));
      }
    } catch { /* keep defaults */ }
  };

  return (
    <ScrollView className="profile-page" scrollY>
      {/* 资料卡 */}
      <View className="pf-card">
        <View className="pf-card-bg" />
        <View className="pf-avatar-wrap">
          <View className="pf-avatar">
            <Text className="pf-avatar-text">🏓</Text>
          </View>
        </View>
        <View className="pf-name-row">
          <Text className="pf-name">{profile.nickname}</Text>
          <View className="pf-level">
            <Text className="pf-level-text">{profile.levelBadge}</Text>
          </View>
        </View>
        <View className="pf-stats">
          <View className="pf-stat">
            <Text className="pf-stat-val">{profile.hoursPlayed}h</Text>
            <Text className="pf-stat-label">打球总时</Text>
          </View>
          <View className="pf-stat">
            <Text className="pf-stat-val">{profile.winRate}%</Text>
            <Text className="pf-stat-label">胜率</Text>
          </View>
          <View className="pf-stat">
            <Text className="pf-stat-val">{profile.points}</Text>
            <Text className="pf-stat-label">积分</Text>
          </View>
        </View>
      </View>

      {/* 成就 */}
      <View className="pf-section-title"><Text>成就勋章</Text></View>
      <ScrollView className="pf-achs" scrollX>
        {profile.achievements?.map(a => (
          <View key={a.id} className={`pf-ach ${a.unlocked ? '' : 'locked'}`}>
            <Text className="pf-ach-icon">{a.icon}</Text>
            <Text className="pf-ach-name">{a.name}</Text>
          </View>
        ))}
      </ScrollView>

      {/* 菜单 */}
      <View className="pf-menu">
        {[
          { icon: '📊', label: '战绩记录', url: '/pages/records/index' },
          { icon: '🔥', label: '社区社交', url: '/pages/social/index' },
          { icon: '❤️', label: '我的收藏', url: '' },
          { icon: '✏️', label: '场地纠错', url: '' },
          { icon: '⚙️', label: '系统设置', url: '/pages/settings/index' },
        ].map((m, i) => (
          <View key={i} className="pf-menu-item" onClick={() => { if (m.url) Taro.navigateTo({ url: m.url }); }}>
            <Text className="pf-menu-icon">{m.icon}</Text>
            <Text className="pf-menu-label">{m.label}</Text>
            <Text className="pf-menu-arrow">›</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
