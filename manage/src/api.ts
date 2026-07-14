import { AchievementDef, ApiResult, LoginUser, PagedList, UserDetail, UserFilters, UserListResult, UserOverview, UserRole, UserStatus } from './types';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const TOKEN_KEY = 'tt_manage_token';
const UPLOAD_ORIGIN = import.meta.env.VITE_UPLOAD_ORIGIN || 'http://localhost:3017';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function resolveAssetUrl(url?: string | null) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${UPLOAD_ORIGIN}${path}`;
}

async function readPayload(response: Response) {
  const contentType = response.headers.get('Content-Type') || '';
  if (contentType.includes('application/json')) {
    return response.json().catch(() => ({ code: response.status, message: '响应解析失败' }));
  }

  const text = await response.text().catch(() => '');
  if (response.status === 502 || response.status === 503 || response.status === 504) {
    return { code: response.status, message: '后端服务未启动或代理不可用，请确认 server 已在 3017 端口运行' };
  }
  return { code: response.status, message: text || response.statusText || '请求失败' };
}

async function request<T>(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch {
    throw new Error('后端服务未启动或网络不可达，请确认 server 已在 3017 端口运行');
  }

  const payload = await readPayload(response);
  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.message || '请求失败');
  }
  return payload as ApiResult<T>;
}

export async function login(code: string) {
  const result = await request<{ token: string; user: LoginUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
  setToken(result.data.token);
  return result.data.user;
}

export function getOverview() {
  return request<UserOverview>('/admin/users/overview');
}

export function listUsers(filters: UserFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  return request<UserListResult>(`/admin/users?${params.toString()}`);
}

export function getUserDetail(id: number) {
  return request<UserDetail>(`/admin/users/${id}`);
}

export function updateUserStatus(id: number, status: UserStatus) {
  return request<UserDetail>(`/admin/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export function updateUserRole(id: number, role: UserRole) {
  return request<UserDetail>(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
}

export function updateUserNote(id: number, note: string) {
  return request<UserDetail>(`/admin/users/${id}/note`, { method: 'PATCH', body: JSON.stringify({ note }) });
}

export function listAdminCheckins(query: { userId?: number; courtId?: number; page?: number; pageSize?: number }) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== '') params.set(key, String(value));
  });
  return request<PagedList<any>>(`/admin/checkins?${params.toString()}`);
}

export function listAdminFavorites(query: { userId?: number; courtId?: number; page?: number; pageSize?: number }) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== '') params.set(key, String(value));
  });
  return request<PagedList<any>>(`/admin/favorites?${params.toString()}`);
}

export function listAdminAchievements() {
  return request<AchievementDef[]>('/admin/achievements');
}

export function createAchievement(body: Partial<AchievementDef> & { key: string; name: string }) {
  return request<AchievementDef>('/admin/achievements', { method: 'POST', body: JSON.stringify(body) });
}

export function updateAchievement(id: number, body: Partial<AchievementDef>) {
  return request<AchievementDef>(`/admin/achievements/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export function setAchievementEnabled(id: number, enabled: boolean) {
  return request<AchievementDef>(`/admin/achievements/${id}/enabled`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  });
}

export function listAdminBackgrounds(query: { status?: string; page?: number; pageSize?: number }) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  return request<PagedList<any>>(`/admin/court-backgrounds?${params.toString()}`);
}

export function approveBackground(id: number) {
  return request(`/admin/court-backgrounds/${id}/approve`, { method: 'POST', body: '{}' });
}

export function rejectBackground(id: number, reason?: string) {
  return request(`/admin/court-backgrounds/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function uploadAdminFile(file: File) {
  const form = new FormData();
  form.append('file', file);
  const headers = new Headers();
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_BASE}/upload`, { method: 'POST', headers, body: form });
  const payload = await readPayload(response);
  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.message || '上传失败');
  }
  const url = payload.data?.url || '';
  return {
    url,
    absoluteUrl: resolveAssetUrl(url),
  };
}
