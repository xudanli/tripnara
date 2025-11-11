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
import { JourneyTemplateEntity } from './journey-template.entity';
import { UserEntity } from './user.entity';

export type JourneyStatus = 'draft' | 'generated' | 'archived' | 'shared';
export type JourneyMode = 'inspiration' | 'planner' | 'seeker';

@Entity({ name: 'journeys' })
@Index(['userId', 'status'])
export class JourneyEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @Column({ type: 'uuid', nullable: true })
  templateId?: string;

  @ManyToOne(() => JourneyTemplateEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'template_id' })
  template?: JourneyTemplateEntity;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: JourneyStatus;

  @Column({ type: 'varchar', length: 20, default: 'inspiration' })
  mode!: JourneyMode;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title?: string;

  @Column({ type: 'text', nullable: true })
  coverImage?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  destination?: string;

  @Column({ type: 'date', nullable: true })
  startDate?: string;

  @Column({ type: 'date', nullable: true })
  endDate?: string;

  @Column({ type: 'int', nullable: true })
  durationDays?: number;

  @Column({ type: 'text', nullable: true })
  summary?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  coreInsight?: string;

  @Column({ type: 'jsonb', nullable: true })
  safetyNotice?: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  journeyBackground?: Record<string, unknown>[];

  @Column({ type: 'jsonb', nullable: true })
  personaProfile?: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  journeyDesign?: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  tasks?: Record<string, unknown>[];

  @Column({ type: 'jsonb', nullable: true })
  budgetInfo?: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  sources?: Record<string, unknown>;

  @OneToMany(() => JourneyDayEntity, (day) => day.journey, { cascade: true })
  days!: JourneyDayEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity({ name: 'journey_days' })
@Index(['journeyId', 'dayNumber'])
export class JourneyDayEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  journeyId!: string;

  @ManyToOne(() => JourneyEntity, (journey) => journey.days, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'journey_id' })
  journey!: JourneyEntity;

  @Column({ type: 'int' })
  dayNumber!: number;

  @Column({ type: 'date', nullable: true })
  date?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title?: string;

  @Column({ type: 'text', nullable: true })
  summary?: string;

  @Column({ type: 'jsonb', nullable: true })
  detailsJson?: Record<string, unknown>;

  @OneToMany(() => JourneyTimeSlotEntity, (slot) => slot.day, { cascade: true })
  timeSlots!: JourneyTimeSlotEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity({ name: 'journey_time_slots' })
@Index(['dayId', 'sequence'])
export class JourneyTimeSlotEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  dayId!: string;

  @ManyToOne(() => JourneyDayEntity, (day) => day.timeSlots, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'day_id' })
  day!: JourneyDayEntity;

  @Column({ type: 'int' })
  sequence!: number;

  @Column({ type: 'time without time zone', nullable: true })
  startTime?: string;

  @Column({ type: 'int', nullable: true })
  durationMinutes?: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  type?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title?: string;

  @Column({ type: 'jsonb', nullable: true })
  activityHighlights?: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  scenicIntro?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  cost?: string;

  @Column({ type: 'varchar', length: 3, nullable: true })
  currencyCode?: string;

  @Column({ type: 'jsonb', nullable: true })
  locationJson?: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  detailsJson?: Record<string, unknown>;

  @Column({ type: 'varchar', length: 255, nullable: true })
  source?: string;

  @Column({ type: 'boolean', default: true })
  aiGenerated!: boolean;

  @Column({ type: 'boolean', default: false })
  lockedByUser!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
