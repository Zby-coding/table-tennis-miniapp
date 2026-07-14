import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export type AchievementRuleType = 'checkin_count' | 'manual' | 'legacy';

@Entity('achievement_defs')
export class AchievementDef {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  key: string;

  @Column({ type: 'varchar', length: 64 })
  name: string;

  @Column({ type: 'varchar', length: 256, default: '' })
  desc: string;

  /** Emoji fallback when iconUrl is empty */
  @Column({ type: 'varchar', length: 16, default: '🏅' })
  icon: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  iconUrl: string | null;

  @Column({ type: 'int', default: 10 })
  points: number;

  @Column({ type: 'tinyint', default: 1 })
  enabled: boolean;

  @Column({ type: 'varchar', length: 32, default: 'manual' })
  ruleType: AchievementRuleType;

  /** e.g. checkin count threshold */
  @Column({ type: 'int', default: 0 })
  ruleValue: number;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
