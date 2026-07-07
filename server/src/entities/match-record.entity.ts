import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('match_records')
export class MatchRecord {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @Index()
  @Column({ type: 'integer' })
  winnerId: number;

  @Index()
  @Column({ type: 'integer' })
  loserId: number;

  @Column({ type: 'bigint', nullable: true })
  courtId: number;

  @Column({ type: 'int', default: 0 })
  winnerScore: number;

  @Column({ type: 'int', default: 0 })
  loserScore: number;

  @Column({ type: 'varchar', length: 256, nullable: true })
  locationName: string;

  @Column({ type: 'datetime', nullable: true })
  playedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'winnerId' })
  winner: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'loserId' })
  loser: User;

  @CreateDateColumn()
  createdAt: Date;
}
