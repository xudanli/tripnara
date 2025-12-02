import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

export type ItineraryStatus = 'draft' | 'published' | 'archived';

@Entity({ name: 'itineraries' })
@Index(['userId', 'status'])
@Index(['userId', 'createdAt'])
export class ItineraryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @Column({ type: 'varchar', length: 255 })
  destination!: string;

  @Column({ type: 'date' })
  startDate!: Date;

  @Column({ type: 'int' })
  daysCount!: number;

  @Column({ type: 'text', nullable: true })
  summary?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalCost?: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  currency?: string; // 货币代码，如 'CHF'

  @Column({ type: 'jsonb', nullable: true })
  currencyInfo?: {
    code: string;
    symbol: string;
    name: string;
  }; // 货币详细信息

  @Column({ type: 'jsonb', nullable: true })
  preferences?: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  tasks?: Array<Record<string, unknown>>;

  @Column({ type: 'jsonb', nullable: true })
  safetyNotice?: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  practicalInfo?: {
    weather?: string;
    safety?: string;
    plugType?: string;
    currency?: string;
    culturalTaboos?: string;
    packingList?: string;
    [key: string]: unknown;
  }; // 实用信息（天气、安全、插座、汇率、文化禁忌、打包清单等）

  @Column({
    type: 'varchar',
    length: 20,
    default: 'draft',
  })
  status!: ItineraryStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => ItineraryDayEntity, (day) => day.itinerary, {
    cascade: true,
  })
  days!: ItineraryDayEntity[];
}

@Entity({ name: 'itinerary_days' })
@Index(['itineraryId', 'day'])
export class ItineraryDayEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // 修复：让 itineraryId 字段映射到 itinerary_id 列，避免字段冲突
  @Column({ type: 'uuid', name: 'itinerary_id' })
  itineraryId!: string;

  @ManyToOne(() => ItineraryEntity, (itinerary) => itinerary.days, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'itinerary_id' })
  itinerary!: ItineraryEntity;

  @Column({ type: 'int' })
  day!: number;

  @Column({ type: 'date' })
  date!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => ItineraryActivityEntity, (activity) => activity.day, {
    cascade: true,
  })
  activities!: ItineraryActivityEntity[];
}

@Entity({ name: 'itinerary_activities' })
@Index(['dayId', 'time'])
export class ItineraryActivityEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // 修复：让 dayId 字段映射到 day_id 列，避免字段冲突
  @Column({ type: 'uuid', name: 'day_id' })
  dayId!: string;

  @ManyToOne(() => ItineraryDayEntity, (day) => day.activities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'day_id' })
  day!: ItineraryDayEntity;

  @Column({ type: 'varchar', length: 10 })
  time!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({
    type: 'varchar',
    length: 50,
  })
  type!:
    | 'attraction'
    | 'meal'
    | 'hotel'
    | 'shopping'
    | 'transport'
    | 'ocean';

  @Column({ type: 'int' })
  duration!: number;

  @Column({ type: 'jsonb' })
  location!: { lat: number; lng: number };

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cost?: number;

  @Column({ type: 'jsonb', nullable: true })
  details?: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

