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

  @Column({ type: 'jsonb', nullable: true })
  preferences?: Record<string, unknown>;

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

  @Column({ type: 'uuid' })
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

  @Column({ type: 'uuid' })
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

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

