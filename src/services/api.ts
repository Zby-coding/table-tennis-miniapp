/**
 * TableTennisPro API Service
 *
 * 小程序网络请求域名白名单:
 *   在微信公众平台 → 开发管理 → 开发设置 → 服务器域名
 *   将以下域名添加到 request 合法域名:
 *     https://your-domain.com
 *     http://192.168.x.x (仅开发环境)
 *
 * 当前开发环境使用局域网IP直连后端:
 *   1. 确保手机和电脑在同一WiFi
 *   2. ipconfig 查询本机IPv4地址
 *   3. 替换下面的 BASE_URL
 */

import Taro from '@tarojs/taro';

// 开发环境: 局域网IP (仅开发时用)
const LAN_IP = '192.168.0.102';
const PORT = '3017';
// Taro 默认 NODE_ENV=development, process.env.NODE_ENV 在小程序中总是 undefined
// 所以直接用三元判断 process.env.NODE_ENV 不生效
// 方案: 硬编码开发地址, 发布时手动改成生产域名
const BASE_URL = `http://${LAN_IP}:${PORT}/api`;
// 上线时替换为: const BASE_URL = 'https://api.tabletennis.cn/api';

// ── Token 管理 ──
let _token = '';

export function setToken(token: string) {
  _token = token;
  Taro.setStorageSync('token', token);
}

export function getToken(): string {
  if (!_token) {
    _token = Taro.getStorageSync('token') || '';
  }
  return _token;
}

// ── 通用请求 (错误处理 + 401 自动重登录) ──
async function request<T = any>(
  path: string,
  options: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; data?: any; auth?: boolean } = {},
): Promise<{ code: number; data: T; message: string }> {
  const { method = 'GET', data, auth = true } = options;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await Taro.request({
      url: `${BASE_URL}${path}`,
      method,
      header: headers,
      data,
      timeout: 10000,
    });

    if (res.statusCode === 401) {
      const hadToken = Boolean(getToken());
      Taro.removeStorageSync('token');
      _token = '';
      if (hadToken) {
      Taro.showToast({ title: '请重新登录', icon: 'none' });
      Taro.reLaunch({ url: '/pages/index/index' });
      }
      throw new Error('Unauthorized');
    }

    return res.data as any;
  } catch (err: any) {
    const msg = err?.errMsg || '网络异常';
    console.warn(`[API] ${method} ${path}`, msg);

    // 域名不在白名单时给出明确提示
    if (msg.includes('url not in domain list')) {
      Taro.showModal({
        title: '开发环境域名提示',
        content: `请将 ${BASE_URL} 添加到微信小程序 request 合法域名白名单\n或在开发者工具中关闭"不校验合法域名"`,
        showCancel: false,
      });
    }

    throw err;
  }
}

// ── 认证 ──
export function login(code: string, nickname?: string, avatarUrl?: string) {
  return request<any>('/auth/login', { method: 'POST', data: { code, nickname, avatarUrl }, auth: false });
}

export function wechatLogin() {
  return Taro.login().then((res) => login(res.code));
}

// ── 用户 ──
export function getUserProfile() {
  return request<any>('/user/profile');
}

export function updateUserProfile(data: { nickname?: string; avatarUrl?: string; style?: string; city?: string }) {
  return request('/user/profile', { method: 'PATCH', data });
}

// ── 场地 ──
export function getNearbyCourts(lat: number, lng: number, filters?: {
  isFree?: boolean; isIndoor?: boolean; hasLighting?: boolean; keyword?: string;
}) {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng), radius: '150000' });
  if (filters?.isFree !== undefined) params.set('isFree', String(filters.isFree));
  if (filters?.isIndoor !== undefined) params.set('isIndoor', String(filters.isIndoor));
  if (filters?.hasLighting !== undefined) params.set('hasLighting', String(filters.hasLighting));
  if (filters?.keyword) params.set('keyword', filters.keyword);
  return request<any[]>(`/courts/nearby?${params.toString()}`);
}

export function getCourtDetail(id: number) {
  return request<any>(`/courts/${id}`);
}

export function addCourtReview(courtId: number, rating: number, content: string, images?: string[]) {
  return request(`/courts/${courtId}/review`, { method: 'POST', data: { rating, content, images } });
}

export function toggleFavorite(courtId: number) {
  return request(`/courts/${courtId}/favorite`, { method: 'POST' });
}

export function getFavorites() {
  return request<any[]>('/courts/user/favorites');
}

export function createCustomCourt(data: { name: string; lat: number; lng: number }) {
  return request('/courts/custom', { method: 'POST', data });
}

// ── 签到 ──
export function checkin(courtId: number, lat: number, lng: number) {
  return request('/checkin/in', { method: 'POST', data: { courtId, lat, lng } });
}

export function checkout() {
  return request('/checkin/out', { method: 'POST' });
}

export function getCheckinStatus() {
  return request<any>('/checkin/status');
}

export function getCourtActiveCount(courtId: number) {
  return request<any>(`/checkin/court/${courtId}`);
}

// ── 约球 ──
export function getPosts(keyword?: string) {
  return request<any[]>(`/posts${keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''}`);
}

export function createPost(data: {
  title: string; courtId: number; startTime: string;
  totalCapacity: number; feeType: string; feeValue: number; description?: string;
}) {
  return request('/posts', { method: 'POST', data });
}

export function joinPost(postId: number) {
  return request(`/posts/${postId}/join`, { method: 'POST' });
}

// ── 战绩 ──
export function getMatchRecords(page = 1) {
  return request<any>(`/matches/records?page=${page}`);
}

export function addMatchRecord(data: {
  loserId: number; winnerScore: number; loserScore: number;
  locationName?: string; courtId?: number;
}) {
  return request('/matches/records', { method: 'POST', data });
}

// ── 附近球友 ──
export function getNearbyPlayers(lat: number, lng: number, radius?: number) {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  if (radius) params.set('radius', String(radius));
  return request<any[]>(`/matches/nearby-players?${params.toString()}`);
}

// ── 成就 ──
export function getAchievements() {
  return request<any[]>('/achievements');
}

// ── 上传 ──
export function uploadFile(filePath: string) {
  return Taro.uploadFile({
    url: `${BASE_URL}/upload`,
    filePath,
    name: 'file',
    header: { Authorization: `Bearer ${getToken()}` },
  });
}



