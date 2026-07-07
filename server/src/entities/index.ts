import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Court } from './court.entity';
import { MatchPost } from './match-post.entity';
import { User } from './user.entity';
import { CourtReview } from './court-review.entity';
import { Favorite } from './favorite.entity';
import { CheckIn } from './checkin.entity';
import { MatchRecord } from './match-record.entity';
import { PostJoin } from './post-join.entity';
import { UserAchievement } from './user-achievement.entity';

export const entities = [
  User, Court, CheckIn, CourtReview, Favorite,
  MatchPost, PostJoin, MatchRecord, UserAchievement,
];
