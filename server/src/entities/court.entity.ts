import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, OneToMany, Index,
} from 'typeorm';
import { User } from './user.entity';
import { CourtReview } from './court-review.entity';
import { Favorite } from './favorite.entity';
import { CourtEnrichmentMeta } from './court-enrichment.types';

@Entity('courts')
@Index('idx_location', ['lat', 'lng'])
export class Court {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  @Column({ type: 'varchar', length: 512 })
  address: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lng: number;

  @Column({ type: 'tinyint', default: 1 })
  tableCount: number;

  @Column({ type: 'varchar', length: 64, default: '水泥' })
  material: string;

  @Column({ type: 'tinyint', default: 0 })
  hasLighting: boolean;

  @Column({ type: 'tinyint', default: 0 })
  isIndoor: boolean;

  @Column({ type: 'tinyint', default: 1 })
  isFree: boolean;

  @Column({ type: 'varchar', length: 128, default: '全天' })
  openHours: string;

  @Column({ type: 'simple-json', nullable: true })
  photos: string[];

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'simple-json', nullable: true })
  facilityPhotos: string[];

  @Column({ type: 'simple-json', nullable: true })
  enrichmentMeta: CourtEnrichmentMeta;

  @Column({ type: 'decimal', precision: 3, scale: 1, default: 5.0 })
  rating: number;

  @Column({ type: 'int', default: 0 })
  reviewCount: number;

  @Column({ type: 'simple-json', nullable: true })
  features: string[];

  @Column({ type: 'tinyint', default: 1 })
  status: number; // 1=正常 0=已拆除

  @Column({ type: 'bigint', nullable: true })
  contributorId: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  city: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'contributorId' })
  contributor: User;

  @OneToMany(() => CourtReview, (r) => r.court)
  reviews: CourtReview[];

  @OneToMany(() => Favorite, (f) => f.court)
  favorites: Favorite[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
