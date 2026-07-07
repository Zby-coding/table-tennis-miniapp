/**
 * 约球广场 — 对应 table-tennis-pro 的 SquareView
 * 招募列表 + 筛选 + 发布约球 + 加入
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Input, Image } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { MatchPost } from '@/types';
import { getPosts, joinPost } from '@/services/api';
import { INITIAL_MATCH_POSTS } from '@/data';
import './index.scss';

// ── 默认数据 ──
const DEFAULT_POSTS: MatchPost[] = INITIAL_MATCH_POSTS;

const LEVELS = ['全部', 'L1 萌新', 'L2 进阶', 'L3 高级', 'Pro 大神'];
const TIMES = ['全部', '上午', '下午', '晚间'];

export default function SquarePage() {
  const [posts, setPosts] = useState<MatchPost[]>(DEFAULT_POSTS);
  const [activeTab, setActiveTab] = useState<'recruiting' | 'mine'>('recruiting');
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('全部');
  const [timeFilter, setTimeFilter] = useState('全部');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // 表单
  const [title, setTitle] = useState('');
  const [courtName, setCourtName] = useState('朝阳公园');
  const [timeStr, setTimeStr] = useState('');
  const [capacity, setCapacity] = useState('4');
  const [feeType, setFeeType] = useState<'AA制' | '免费' | '付费'>('AA制');
  const [feeValue, setFeeValue] = useState('15');

  useDidShow(() => {
    loadPosts();
  });

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPosts(searchQuery || undefined);
      if (res.code === 0 && res.data?.length > 0) setPosts(res.data);
    } catch { /* keep defaults */ }
    setLoading(false);
  }, [searchQuery]);

  const handleJoin = useCallback(async (postId: string) => {
    try {
      const numId = parseInt(postId.replace('post_', ''));
      const res = await joinPost(numId);
      if (res.code === 0) {
        Taro.showToast({ title: '加入成功!', icon: 'success' });
        loadPosts();
      } else {
        Taro.showToast({ title: res.message || '加入失败', icon: 'none' });
      }
    } catch (err) {
      // 本地 fallback：直接修改列表
      setPosts(prev => prev.map(p => {
        if (p.id === postId && p.joinedCount < p.totalCapacity) {
          const newCount = p.joinedCount + 1;
          return {
            ...p, joinedCount: newCount,
            status: newCount >= p.totalCapacity ? '已满员' : p.status,
            isJoinedByMe: true,
          };
        }
        return p;
      }));
      Taro.showToast({ title: '已加入(本地)', icon: 'success' });
    }
  }, [loadPosts]);

  const filteredPosts = posts.filter(p => {
    if (activeTab === 'mine') return p.isJoinedByMe;
    return true;
  });

  return (
    <View className="square-page">
      {/* 搜索 */}
      <View className="sq-search-bar">
        <Input className="sq-search-input" placeholder="搜索约球标题、场地、人名" value={searchQuery}
          onInput={e => setSearchQuery(e.detail.value)} onConfirm={loadPosts} confirmType="search" />
      </View>

      {/* Tab */}
      <View className="sq-tabs">
        {(['recruiting', 'mine'] as const).map(t => (
          <View key={t} className={`sq-tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
            <Text>{t === 'recruiting' ? '正在招募' : '我的约球'}</Text>
          </View>
        ))}
      </View>

      {/* 筛选 */}
      <ScrollView className="sq-filters" scrollX>
        {[{ label: '水平', value: levelFilter, options: LEVELS, setter: setLevelFilter },
          { label: '时间', value: timeFilter, options: TIMES, setter: setTimeFilter }].map(f => (
          <View key={f.label} className="sq-filter-btn" onClick={() => {
            const opts = f.options;
            const idx = opts.indexOf(f.value);
            f.setter(opts[(idx + 1) % opts.length]);
          }}>
            <Text className="sq-filter-text">{f.label}: {f.value}</Text>
          </View>
        ))}
      </ScrollView>

      {/* 列表 */}
      <ScrollView className="sq-list" scrollY enableFlex>
        {filteredPosts.length === 0 ? (
          <View className="sq-empty"><Text>暂无招募信息</Text></View>
        ) : (
          filteredPosts.map(post => {
            const isFull = post.joinedCount >= post.totalCapacity;
            const statusColor = isFull ? '#999' : post.status === '最后1席' ? '#F59E0B' : '#0F9D58';
            return (
              <View key={post.id} className="sq-card">
                <View className="sq-card-status" style={{ background: statusColor }}>
                  <Text className="sq-status-text">{post.status}</Text>
                </View>
                <View className="sq-card-body">
                  <Text className="sq-card-title">{post.title}</Text>
                  <View className="sq-card-meta">
                    <Text className="sq-meta-item">📍 {post.locationName}</Text>
                    <Text className="sq-meta-item">🕐 {post.timeStr}</Text>
                    <Text className="sq-meta-item">👥 {post.joinedCount}/{post.totalCapacity}人</Text>
                    <Text className="sq-meta-item">💰 {post.feeType}{post.feeValue > 0 ? ` ¥${post.feeValue}` : ''}</Text>
                  </View>
                  <Text className="sq-card-desc">{post.description}</Text>
                  {!isFull && !post.isJoinedByMe ? (
                    <View className="sq-join-btn" onClick={() => handleJoin(post.id)}>
                      <Text className="sq-join-text">立即加入</Text>
                    </View>
                  ) : (
                    <View className="sq-disabled-btn">
                      <Text className="sq-join-text">{post.isJoinedByMe ? '已参加' : '已满员'}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* FAB */}
      <View className="sq-fab" onClick={() => setShowModal(true)}>
        <Text className="sq-fab-text">+ 发布约球</Text>
      </View>
    </View>
  );
}
