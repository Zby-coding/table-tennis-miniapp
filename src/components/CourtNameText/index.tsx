import React from 'react';
import { View, Text } from '@tarojs/components';
import './index.scss';

interface CourtNameTextProps {
  name: string;
  variant?: 'preview' | 'detail';
}

/**
 * 场点名称横排展示。微信 Text 不可作 flex 子项且不宜 word-break:break-all，
 * 由外层 View 撑满宽度，内层承载排版，Text 仅负责 numberOfLines 截断。
 */
export default function CourtNameText({ name, variant = 'preview' }: CourtNameTextProps) {
  return (
    <View className={`court-name-wrap court-name-wrap--${variant}`} style={{ width: '100%' }}>
      <View className={`court-name-inner court-name-inner--${variant}`}>
        <Text className="court-name-text" numberOfLines={3} selectable={false}>
          {name}
        </Text>
      </View>
    </View>
  );
}
