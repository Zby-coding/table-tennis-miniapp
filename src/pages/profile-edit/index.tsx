import React, { useState } from 'react';
import { View, Text, Input, Picker, ScrollView } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { getUserProfile, updateUserProfile } from '@/services/api';
import './index.scss';

const styles = ['横拍弧圈', '直拍快攻', '削球', '全能型', '初学'];
const levels = ['L1 萌新', 'L2 进阶', 'L3 高级', 'Pro 大神'];

export default function ProfileEditPage() {
  const [nickname, setNickname] = useState('');
  const [city, setCity] = useState('');
  const [styleIndex, setStyleIndex] = useState(0);
  const [levelIndex, setLevelIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  useLoad(() => {
    loadProfile();
  });

  const loadProfile = async () => {
    try {
      const res = await getUserProfile();
      if (res.code !== 0) return;
      const data = res.data || {};
      setNickname(data.nickname || data.username || '');
      setCity(data.city || '');
      setStyleIndex(Math.max(0, styles.indexOf(data.style || '初学')));
      setLevelIndex(Math.max(0, Number(data.levelValue || 1) - 1));
    } catch {
      Taro.showToast({ title: '资料加载失败', icon: 'none' });
    }
  };

  const saveProfile = async () => {
    const nextName = nickname.trim();
    if (!nextName) {
      Taro.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }
    setSaving(true);
    try {
      const res = await updateUserProfile({
        nickname: nextName,
        city: city.trim(),
        style: styles[styleIndex],
        level: levelIndex + 1,
      });
      if (res.code === 0) {
        Taro.showToast({ title: '已保存', icon: 'success' });
        setTimeout(() => Taro.navigateBack(), 350);
      } else {
        Taro.showToast({ title: res.message || '保存失败', icon: 'none' });
      }
    } catch {
      Taro.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView className="edit-page" scrollY>
      <View className="edit-header">
        <Text className="edit-title">完善球友名片</Text>
        <Text className="edit-subtitle">这些信息会用于约球、战绩和附近球友展示</Text>
      </View>

      <View className="edit-form">
        <View className="edit-field">
          <Text className="edit-label">昵称</Text>
          <Input className="edit-input" value={nickname} maxlength={16} placeholder="输入昵称" onInput={e => setNickname(String(e.detail.value))} />
        </View>
        <View className="edit-field">
          <Text className="edit-label">城市</Text>
          <Input className="edit-input" value={city} maxlength={24} placeholder="例如 杭州" onInput={e => setCity(String(e.detail.value))} />
        </View>
        <Picker mode="selector" range={styles} value={styleIndex} onChange={e => setStyleIndex(Number(e.detail.value))}>
          <View className="edit-field edit-picker">
            <Text className="edit-label">打法</Text>
            <View className="edit-picker-value"><Text>{styles[styleIndex]}</Text><Text className="edit-arrow">›</Text></View>
          </View>
        </Picker>
        <Picker mode="selector" range={levels} value={levelIndex} onChange={e => setLevelIndex(Number(e.detail.value))}>
          <View className="edit-field edit-picker">
            <Text className="edit-label">等级</Text>
            <View className="edit-picker-value"><Text>{levels[levelIndex]}</Text><Text className="edit-arrow">›</Text></View>
          </View>
        </Picker>
      </View>

      <View className={`edit-save ${saving ? 'disabled' : ''}`} onClick={() => { if (!saving) saveProfile(); }}>
        <Text>{saving ? '保存中...' : '保存资料'}</Text>
      </View>
    </ScrollView>
  );
}
