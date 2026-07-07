import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from './user.entity';
import { Court } from './court.entity';

@Entity('checkins')
@Index(['userId', 'courtId'])
export class CheckIn {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @Column({ type: 'integer' })
  userId: number;

  @Column({ type: 'integer' })
  courtId: number;

  @Column({ type: 'datetime' })
  startTime: Date;

  @Column({ type: 'datetime', nullable: true })
  endTime: Date;

  @Column({ type: 'int', default: 0 })
  duration: number; // 分钟

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  checkinLat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  checkinLng: number;

  @Column({ type: 'tinyint', default: 1 })
  status: number; // 1=进行中 2=已结束 3=超时自动结束

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Court)
  @JoinColumn({ name: 'courtId' })
  court: Court;

  @CreateDateColumn()
  createdAt: Date;
}
