/**
 * 我的收藏
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, Image } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { Court } from '@/types';
import { getFavorites } from '@/services/api';
import { getCourtThumb, normalizeCourt } from '@/data/courts-catalog';
import './index.scss';

export default function FavoritesPage() {
  const [list, setList] = useState<Court[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useDidShow(() => {
    load();
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getFavorites();
      if (res.code === 0) {
        setList((res.data || []).map((c: any) => normalizeCourt(c)));
      } else {
        setError(res.message || '加载失败');
      }
    } catch {
      setError('请先登录并连接服务器');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="fav-page" scrollY>
      <View className="fav-hd">
        <Text className="fav-title">我的收藏</Text>
        <Text className="fav-sub">{loading ? '加载中…' : `共 ${list.length} 个场点`}</Text>
      </View>
      {error ? <View className="fav-empty"><Text>{error}</Text></View> : null}
      {!loading && !error && list.length === 0 ? (
        <View className="fav-empty"><Text>还没有收藏，去地图点开场点试试吧</Text></View>
      ) : null}
      {list.map((court) => {
        const thumb = getCourtThumb(court);
        return (
          <View
            key={court.id}
            className="fav-card"
            onClick={() => Taro.navigateTo({ url: `/pages/court-detail/index?id=${court.id}` })}
          >
            {thumb ? <Image className="fav-thumb" src={thumb} mode="aspectFill" /> : <View className="fav-thumb fav-thumb-empty"><Text>🏓</Text></View>}
            <View className="fav-body">
              <Text className="fav-name">{court.name}</Text>
              <Text className="fav-addr">{court.address}</Text>
              <Text className="fav-meta">{court.isFree ? '免费' : '付费'} · {court.distanceStr || '—'}</Text>
            </View>
            <Text className="fav-arrow">›</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}
