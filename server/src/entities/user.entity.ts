import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
  OneToMany,
} from 'typeorm';
import { CheckIn } from './checkin.entity';
import { CourtReview } from './court-review.entity';
import { Favorite } from './favorite.entity';
import { MatchRecord } from './match-record.entity';
import { PostJoin } from './post-join.entity';
import { UserAchievement } from './user-achievement.entity';

export enum UserLevel {
  L1 = 1,
  L2 = 2,
  L3 = 3,
  PRO = 4,
}

export enum PlayStyle {
  SHAKEHAND_LOOP = '横拍弧圈',
  PENHOLD_FAST = '直拍快攻',
  CHOPPER = '削球',
  ALL_ROUND = '全能型',
  BEGINNER = '初学',
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @Column({ type: 'varchar', length: 64, unique: true })
  openid: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  unionid: string | null;

  @Column({ type: 'varchar', length: 128, default: '球友' })
  nickname: string;

  @Column({ type: 'text', nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'int', default: UserLevel.L1 })
  level: number;

  @Column({ type: 'varchar', length: 32, nullable: true })
  style: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 16, default: UserRole.USER })
  role: UserRole;

  @Column({ type: 'varchar', length: 16, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ type: 'datetime', nullable: true })
  lastActiveAt: Date | null;

  @Column({ type: 'text', nullable: true })
  adminNote: string | null;

  @Column({ type: 'boolean', default: true })
  remindMatch: boolean;

  @Column({ type: 'boolean', default: true })
  remindSignIn: boolean;

  @Column({ type: 'boolean', default: true })
  showActivity: boolean;

  @Index()
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  homeLat: number | null;

  @Index()
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  homeLng: number | null;

  @Column({ type: 'int', default: 0 })
  totalHours: number;

  @Column({ type: 'int', default: 0 })
  totalMatches: number;

  @Column({ type: 'int', default: 0 })
  wins: number;

  @Column({ type: 'int', default: 0 })
  points: number;

  @Column({ type: 'int', default: 0 })
  checkinStreak: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => CheckIn, (c) => c.user)
  checkins: CheckIn[];

  @OneToMany(() => CourtReview, (r) => r.user)
  reviews: CourtReview[];

  @OneToMany(() => Favorite, (f) => f.user)
  favorites: Favorite[];

  @OneToMany(() => MatchRecord, (m) => m.winner)
  wonMatches: MatchRecord[];

  @OneToMany(() => MatchRecord, (m) => m.loser)
  lostMatches: MatchRecord[];

  @OneToMany(() => PostJoin, (j) => j.user)
  joins: PostJoin[];

  @OneToMany(() => UserAchievement, (a) => a.user)
  achievements: UserAchievement[];
}
