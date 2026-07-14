/**
 * 约球广场 — 招募列表 + 筛选 + 发布约球 + 加入/审批 + 我的约球管理
 */
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, Input, Image, Picker } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { MatchPost } from '@/types';
import {
  getPosts, getMyPosts, joinPost, leavePost, createPost, updatePost, deletePost, getNearbyCourts,
} from '@/services/api';
import { INITIAL_MATCH_POSTS } from '@/data';
import { DEFAULT_LOCATION } from '@/utils/location';
import {
  parsePostId, getStatusColor, formatFee, toIsoStartTime, splitStartTime,
  isPostEnded, isPostFull,
} from '@/utils/post';
import './index.scss';

interface CourtOption {
  id: number;
  name: string;
}

interface PostFormState {
  title: string;
  courtIndex: number;
  date: string;
  time: string;
  capacity: string;
  feeType: 'AA制' | '免费' | '付费';
  feeValue: string;
  description: string;
  requireApproval: boolean;
}

const DEFAULT_POSTS: MatchPost[] = INITIAL_MATCH_POSTS;
const LEVELS = ['全部', 'L1 萌新', 'L2 进阶', 'L3 高级', 'Pro 大神'];
const TIMES = ['全部', '上午', '下午', '晚间'];
const FEE_TYPES: Array<'AA制' | '免费' | '付费'> = ['免费', 'AA制', '付费'];

const emptyForm = (): PostFormState => ({
  title: '',
  courtIndex: 0,
  date: '',
  time: '',
  capacity: '4',
  feeType: '免费',
  feeValue: '0',
  description: '',
  requireApproval: true,
});

export default function SquarePage() {
  const [posts, setPosts] = useState<MatchPost[]>(DEFAULT_POSTS);
  const [activeTab, setActiveTab] = useState<'recruiting' | 'mine'>('recruiting');
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('全部');
  const [timeFilter, setTimeFilter] = useState('全部');
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState<MatchPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [courts, setCourts] = useState<CourtOption[]>([]);
  const [form, setForm] = useState<PostFormState>(emptyForm());

  const queryParams = useCallback(() => ({
    keyword: searchQuery.trim() || undefined,
    level: levelFilter,
    timeFilter: timeFilter,
  }), [searchQuery, levelFilter, timeFilter]);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = queryParams();
      const res = activeTab === 'mine'
        ? await getMyPosts(params)
        : await getPosts(params);
      if (res.code === 0) {
        setPosts(res.data ?? []);
      }
    } catch {
      if (activeTab === 'recruiting') {
        setPosts(DEFAULT_POSTS);
      } else {
        setPosts([]);
      }
    }
    setLoading(false);
  }, [activeTab, queryParams]);

  const loadCourts = useCallback(async (): Promise<CourtOption[]> => {
    try {
      const res = await getNearbyCourts(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng);
      if (res.code === 0 && res.data?.length) {
        const list = res.data.map((c: CourtOption) => ({ id: Number(c.id), name: c.name }));
        setCourts(list);
        return list;
      }
    } catch { /* fallback */ }
    const fallback = [
      { id: 1, name: '白河湿地公园乒乓球区' },
      { id: 2, name: '南阳市体育中心乒乓球场' },
      { id: 3, name: '南阳理工学院乒乓球区' },
    ];
    setCourts(fallback);
    return fallback;
  }, []);

  useDidShow(() => {
    loadPosts();
  });

  useEffect(() => {
    loadPosts();
  }, [activeTab, levelFilter, timeFilter, loadPosts]);

  const goDetail = (post: MatchPost, e?: { stopPropagation?: () => void }) => {
    e?.stopPropagation?.();
    const id = parsePostId(post.id);
    if (id) Taro.navigateTo({ url: `/pages/post-detail/index?id=${id}` });
  };

  const openCreateModal = async () => {
    await loadCourts();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    setEditingPost(null);
    setForm({ ...emptyForm(), date, time: '09:00' });
    setShowModal(true);
  };

  const openEditModal = async (post: MatchPost, e?: { stopPropagation?: () => void }) => {
    e?.stopPropagation?.();
    const courtList = await loadCourts();
    const { date, time } = splitStartTime(post.startTime);
    const courtIndex = Math.max(0, courtList.findIndex((c) => c.id === post.courtId));
    setEditingPost(post);
    setForm({
      title: post.title,
      courtIndex,
      date,
      time: time || '09:00',
      capacity: String(post.totalCapacity),
      feeType: post.feeType,
      feeValue: String(post.feeValue),
      description: post.description,
      requireApproval: post.requireApproval !== false,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPost(null);
    setForm(emptyForm());
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      Taro.showToast({ title: '请填写约球标题', icon: 'none' });
      return;
    }
    if (!courts.length) {
      Taro.showToast({ title: '暂无可用场地', icon: 'none' });
      return;
    }
    if (!form.date || !form.time) {
      Taro.showToast({ title: '请选择打球时间', icon: 'none' });
      return;
    }
    const capacity = parseInt(form.capacity, 10);
    if (Number.isNaN(capacity) || capacity < 2) {
      Taro.showToast({ title: '人数至少为2人', icon: 'none' });
      return;
    }

    const court = courts[form.courtIndex] ?? courts[0];
    const payload = {
      title: form.title.trim(),
      courtId: court.id,
      startTime: toIsoStartTime(form.date, form.time),
      totalCapacity: capacity,
      feeType: form.feeType,
      feeValue: form.feeType === '免费' ? 0 : parseInt(form.feeValue, 10) || 0,
      description: form.description.trim(),
      requireApproval: form.requireApproval,
    };

    setSubmitting(true);
    try {
      if (editingPost) {
        const postId = parsePostId(editingPost.id);
        if (!postId) throw new Error('invalid id');
        const res = await updatePost(postId, payload);
        if (res.code !== 0) throw new Error(res.message);
        Taro.showToast({ title: '修改成功', icon: 'success' });
      } else {
        const res = await createPost(payload);
        if (res.code !== 0) throw new Error(res.message);
        Taro.showToast({ title: '发布成功', icon: 'success' });
      }
      closeModal();
      loadPosts();
    } catch (err: any) {
      Taro.showToast({ title: err?.message || '操作失败', icon: 'none' });
    }
    setSubmitting(false);
  };

  const handleJoin = useCallback(async (post: MatchPost, e?: { stopPropagation?: () => void }) => {
    e?.stopPropagation?.();
    const numId = parsePostId(post.id);
    if (!numId) {
      Taro.showToast({ title: '无效的约球ID', icon: 'none' });
      return;
    }
    try {
      const res = await joinPost(numId);
      if (res.code === 0) {
        Taro.showToast({
          title: res.data?.message || res.message || '操作成功',
          icon: 'success',
        });
        loadPosts();
      } else {
        Taro.showToast({ title: res.message || '加入失败', icon: 'none' });
      }
    } catch {
      Taro.showToast({ title: '网络错误，请重试', icon: 'none' });
    }
  }, [loadPosts]);

  const handleLeave = (post: MatchPost, e?: { stopPropagation?: () => void }) => {
    e?.stopPropagation?.();
    const numId = parsePostId(post.id);
    if (!numId) return;
    Taro.showModal({
      title: post.isPendingByMe ? '取消申请' : '退出约球',
      content: post.isPendingByMe ? '确定取消加入申请吗？' : '确定退出这场约球吗？',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          const result = await leavePost(numId);
          if (result.code === 0) {
            Taro.showToast({ title: result.data?.message || '已退出', icon: 'success' });
            loadPosts();
          } else {
            Taro.showToast({ title: result.message || '操作失败', icon: 'none' });
          }
        } catch {
          Taro.showToast({ title: '网络错误', icon: 'none' });
        }
      },
    });
  };

  const handleDelete = (post: MatchPost, e?: { stopPropagation?: () => void }) => {
    e?.stopPropagation?.();
    Taro.showModal({
      title: '删除约球',
      content: '确定要删除这条约球吗？删除后其他人将无法加入。',
      success: async (res) => {
        if (!res.confirm) return;
        const numId = parsePostId(post.id);
        if (!numId) return;
        try {
          const result = await deletePost(numId);
          if (result.code === 0) {
            Taro.showToast({ title: '已删除', icon: 'success' });
            loadPosts();
          } else {
            Taro.showToast({ title: result.message || '删除失败', icon: 'none' });
          }
        } catch {
          Taro.showToast({ title: '网络错误', icon: 'none' });
        }
      },
    });
  };

  const renderActionArea = (post: MatchPost) => {
    const ended = isPostEnded(post);
    const full = isPostFull(post);

    if (activeTab === 'mine' && post.isOrganizerByMe) {
      return (
        <View className="sq-card-actions">
          <View className="sq-edit-btn" onClick={(e) => openEditModal(post, e)}>
            <Text className="sq-action-text">编辑</Text>
          </View>
          <View className="sq-delete-btn" onClick={(e) => handleDelete(post, e)}>
            <Text className="sq-action-text">删除</Text>
          </View>
          {(post.pendingCount ?? 0) > 0 && (
            <View className="sq-detail-btn" onClick={(e) => goDetail(post, e)}>
              <Text className="sq-action-text">审批({post.pendingCount})</Text>
            </View>
          )}
        </View>
      );
    }

    if (ended) {
      return (
        <View className="sq-disabled-btn">
          <Text className="sq-join-text">{post.status}</Text>
        </View>
      );
    }

    if (post.isPendingByMe) {
      return (
        <View className="sq-card-actions">
          <View className="sq-disabled-btn sq-flex-grow">
            <Text className="sq-join-text">等待审批</Text>
          </View>
          <View className="sq-leave-btn" onClick={(e) => handleLeave(post, e)}>
            <Text className="sq-action-text">取消申请</Text>
          </View>
        </View>
      );
    }

    if (post.isJoinedByMe) {
      return (
        <View className="sq-card-actions">
          <View className="sq-disabled-btn sq-flex-grow">
            <Text className="sq-join-text">已参加</Text>
          </View>
          <View className="sq-leave-btn" onClick={(e) => handleLeave(post, e)}>
            <Text className="sq-action-text">退出</Text>
          </View>
        </View>
      );
    }

    if (full) {
      return (
        <View className="sq-disabled-btn">
          <Text className="sq-join-text">已满员</Text>
        </View>
      );
    }

    return (
      <View className="sq-join-btn" onClick={(e) => handleJoin(post, e)}>
        <Text className="sq-join-text">{post.requireApproval ? '申请加入' : '立即加入'}</Text>
      </View>
    );
  };

  return (
    <View className="square-page">
      <View className="sq-search-bar">
        <Input
          className="sq-search-input"
          placeholder="搜索约球标题、场地、人名"
          value={searchQuery}
          onInput={(e) => setSearchQuery(e.detail.value)}
          onConfirm={loadPosts}
          confirmType="search"
        />
      </View>

      <View className="sq-tabs">
        {(['recruiting', 'mine'] as const).map((t) => (
          <View
            key={t}
            className={`sq-tab ${activeTab === t ? 'active' : ''}`}
            onClick={() => setActiveTab(t)}
          >
            <Text>{t === 'recruiting' ? '正在招募' : '我的约球'}</Text>
          </View>
        ))}
      </View>

      <ScrollView className="sq-filters" scrollX>
        {[
          { label: '水平', value: levelFilter, options: LEVELS, setter: setLevelFilter },
          { label: '时间', value: timeFilter, options: TIMES, setter: setTimeFilter },
        ].map((f) => (
          <View
            key={f.label}
            className="sq-filter-btn"
            onClick={() => {
              const idx = f.options.indexOf(f.value);
              f.setter(f.options[(idx + 1) % f.options.length]);
            }}
          >
            <Text className="sq-filter-text">{f.label}: {f.value}</Text>
          </View>
        ))}
      </ScrollView>

      <ScrollView className="sq-list" scrollY enableFlex>
        {loading ? (
          <View className="sq-empty"><Text>加载中...</Text></View>
        ) : posts.length === 0 ? (
          <View className="sq-empty">
            <Text>{activeTab === 'mine' ? '暂无我的约球，去发布一条吧' : '暂无招募信息'}</Text>
          </View>
        ) : (
          posts.map((post) => (
            <View key={post.id} className="sq-card" onClick={() => goDetail(post)}>
              <View className="sq-card-status" style={{ background: getStatusColor(post) }}>
                <Text className="sq-status-text">{post.status}</Text>
              </View>
              <View className="sq-card-body">
                <View className="sq-organizer">
                  {post.organizerAvatar ? (
                    <Image className="sq-organizer-avatar" src={post.organizerAvatar} mode="aspectFill" />
                  ) : (
                    <View className="sq-organizer-avatar sq-organizer-placeholder">
                      <Text>{post.organizerName.slice(0, 1)}</Text>
                    </View>
                  )}
                  <View className="sq-organizer-info">
                    <Text className="sq-organizer-name">{post.organizerName}</Text>
                    <Text className="sq-organizer-level">{post.organizerLevel}</Text>
                  </View>
                  {post.requireApproval && (
                    <Text className="sq-approval-hint">需审批</Text>
                  )}
                </View>
                <Text className="sq-card-title">{post.title}</Text>
                <View className="sq-card-meta">
                  <Text className="sq-meta-item">📍 {post.locationName}</Text>
                  <Text className="sq-meta-item">🕐 {post.timeStr}</Text>
                  <Text className="sq-meta-item">👥 {post.joinedCount}/{post.totalCapacity}人</Text>
                  <Text className="sq-meta-item">💰 {formatFee(post)}</Text>
                </View>
                {post.participants.length > 0 && (
                  <View className="sq-participants">
                    {post.participants.slice(0, 5).map((avatar, idx) => (
                      <Image key={`${post.id}-${idx}`} className="sq-participant-avatar" src={avatar} mode="aspectFill" />
                    ))}
                    {post.participants.length > 5 && (
                      <Text className="sq-participant-more">+{post.participants.length - 5}</Text>
                    )}
                  </View>
                )}
                {post.description ? (
                  <Text className="sq-card-desc">{post.description}</Text>
                ) : null}
                {renderActionArea(post)}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <View className="sq-fab" onClick={openCreateModal}>
        <Text className="sq-fab-text">+ 发布约球</Text>
      </View>

      {showModal && (
        <View className="sq-modal-mask" onClick={closeModal}>
          <View className="sq-modal" onClick={(e) => e.stopPropagation()}>
            <Text className="sq-modal-title">{editingPost ? '编辑约球' : '发布约球'}</Text>

            <View className="sq-form-item">
              <Text className="sq-form-label">标题</Text>
              <Input
                className="sq-form-input"
                placeholder="例如：周末双打，来高手"
                value={form.title}
                onInput={(e) => setForm({ ...form, title: e.detail.value })}
              />
            </View>

            <View className="sq-form-item">
              <Text className="sq-form-label">场地</Text>
              <Picker
                mode="selector"
                range={courts.map((c) => c.name)}
                value={form.courtIndex}
                onChange={(e) => setForm({ ...form, courtIndex: Number(e.detail.value) })}
              >
                <View className="sq-form-picker">
                  <Text>{courts[form.courtIndex]?.name || '选择场地'}</Text>
                </View>
              </Picker>
            </View>

            <View className="sq-form-row">
              <View className="sq-form-item sq-form-half">
                <Text className="sq-form-label">日期</Text>
                <Picker mode="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.detail.value })}>
                  <View className="sq-form-picker"><Text>{form.date || '选择日期'}</Text></View>
                </Picker>
              </View>
              <View className="sq-form-item sq-form-half">
                <Text className="sq-form-label">时间</Text>
                <Picker mode="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.detail.value })}>
                  <View className="sq-form-picker"><Text>{form.time || '选择时间'}</Text></View>
                </Picker>
              </View>
            </View>

            <View className="sq-form-item">
              <Text className="sq-form-label">人数上限</Text>
              <Input
                className="sq-form-input"
                type="number"
                value={form.capacity}
                onInput={(e) => setForm({ ...form, capacity: e.detail.value })}
              />
            </View>

            <View className="sq-form-item">
              <Text className="sq-form-label">费用类型</Text>
              <View className="sq-fee-types">
                {FEE_TYPES.map((type) => (
                  <View
                    key={type}
                    className={`sq-fee-chip ${form.feeType === type ? 'active' : ''}`}
                    onClick={() => setForm({ ...form, feeType: type, feeValue: type === '免费' ? '0' : form.feeValue })}
                  >
                    <Text>{type}</Text>
                  </View>
                ))}
              </View>
            </View>

            {form.feeType !== '免费' && (
              <View className="sq-form-item">
                <Text className="sq-form-label">{form.feeType === 'AA制' ? '人均费用(元)' : '总费用(元)'}</Text>
                <Input
                  className="sq-form-input"
                  type="number"
                  value={form.feeValue}
                  onInput={(e) => setForm({ ...form, feeValue: e.detail.value })}
                />
              </View>
            )}

            <View className="sq-form-item">
              <Text className="sq-form-label">加入方式</Text>
              <View className="sq-fee-types">
                <View
                  className={`sq-fee-chip ${form.requireApproval ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, requireApproval: true })}
                >
                  <Text>需审批</Text>
                </View>
                <View
                  className={`sq-fee-chip ${!form.requireApproval ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, requireApproval: false })}
                >
                  <Text>直接加入</Text>
                </View>
              </View>
            </View>

            <View className="sq-form-item">
              <Text className="sq-form-label">补充说明</Text>
              <Input
                className="sq-form-input sq-form-textarea"
                placeholder="水平要求、自带球拍等"
                value={form.description}
                onInput={(e) => setForm({ ...form, description: e.detail.value })}
              />
            </View>

            <View className="sq-modal-actions">
              <View className="sq-modal-cancel" onClick={closeModal}><Text>取消</Text></View>
              <View
                className={`sq-modal-submit ${submitting ? 'disabled' : ''}`}
                onClick={submitting ? undefined : handleSubmit}
              >
                <Text>{submitting ? '提交中...' : editingPost ? '保存修改' : '立即发布'}</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
