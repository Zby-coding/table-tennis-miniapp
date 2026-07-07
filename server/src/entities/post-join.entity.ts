import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { User } from './user.entity';
import { MatchPost } from './match-post.entity';

@Entity('post_joins')
@Unique(['postId', 'userId'])
export class PostJoin {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @Column({ type: 'integer' })
  postId: number;

  @Column({ type: 'integer' })
  userId: number;

  @Column({ type: 'varchar', length: 16, default: 'approved' })
  status: string;

  @ManyToOne(() => MatchPost, (p) => p.joins)
  @JoinColumn({ name: 'postId' })
  post: MatchPost;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
