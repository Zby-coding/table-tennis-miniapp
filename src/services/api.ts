import Taro from '@tarojs/taro';

// 你的局域网IP — 手机和电脑必须在同一 WiFi
const BASE_URL = 'http://192.168.0.101:3010/api';

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

// ── 通用请求 ──
async function request<T = any>(path: string, options: {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  data?: any;
  auth?: boolean;
} = {}): Promise<{ code: number; data: T; message: string }> {
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
      Taro.removeStorageSync('token');
      _token = '';
      Taro.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
    }

    return res.data as any;
  } catch (err) {
    console.error(`[API] ${method} ${path} error:`, err);
    throw err;
  }
}

// ── 认证 ──
export function login(code: string, nickname?: string, avatarUrl?: string) {
  return request<any>('/auth/login', {
    method: 'POST',
    data: { code, nickname, avatarUrl },
    auth: false,
  });
}

// ── 用户 ──
export function getUserProfile() {
  return request<any>('/user/profile');
}

// ── 场地 ──
export function getNearbyCourts(lat: number, lng: number, filters?: {
  isFree?: boolean;
  isIndoor?: boolean;
  hasLighting?: boolean;
  keyword?: string;
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
  const params = keyword ? `?keyword=${encodeURIComponent(keyword)}` : '';
  return request<any[]>(`/posts${params}`);
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
    header: { 'Authorization': `Bearer ${getToken()}` },
  });
}
