export type LevelType = 'L1 萌新' | 'L2 进阶' | 'L3 高级' | 'Pro 大神';

export type JoinStatusType = 'approved' | 'pending' | 'rejected' | null;

export interface PostMember {
  joinId: number;
  userId: number;
  nickname: string;
  avatar: string;
  level: LevelType;
  status: 'approved' | 'pending' | 'rejected';
  isOrganizer: boolean;
}

export interface MatchPost {
  id: string;
  courtId?: number;
  organizerName: string;
  organizerAvatar: string;
  organizerLevel: LevelType;
  title: string;
  locationName: string;
  timeStr: string;
  startTime?: string;
  joinedCount: number;
  totalCapacity: number;
  feeType: 'AA制' | '免费' | '付费';
  feeValue: number;
  description: string;
  status: string;
  requireApproval?: boolean;
  pendingCount?: number;
  participants: string[];
  isJoinedByMe?: boolean;
  isPendingByMe?: boolean;
  myJoinStatus?: JoinStatusType;
  isOrganizerByMe?: boolean;
  createdAt?: string;
}

export interface MatchPostDetail extends MatchPost {
  courtAddress?: string;
  courtLat?: number | null;
  courtLng?: number | null;
  members?: PostMember[];
  pendingMembers?: PostMember[];
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
  livePhotos?: string[];
  facilityPhotos?: string[];
  description?: string;
  photoSource?: PhotoSource;
  enrichmentMeta?: CourtEnrichmentMeta | null;
  canContribute?: boolean;
  showStockHint?: boolean;
  approvedCount?: number;
  lat: number;
  lng: number;
  rating: number;
  address: string;
  features: string[];
  reviews: CourtReview[];
  venueType?: string;
  coordVerified?: boolean;
}

export type PhotoSource = 'platform' | 'stock' | 'mixed';

export interface CourtEnrichmentMeta {
  sources: string[];
  enrichedAt: string;
  searchQuery: string;
  confidence: 'high' | 'medium' | 'low';
  photoSource?: PhotoSource;
}

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  icon: string;
  iconUrl?: string | null;
  color?: string;
  unlocked: boolean;
  ruleValue?: number;
  points?: number;
}

export interface UserPreferences {
  remindMatch: boolean;
  remindSignIn: boolean;
  showActivity: boolean;
}

export interface UserProfile {
  id?: number;
  username: string;
  nickname?: string;
  level: string;
  levelValue?: number;
  levelBadge: string;
  avatarUrl: string;
  city?: string;
  style?: string;
  role?: 'user' | 'admin';
  status?: 'active' | 'disabled';
  lastActiveAt?: string;
  hoursPlayed: number;
  totalMatches?: number;
  wins?: number;
  winRate: number;
  points: number;
  checkinStreak?: number;
  checkinCount?: number;
  favoriteCount?: number;
  preferences?: UserPreferences;
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
