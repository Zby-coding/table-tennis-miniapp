export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'disabled';

export interface LoginUser {
  id: number;
  nickname: string;
  role: UserRole;
  status: UserStatus;
}

export interface ApiResult<T> {
  code: number;
  data: T;
  message: string;
}

export interface UserListItem {
  id: number;
  nickname: string;
  avatarUrl?: string | null;
  city?: string | null;
  style?: string | null;
  level?: number;
  role: UserRole;
  status: UserStatus;
  totalHours: number;
  totalMatches: number;
  wins: number;
  winRate: number;
  points: number;
  checkinStreak: number;
  lastActiveAt?: string | null;
  createdAt?: string;
}

export interface UserDetail extends UserListItem {
  achievements: number;
  checkins: number;
  joinedPosts: number;
  matches: number;
  adminNote: string;
}

export interface UserOverview {
  totalUsers: number;
  activeUsers: number;
  disabledUsers: number;
  adminUsers: number;
}

export interface UserListResult {
  items: UserListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface UserFilters {
  keyword?: string;
  status?: '' | UserStatus;
  level?: string;
  city?: string;
  page?: number;
  pageSize?: number;
}

export interface AchievementDef {
  id: number;
  key: string;
  name: string;
  desc: string;
  icon: string;
  iconUrl?: string | null;
  points: number;
  enabled: boolean;
  ruleType: string;
  ruleValue: number;
  sortOrder?: number;
}

export interface PagedList<T> {
  total: number;
  page: number;
  pageSize: number;
  list: T[];
}

