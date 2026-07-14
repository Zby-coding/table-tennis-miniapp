/**
 * 设置页 — 通知、隐私与账号操作
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, Switch } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { getUserProfile, updateUserPreferences, clearToken } from '@/services/api';
import { UserPreferences } from '@/types';
import './index.scss';

const DEFAULT_PREFS: UserPreferences = { remindMatch: true, remindSignIn: true, showActivity: true };

type PrefKey = keyof UserPreferences;

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFS);
  const [savingKey, setSavingKey] = useState<PrefKey | ''>('');

  useDidShow(() => {
    loadSettings();
  });

  const loadSettings = async () => {
    try {
      const res = await getUserProfile();
      if (res.code === 0) setPrefs({ ...DEFAULT_PREFS, ...(res.data?.preferences || {}) });
    } catch {
      // keep local defaults
    }
  };

  const togglePref = async (key: PrefKey, value: boolean) => {
    const previous = prefs;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSavingKey(key);
    try {
      const res = await updateUserPreferences({ [key]: value });
      if (res.code === 0) setPrefs({ ...next, ...(res.data || {}) });
      else throw new Error(res.message || '保存失败');
    } catch {
      setPrefs(previous);
      Taro.showToast({ title: '设置保存失败', icon: 'none' });
    } finally {
      setSavingKey('');
    }
  };

  const logout = () => {
    clearToken();
    Taro.showToast({ title: '已退出', icon: 'success' });
    setTimeout(() => Taro.reLaunch({ url: '/pages/index/index' }), 300);
  };

  return (
    <ScrollView className="set-page" scrollY>
      <View className="set-section-title"><Text>通知偏好</Text></View>
      <View className="set-card">
        <View className="set-row">
          <View className="set-row-left">
            <Text className="set-row-label">约球提醒</Text>
            <Text className="set-row-desc">附近有新招募时通知我</Text>
          </View>
          <Switch disabled={savingKey === 'remindMatch'} checked={prefs.remindMatch} onChange={e => togglePref('remindMatch', e.detail.value)} color="#FF6B35" />
        </View>
        <View className="set-divider" />
        <View className="set-row">
          <View className="set-row-left">
            <Text className="set-row-label">签到提醒</Text>
            <Text className="set-row-desc">开场前15分钟提醒</Text>
          </View>
          <Switch disabled={savingKey === 'remindSignIn'} checked={prefs.remindSignIn} onChange={e => togglePref('remindSignIn', e.detail.value)} color="#FF6B35" />
        </View>
      </View>

      <View className="set-section-title"><Text>隐私</Text></View>
      <View className="set-card">
        <View className="set-row">
          <View className="set-row-left">
            <Text className="set-row-label">展示活动状态</Text>
            <Text className="set-row-desc">允许球友看到我的活跃与约球状态</Text>
          </View>
          <Switch disabled={savingKey === 'showActivity'} checked={prefs.showActivity} onChange={e => togglePref('showActivity', e.detail.value)} color="#FF6B35" />
        </View>
      </View>

      <View className="set-section-title"><Text>系统</Text></View>
      <View className="set-card">
        {[
          { icon: '🔒', label: '账号安全', desc: '微信登录保护', arrow: true },
          { icon: '🗑️', label: '清除缓存', desc: '本地临时数据', arrow: false, onClick: () => Taro.showToast({ title: '已清除' }) },
        ].map((item, i) => (
          <View key={i}>
            {i > 0 && <View className="set-divider" />}
            <View className="set-row" onClick={item.onClick}>
              <View className="set-row-left with-icon">
                <Text className="set-row-icon">{item.icon}</Text>
                <View>
                  <Text className="set-row-label">{item.label}</Text>
                  <Text className="set-row-desc">{item.desc}</Text>
                </View>
              </View>
              <View className="set-row-right">
                {item.arrow && <Text className="set-arrow">›</Text>}
              </View>
            </View>
          </View>
        ))}
      </View>

      <View className="set-logout" onClick={logout}>
        <Text className="set-logout-text">退出当前账号</Text>
      </View>

      <View className="set-version"><Text>Version 2.4.0</Text></View>
    </ScrollView>
  );
}
