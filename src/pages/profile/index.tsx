/**
 * 个人中心 — 用户资料、收藏、签到与勋章
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, Image } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { UserProfile } from '@/types';
import { getUserProfile, getAchievements, getCheckinHistory, getToken } from '@/services/api';
import './index.scss';

interface CheckinItem {
  id: number;
  courtName: string;
  createdAt?: string;
  startTime?: string;
}

const EMPTY_PROFILE: UserProfile = {
  id: 0,
  username: '',
  nickname: '',
  level: '',
  levelValue: 1,
  levelBadge: '',
  avatarUrl: '',
  points: 0,
  hoursPlayed: 0,
  winRate: 0,
  checkinCount: 0,
  favoriteCount: 0,
  totalMatches: 0,
  achievements: [],
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [recentCheckins, setRecentCheckins] = useState<CheckinItem[]>([]);

  useDidShow(() => {
    loadProfile();
  });

  const loadProfile = async () => {
    setLoading(true);
    setLoadError('');
    if (!getToken()) {
      setProfile(EMPTY_PROFILE);
      setRecentCheckins([]);
      setLoadError('请先登录');
      setLoading(false);
      return;
    }
    try {
      const [pRes, aRes, hRes] = await Promise.all([
        getUserProfile(),
        getAchievements(),
        getCheckinHistory(1, 5),
      ]);
      if (pRes.code === 0) {
        const achievements = aRes.code === 0 ? aRes.data : pRes.data.achievements || [];
        setProfile({ ...pRes.data, achievements });
      } else {
        setProfile(EMPTY_PROFILE);
        setLoadError(pRes.message || '资料加载失败');
      }
      if (hRes.code === 0) {
        setRecentCheckins(hRes.data?.list || []);
      }
    } catch {
      setProfile(EMPTY_PROFILE);
      setRecentCheckins([]);
      setLoadError('网络异常，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const nickname = profile.nickname || profile.username || (loadError ? '未登录' : '乒乓球友');
  const avatarUrl = profile.avatarUrl;
  const statusText = profile.status === 'disabled' ? '账号停用' : (loadError ? loadError : '正常使用');
  const unlocked = profile.achievements?.filter((a) => a.unlocked).length || 0;
  const canEdit = !loadError && profile.status !== 'disabled' && !!profile.id;

  return (
    <ScrollView className="profile-page" scrollY>
      <View className="pf-hero">
        <View className="pf-topbar">
          <Text className="pf-topbar-title">我的</Text>
          <View className="pf-topbar-btn" onClick={() => Taro.navigateTo({ url: '/pages/settings/index' })}>
            <Text>⚙</Text>
          </View>
        </View>

        <View className="pf-user-row">
          <View className="pf-avatar">
            {avatarUrl ? <Image className="pf-avatar-img" src={avatarUrl} mode="aspectFill" /> : <Text className="pf-avatar-text">乒</Text>}
          </View>
          <View className="pf-user-main">
            <View className="pf-name-row">
              <Text className="pf-name">{nickname}</Text>
              <Text className="pf-status">{statusText}</Text>
            </View>
            <Text className="pf-meta">{profile.levelBadge || profile.level} · {profile.city || '未设置城市'}</Text>
            <Text className="pf-meta">累计签到 {profile.checkinCount || 0} 次 · 收藏 {profile.favoriteCount || 0}</Text>
          </View>
        </View>

        <View className="pf-actions">
          <View
            className="pf-primary-action"
            onClick={() => {
              if (!canEdit) {
                Taro.showToast({ title: loadError || '账号不可用', icon: 'none' });
                return;
              }
              Taro.navigateTo({ url: '/pages/profile-edit/index' });
            }}
          >
            <Text>编辑资料</Text>
          </View>
          {profile.role === 'admin' && canEdit && (
            <View className="pf-secondary-action" onClick={() => Taro.showToast({ title: '请在浏览器打开管理端', icon: 'none' })}>
              <Text>管理员</Text>
            </View>
          )}
        </View>
      </View>

      <View className="pf-stat-grid">
        <View className="pf-stat">
          <Text className="pf-stat-val">{profile.checkinCount || 0}</Text>
          <Text className="pf-stat-label">签到次数</Text>
        </View>
        <View className="pf-stat">
          <Text className="pf-stat-val">{profile.favoriteCount || 0}</Text>
          <Text className="pf-stat-label">收藏场点</Text>
        </View>
        <View className="pf-stat">
          <Text className="pf-stat-val">{profile.points || 0}</Text>
          <Text className="pf-stat-label">积分</Text>
        </View>
        <View className="pf-stat">
          <Text className="pf-stat-val">{unlocked}</Text>
          <Text className="pf-stat-label">勋章</Text>
        </View>
      </View>

      <View className="pf-section-title"><Text>成就勋章</Text><Text className="pf-section-sub">{loading ? '同步中' : `${unlocked} 已点亮`}</Text></View>
      <ScrollView className="pf-achs" scrollX>
        {profile.achievements?.map((a) => (
          <View key={a.id} className={`pf-ach ${a.unlocked ? '' : 'locked'}`}>
            {a.iconUrl ? (
              <Image className="pf-ach-img" src={a.iconUrl} mode="aspectFit" />
            ) : (
              <Text className="pf-ach-icon">{a.icon || '🏅'}</Text>
            )}
            <Text className="pf-ach-name">{a.name}</Text>
          </View>
        ))}
      </ScrollView>

      <View className="pf-section-title"><Text>最近签到</Text></View>
      <View className="pf-checkin-list">
        {recentCheckins.length === 0 ? (
          <Text className="pf-checkin-empty">暂无签到记录，去场地点个到吧</Text>
        ) : recentCheckins.map((item) => (
          <View key={item.id} className="pf-checkin-item">
            <Text className="pf-checkin-name">{item.courtName}</Text>
            <Text className="pf-checkin-time">{String(item.startTime || item.createdAt || '').slice(0, 16)}</Text>
          </View>
        ))}
      </View>

      <View className="pf-menu">
        {[
          { icon: '❤️', label: '我的收藏', desc: `${profile.favoriteCount || 0} 个场点`, url: '/pages/favorites/index' },
          { icon: '📊', label: '战绩记录', desc: `${profile.totalMatches || 0} 场比赛`, url: '/pages/records/index' },
          { icon: '🔥', label: '社区社交', desc: '约球与动态', url: '/pages/social/index' },
          { icon: '✏️', label: '个人资料', desc: '昵称、城市、打法', url: '/pages/profile-edit/index' },
          { icon: '⚙️', label: '系统设置', desc: '提醒与隐私', url: '/pages/settings/index' },
        ].map((m, i) => (
          <View key={i} className="pf-menu-item" onClick={() => Taro.navigateTo({ url: m.url })}>
            <Text className="pf-menu-icon">{m.icon}</Text>
            <View className="pf-menu-copy">
              <Text className="pf-menu-label">{m.label}</Text>
              <Text className="pf-menu-desc">{m.desc}</Text>
            </View>
            <Text className="pf-menu-arrow">›</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
