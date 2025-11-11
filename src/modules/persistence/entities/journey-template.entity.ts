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

export type TemplateStatus = 'draft' | 'published' | 'archived';
export type TemplateMode = 'inspiration' | 'planner' | 'seeker';

@Entity({ name: 'journey_templates' })
export class JourneyTemplateEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: TemplateStatus;

  @Column({ type: 'varchar', length: 20, default: 'inspiration' })
  mode!: TemplateMode;

  @Column({ name: 'mode_primary', type: 'varchar', length: 50, nullable: true })
  modePrimary?: string;

  @Column({ name: 'mode_tags', type: 'varchar', length: 255, nullable: true })
  modeTags?: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ name: 'cover_image', type: 'text', nullable: true })
  coverImage?: string;

  @Column({ name: 'duration_days', type: 'int', nullable: true })
  durationDays?: number;

  @Column({ type: 'text', nullable: true })
  summary?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'core_insight', type: 'text', nullable: true })
  coreInsight?: string;

  @Column({ name: 'safety_notice_default', type: 'jsonb', nullable: true })
  safetyNoticeDefault?: Record<string, unknown>;

  @Column({ name: 'journey_background', type: 'jsonb', nullable: true })
  journeyBackground?: Record<string, unknown>[];

  @Column({ name: 'persona_profile', type: 'jsonb', nullable: true })
  personaProfile?: Record<string, unknown>;

  @Column({ name: 'journey_design', type: 'jsonb', nullable: true })
  journeyDesign?: Record<string, unknown>;

  @Column({ name: 'tasks_default', type: 'jsonb', nullable: true })
  tasksDefault?: Record<string, unknown>[];

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;

  @OneToMany(() => TemplateDayEntity, (day) => day.template, { cascade: true })
  days!: TemplateDayEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity({ name: 'template_days' })
@Index(['templateId', 'dayNumber'])
export class TemplateDayEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'template_id', type: 'uuid' })
  templateId!: string;

  @ManyToOne(() => JourneyTemplateEntity, (template) => template.days, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'template_id' })
  template!: JourneyTemplateEntity;

  @Column({ name: 'day_number', type: 'int' })
  dayNumber!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title?: string;

  @Column({ type: 'text', nullable: true })
  summary?: string;

  @Column({ name: 'details_json', type: 'jsonb', nullable: true })
  detailsJson?: Record<string, unknown>;

  @OneToMany(() => TemplateTimeSlotEntity, (slot) => slot.day, {
    cascade: true,
  })
  timeSlots!: TemplateTimeSlotEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity({ name: 'template_time_slots' })
@Index(['dayId', 'sequence'])
export class TemplateTimeSlotEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'day_id', type: 'uuid' })
  dayId!: string;

  @ManyToOne(() => TemplateDayEntity, (day) => day.timeSlots, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'day_id' })
  day!: TemplateDayEntity;

  @Column({ type: 'int' })
  sequence!: number;

  @Column({
    name: 'start_time',
    type: 'time without time zone',
    nullable: true,
  })
  startTime?: string;

  @Column({ name: 'duration_minutes', type: 'int', nullable: true })
  durationMinutes?: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  type?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title?: string;

  @Column({ name: 'activity_highlights', type: 'jsonb', nullable: true })
  activityHighlights?: Record<string, unknown>;

  @Column({ name: 'scenic_intro', type: 'text', nullable: true })
  scenicIntro?: string;

  @Column({ name: 'location_json', type: 'jsonb', nullable: true })
  locationJson?: Record<string, unknown>;

  @Column({ name: 'details_json', type: 'jsonb', nullable: true })
  detailsJson?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
