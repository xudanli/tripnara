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

export type JourneyTemplateStatus = 'draft' | 'published' | 'archived';

@Entity({ name: 'journey_templates' })
@Index(['status', 'createdAt'])
export class JourneyTemplateEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  coverImage?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  destination?: string;

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
  journeyBackground?: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  preferences?: Record<string, unknown>;

  @Column({ type: 'varchar', length: 10, default: 'zh-CN' })
  language!: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'draft',
  })
  status!: JourneyTemplateStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => TemplateDayEntity, (day) => day.template, {
    cascade: true,
  })
  days!: TemplateDayEntity[];
}

@Entity({ name: 'template_days' })
@Index(['templateId', 'dayNumber'])
export class TemplateDayEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  templateId!: string;

  @ManyToOne(() => JourneyTemplateEntity, (template) => template.days, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'template_id' })
  template!: JourneyTemplateEntity;

  @Column({ type: 'int' })
  dayNumber!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title?: string;

  @Column({ type: 'text', nullable: true })
  summary?: string;

  @Column({ type: 'jsonb', nullable: true })
  detailsJson?: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => TemplateTimeSlotEntity, (slot) => slot.day, {
    cascade: true,
  })
  timeSlots!: TemplateTimeSlotEntity[];
}

@Entity({ name: 'template_time_slots' })
@Index(['dayId', 'sequence'])
export class TemplateTimeSlotEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  dayId!: string;

  @ManyToOne(() => TemplateDayEntity, (day) => day.timeSlots, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'day_id' })
  day!: TemplateDayEntity;

  @Column({ type: 'int' })
  sequence!: number;

  @Column({ type: 'time', nullable: true })
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

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cost?: number;

  @Column({ type: 'varchar', length: 3, nullable: true })
  currencyCode?: string;

  @Column({ type: 'jsonb', nullable: true })
  locationJson?: { lat: number; lng: number };

  @Column({ type: 'jsonb', nullable: true })
  detailsJson?: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

