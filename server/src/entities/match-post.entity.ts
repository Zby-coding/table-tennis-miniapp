import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, OneToMany, Index,
} from 'typeorm';
import { User } from './user.entity';
import { Court } from './court.entity';
import { PostJoin } from './post-join.entity';

export enum PostStatus {
  RECRUITING = 'recruiting',
  FULL = 'full',
  FINISHED = 'finished',
  CANCELLED = 'cancelled',
}

@Entity('match_posts')
@Index(['courtId', 'status'])
export class MatchPost {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @Column({ type: 'integer' })
  userId: number;

  @Column({ type: 'integer' })
  courtId: number;

  @Column({ type: 'varchar', length: 256 })
  title: string;

  @Column({ type: 'int', default: 2 })
  totalCapacity: number;

  @Column({ type: 'int', default: 1 })
  joinedCount: number;

  @Column({ type: 'datetime' })
  startTime: Date;

  @Column({ type: 'varchar', length: 16, default: '免费' })
  feeType: string;

  @Column({ type: 'int', default: 0 })
  feeValue: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 16, default: 'recruiting' })
  status: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  organizer: User;

  @ManyToOne(() => Court)
  @JoinColumn({ name: 'courtId' })
  court: Court;

  @OneToMany(() => PostJoin, (j) => j.post)
  joins: PostJoin[];

  @CreateDateColumn()
  createdAt: Date;
}
