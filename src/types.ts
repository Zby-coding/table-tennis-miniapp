export type LevelType = 'L1 萌新' | 'L2 进阶' | 'L3 高级' | 'Pro 大神';

export interface MatchPost {
  id: string;
  organizerName: string;
  organizerAvatar: string;
  organizerLevel: LevelType;
  title: string;
  locationName: string;
  timeStr: string;
  joinedCount: number;
  totalCapacity: number;
  feeType: 'AA制' | '免费' | '付费';
  feeValue: number;
  description: string;
  status: string;
  participants: string[];
  isJoinedByMe?: boolean;
  createdAt?: string;
}

export interface CourtReview {
  id: string;
  reviewerName: string;
  reviewerAvatar: string;
  reviewerLevel: string;
  timeStr: string;
  rating: number;
  content: string;
  images: string[];
}

export interface Court {
  id: number;
  name: string;
  isFree: boolean;
  isIndoor: boolean;
  activePlayers: number;
  distanceStr: string;
  tableCount: number;
  material: string;
  hasLighting: boolean;
  openHours: string;
  photo: string;
  galleryImages: string[];
  lat: number;
  lng: number;
  rating: number;
  address: string;
  features: string[];
  reviews: CourtReview[];
}

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  icon: string;
  color: string;
  unlocked: boolean;
}

export interface UserProfile {
  username: string;
  nickname?: string;
  level: string;
  levelBadge: string;
  avatarUrl: string;
  hoursPlayed: number;
  winRate: number;
  points: number;
  achievements: Achievement[];
}

export interface GameRecord {
  id: string;
  opponentName: string;
  opponentLevel: LevelType;
  opponentAvatar: string;
  matchTime: string;
  myScore: number;
  opponentScore: number;
  isWin: boolean;
  locationName: string;
}
