/**
 * 设置页 — 对应 table-tennis-pro 的 SettingsView
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, Switch } from '@tarojs/components';
import Taro from '@tarojs/taro';
import './index.scss';

export default function SettingsPage() {
  const [remindMatch, setRemindMatch] = useState(true);
  const [remindSignIn, setRemindSignIn] = useState(true);

  return (
    <ScrollView className="set-page" scrollY>
      {/* 通知 */}
      <View className="set-section-title"><Text>通知偏好</Text></View>
      <View className="set-card">
        <View className="set-row">
          <View className="set-row-left">
            <Text className="set-row-label">约球提醒</Text>
            <Text className="set-row-desc">附近有新招募时通知我</Text>
          </View>
          <Switch checked={remindMatch} onChange={e => setRemindMatch(e.detail.value)} color="#FF6B35" />
        </View>
        <View className="set-divider" />
        <View className="set-row">
          <View className="set-row-left">
            <Text className="set-row-label">签到提醒</Text>
            <Text className="set-row-desc">开场前15分钟震动提醒</Text>
          </View>
          <Switch checked={remindSignIn} onChange={e => setRemindSignIn(e.detail.value)} color="#FF6B35" />
        </View>
      </View>

      {/* 系统 */}
      <View className="set-section-title"><Text>系统</Text></View>
      <View className="set-card">
        {[
          { icon: '🔒', label: '账号安全', desc: '已保护', arrow: true },
          { icon: '🗑️', label: '清除缓存', desc: '24.8 MB', arrow: false, onClick: () => Taro.showToast({ title: '已清除' }) },
        ].map((item, i) => (
          <View key={i}>
            {i > 0 && <View className="set-divider" />}
            <View className="set-row" onClick={item.onClick}>
              <View className="set-row-left">
                <Text className="set-row-icon">{item.icon}</Text>
                <Text className="set-row-label">{item.label}</Text>
              </View>
              <View className="set-row-right">
                <Text className="set-row-desc">{item.desc}</Text>
                {item.arrow && <Text className="set-arrow">›</Text>}
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* 退出 */}
      <View className="set-logout" onClick={() => Taro.showToast({ title: '已退出' })}>
        <Text className="set-logout-text">退出当前账号</Text>
      </View>

      <View className="set-version"><Text>Version 2.4.0</Text></View>
    </ScrollView>
  );
}
