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

// 开发环境: 局域网IP (仅开发时用；优先使用 TARO_APP_API_BASE)
const LAN_IP = '192.168.0.102';
const PORT = '3017';
const LAN_BASE = `http://${LAN_IP}:${PORT}/api`;
const ENV_API_BASE = (typeof process !== 'undefined' && process.env && process.env.TARO_APP_API_BASE) || '';
const NODE_ENV = (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) || '';
if (!ENV_API_BASE && NODE_ENV === 'production') {
  console.error('[API] 生产构建缺少 TARO_APP_API_BASE，请配置 HTTPS 合法域名');
}
const BASE_URL = (ENV_API_BASE && String(ENV_API_BASE).trim()
  ? String(ENV_API_BASE).trim()
  : LAN_BASE
).replace(/\/$/, '');

export function getApiBaseUrl() {
  return BASE_URL;
}

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

export function clearToken() {
  _token = '';
  try {
    Taro.removeStorageSync('token');
  } catch {
    // ignore
  }
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
      clearToken();
      Taro.showToast({ title: '请重新登录', icon: 'none' });
      Taro.reLaunch({ url: '/pages/index/index' });
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
        content: `请将 ${LAN_IP}:${PORT} 添加到微信小程序 request 合法域名白名单\n或在开发者工具中关闭"不校验合法域名"`,
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

export function updateUserProfile(data: { nickname?: string; avatarUrl?: string; style?: string; city?: string; level?: number }) {
  return request('/user/profile', { method: 'PATCH', data });
}

export function updateUserPreferences(data: { remindMatch?: boolean; remindSignIn?: boolean; showActivity?: boolean }) {
  return request('/user/preferences', { method: 'PATCH', data });
}

// ── 场地 ──
export function getNearbyCourts(lat: number, lng: number, filters?: {
  isFree?: boolean; isIndoor?: boolean; hasLighting?: boolean; keyword?: string;
}) {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng), radius: '10000' });
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

export function getCheckinHistory(page = 1, pageSize = 20) {
  return request<any>(`/checkin/history?page=${page}&pageSize=${pageSize}`);
}

export function getCourtActiveCount(courtId: number) {
  return request<any>(`/checkin/court/${courtId}`);
}

export function getBackgroundEligibility(courtId: number) {
  return request<any>(`/courts/${courtId}/background-eligibility`);
}

export function submitCourtBackground(courtId: number, url: string) {
  return request(`/courts/${courtId}/backgrounds`, { method: 'POST', data: { url } });
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
export function uploadFile(filePath: string): Promise<{ code: number; data: { url: string }; message: string }> {
  return new Promise((resolve, reject) => {
    Taro.uploadFile({
      url: `${BASE_URL}/upload`,
      filePath,
      name: 'file',
      header: { Authorization: `Bearer ${getToken()}` },
      success: (res) => {
        try {
          const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
          resolve(data);
        } catch (err) {
          reject(err);
        }
      },
      fail: reject,
    });
  });
}
