/**
 * 社交圈 — 对应 table-tennis-pro 的 social tab
 * 社区社交圈（建设中）
 */
import React from 'react';
import { View, Text } from '@tarojs/components';
import './index.scss';

export default function SocialPage() {
  return (
    <View className="social-page">
      <View className="social-icon-wrap">
        <Text className="social-icon">🔥</Text>
      </View>
      <Text className="social-title">社区社交圈建设中</Text>
      <Text className="social-desc">
        支持在场地签到后和球友自动建群，发表训练动态和精彩视频！
      </Text>
    </View>
  );
}
