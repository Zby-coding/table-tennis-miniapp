import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from './user.entity';
import { Court } from './court.entity';

export type BackgroundSubmissionStatus = 'pending' | 'approved' | 'rejected';

@Entity('court_background_submissions')
@Index(['courtId', 'status'])
export class CourtBackgroundSubmission {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @Column({ type: 'int' })
  courtId: number;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'varchar', length: 512 })
  url: string;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: BackgroundSubmissionStatus;

  @Column({ type: 'varchar', length: 256, nullable: true })
  rejectReason: string | null;

  @Column({ type: 'int', nullable: true })
  reviewedBy: number | null;

  @Column({ type: 'datetime', nullable: true })
  reviewedAt: Date | null;

  @ManyToOne(() => Court, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courtId' })
  court: Court;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
