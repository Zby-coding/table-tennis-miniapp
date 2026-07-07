import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index, Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Court } from './court.entity';

@Entity('favorites')
@Unique(['userId', 'courtId'])
export class Favorite {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @Column({ type: 'integer' })
  userId: number;

  @Column({ type: 'integer' })
  courtId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Court)
  @JoinColumn({ name: 'courtId' })
  court: Court;

  @CreateDateColumn()
  createdAt: Date;
}
