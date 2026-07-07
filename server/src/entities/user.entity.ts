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

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @Column({ type: 'varchar', length: 64, unique: true })
  openid: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  unionid: string;

  @Column({ type: 'varchar', length: 128, default: '球友' })
  nickname: string;

  @Column({ type: 'text', nullable: true })
  avatarUrl: string;

  @Column({ type: 'int', default: UserLevel.L1 })
  level: number;

  @Column({ type: 'varchar', length: 32, nullable: true })
  style: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  city: string;

  @Index()
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  homeLat: number;

  @Index()
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  homeLng: number;

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
