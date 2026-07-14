/**
 * 约球详情页 — 完整信息、成员列表、审批、加入/退出
 */
import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Image, Map } from '@tarojs/components';
import Taro, { useLoad, useDidShow } from '@tarojs/taro';
import { MatchPostDetail } from '@/types';
import {
  getPostDetail, joinPost, leavePost, approveJoin, rejectJoin, deletePost,
} from '@/services/api';
import { formatFee, getStatusColor, parsePostId, isPostEnded, isPostFull } from '@/utils/post';
import { openCourtNavigation } from '@/utils/location';
import './index.scss';

export default function PostDetailPage() {
  const [postId, setPostId] = useState<number | null>(null);
  const [post, setPost] = useState<MatchPostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const loadDetail = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const res = await getPostDetail(id);
      if (res.code === 0) setPost(res.data);
    } catch {
      Taro.showToast({ title: '加载失败', icon: 'none' });
    }
    setLoading(false);
  }, []);

  useLoad((options: Record<string, string>) => {
    const id = Number(options?.id);
    if (id) {
      setPostId(id);
      loadDetail(id);
    }
  });

  useDidShow(() => {
    if (postId) loadDetail(postId);
  });

  const refresh = () => {
    if (postId) loadDetail(postId);
  };

  const handleJoin = async () => {
    if (!postId || acting) return;
    setActing(true);
    try {
      const res = await joinPost(postId);
      if (res.code === 0) {
        Taro.showToast({
          title: res.data?.message || res.message || '操作成功',
          icon: 'success',
        });
        refresh();
      } else {
        Taro.showToast({ title: res.message || '操作失败', icon: 'none' });
      }
    } catch {
      Taro.showToast({ title: '网络错误', icon: 'none' });
    }
    setActing(false);
  };

  const handleLeave = () => {
    if (!postId) return;
    Taro.showModal({
      title: post?.isPendingByMe ? '取消申请' : '退出约球',
      content: post?.isPendingByMe ? '确定取消加入申请吗？' : '确定退出这场约球吗？',
      success: async (res) => {
        if (!res.confirm || acting) return;
        setActing(true);
        try {
          const result = await leavePost(postId);
          if (result.code === 0) {
            Taro.showToast({ title: result.data?.message || '已退出', icon: 'success' });
            refresh();
          } else {
            Taro.showToast({ title: result.message || '操作失败', icon: 'none' });
          }
        } catch {
          Taro.showToast({ title: '网络错误', icon: 'none' });
        }
        setActing(false);
      },
    });
  };

  const handleReview = async (joinId: number, action: 'approve' | 'reject') => {
    if (!postId || acting) return;
    setActing(true);
    try {
      const res = action === 'approve'
        ? await approveJoin(postId, joinId)
        : await rejectJoin(postId, joinId);
      if (res.code === 0) {
        Taro.showToast({ title: res.data?.message || '已处理', icon: 'success' });
        refresh();
      } else {
        Taro.showToast({ title: res.message || '操作失败', icon: 'none' });
      }
    } catch {
      Taro.showToast({ title: '网络错误', icon: 'none' });
    }
    setActing(false);
  };

  const handleDelete = () => {
    if (!postId || !post) return;
    Taro.showModal({
      title: '删除约球',
      content: '确定删除这条约球吗？',
      success: async (res) => {
        if (!res.confirm || acting) return;
        setActing(true);
        try {
          const result = await deletePost(postId);
          if (result.code === 0) {
            Taro.showToast({ title: '已删除', icon: 'success' });
            setTimeout(() => Taro.navigateBack(), 500);
          } else {
            Taro.showToast({ title: result.message || '删除失败', icon: 'none' });
          }
        } catch {
          Taro.showToast({ title: '网络错误', icon: 'none' });
        }
        setActing(false);
      },
    });
  };

  const handleNavigate = () => {
    if (!post?.courtLat || !post?.courtLng) {
      Taro.showToast({ title: '暂无场地坐标', icon: 'none' });
      return;
    }
    openCourtNavigation({
      lat: post.courtLat,
      lng: post.courtLng,
      name: post.locationName,
      address: post.courtAddress || post.locationName,
    });
  };

  const renderFooter = () => {
    if (!post) return null;
    const ended = isPostEnded(post);
    const full = isPostFull(post);

    if (post.isOrganizerByMe) {
      return (
        <View className="pd-footer">
          <View className="pd-btn pd-btn-danger" onClick={handleDelete}>
            <Text>删除约球</Text>
          </View>
        </View>
      );
    }

    if (ended) {
      return (
        <View className="pd-footer">
          <View className="pd-btn pd-btn-disabled"><Text>{post.status}</Text></View>
        </View>
      );
    }

    if (post.isPendingByMe) {
      return (
        <View className="pd-footer">
          <View className="pd-btn pd-btn-secondary" onClick={handleLeave}>
            <Text>取消申请</Text>
          </View>
          <View className="pd-btn pd-btn-disabled"><Text>等待审批</Text></View>
        </View>
      );
    }

    if (post.isJoinedByMe) {
      return (
        <View className="pd-footer">
          <View className="pd-btn pd-btn-outline" onClick={handleLeave}>
            <Text>退出约球</Text>
          </View>
          <View className="pd-btn pd-btn-disabled"><Text>已参加</Text></View>
        </View>
      );
    }

    if (full) {
      return (
        <View className="pd-footer">
          <View className="pd-btn pd-btn-disabled"><Text>已满员</Text></View>
        </View>
      );
    }

    return (
      <View className="pd-footer">
        <View className="pd-btn pd-btn-primary" onClick={handleJoin}>
          <Text>{post.requireApproval ? '申请加入' : '立即加入'}</Text>
        </View>
      </View>
    );
  };

  if (loading && !post) {
    return <View className="pd-loading"><Text>加载中...</Text></View>;
  }

  if (!post) {
    return <View className="pd-loading"><Text>约球不存在</Text></View>;
  }

  const hasMap = post.courtLat != null && post.courtLng != null;
  const approvedMembers = post.members?.filter((m) => m.status === 'approved') ?? [];
  const pendingMembers = post.pendingMembers ?? [];

  return (
    <View className="pd-page">
      <ScrollView scrollY className="pd-scroll">
        <View className="pd-header">
          <View className="pd-status-row">
            <View className="pd-status-badge" style={{ background: getStatusColor(post) }}>
              <Text className="pd-status-text">{post.status}</Text>
            </View>
            {post.requireApproval && (
              <Text className="pd-approval-tag">需审批加入</Text>
            )}
            {(post.pendingCount ?? 0) > 0 && post.isOrganizerByMe && (
              <Text className="pd-approval-tag">{post.pendingCount} 人待审批</Text>
            )}
          </View>
          <Text className="pd-title">{post.title}</Text>
          <View className="pd-organizer">
            {post.organizerAvatar ? (
              <Image className="pd-organizer-avatar" src={post.organizerAvatar} mode="aspectFill" />
            ) : (
              <View className="pd-organizer-avatar pd-organizer-placeholder">
                <Text>{post.organizerName.slice(0, 1)}</Text>
              </View>
            )}
            <View>
              <Text className="pd-organizer-name">{post.organizerName}</Text>
              <Text className="pd-organizer-level">{post.organizerLevel} · 发起人</Text>
            </View>
          </View>
        </View>

        <View className="pd-section">
          <Text className="pd-section-title">约球信息</Text>
          <View className="pd-info-row">
            <Text className="pd-info-label">场地</Text>
            <Text className="pd-info-value">{post.locationName}</Text>
          </View>
          {post.courtAddress ? (
            <View className="pd-info-row">
              <Text className="pd-info-label">地址</Text>
              <Text className="pd-info-value">{post.courtAddress}</Text>
            </View>
          ) : null}
          <View className="pd-info-row">
            <Text className="pd-info-label">时间</Text>
            <Text className="pd-info-value">{post.timeStr}</Text>
          </View>
          <View className="pd-info-row">
            <Text className="pd-info-label">人数</Text>
            <Text className="pd-info-value">{post.joinedCount}/{post.totalCapacity} 人</Text>
          </View>
          <View className="pd-info-row">
            <Text className="pd-info-label">费用</Text>
            <Text className="pd-info-value">{formatFee(post)}</Text>
          </View>
          {hasMap && (
            <>
              <Map
                className="pd-map"
                latitude={post.courtLat!}
                longitude={post.courtLng!}
                scale={15}
                markers={[{
                  id: 1,
                  latitude: post.courtLat!,
                  longitude: post.courtLng!,
                  title: post.locationName,
                }]}
              />
              <View className="pd-nav-btn" onClick={handleNavigate}>
                <Text>导航到场点</Text>
              </View>
            </>
          )}
        </View>

        {post.description ? (
          <View className="pd-section">
            <Text className="pd-section-title">补充说明</Text>
            <Text className="pd-desc">{post.description}</Text>
          </View>
        ) : null}

        <View className="pd-section">
          <Text className="pd-section-title">已加入 ({approvedMembers.length})</Text>
          {approvedMembers.length === 0 ? (
            <Text className="pd-desc">暂无成员</Text>
          ) : (
            approvedMembers.map((m) => (
              <View key={m.joinId} className="pd-member">
                {m.avatar ? (
                  <Image className="pd-member-avatar" src={m.avatar} mode="aspectFill" />
                ) : (
                  <View className="pd-member-avatar pd-organizer-placeholder">
                    <Text>{m.nickname.slice(0, 1)}</Text>
                  </View>
                )}
                <View className="pd-member-info">
                  <Text className="pd-member-name">{m.nickname}</Text>
                  <Text className="pd-member-level">{m.level}</Text>
                </View>
                {m.isOrganizer && <Text className="pd-member-tag">发起人</Text>}
              </View>
            ))
          )}
        </View>

        {post.isOrganizerByMe && pendingMembers.length > 0 && (
          <View className="pd-section">
            <Text className="pd-section-title">待审批 ({pendingMembers.length})</Text>
            {pendingMembers.map((m) => (
              <View key={m.joinId} className="pd-member">
                {m.avatar ? (
                  <Image className="pd-member-avatar" src={m.avatar} mode="aspectFill" />
                ) : (
                  <View className="pd-member-avatar pd-organizer-placeholder">
                    <Text>{m.nickname.slice(0, 1)}</Text>
                  </View>
                )}
                <View className="pd-member-info">
                  <Text className="pd-member-name">{m.nickname}</Text>
                  <Text className="pd-member-level">{m.level}</Text>
                </View>
                <View className="pd-pending-actions">
                  <View className="pd-approve-btn" onClick={() => handleReview(m.joinId, 'approve')}>
                    <Text>通过</Text>
                  </View>
                  <View className="pd-reject-btn" onClick={() => handleReview(m.joinId, 'reject')}>
                    <Text>拒绝</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {renderFooter()}
    </View>
  );
}
