import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
  } from 'typeorm';
  // 关键修复：仅类型导入，避免运行时 import
  import type { JourneyGenerationStage } from '../../journey/dto/journey-generation.dto';
  
  export type JobStatus = 'running' | 'completed' | 'failed';
  
  @Entity('ai_generation_job')
  export class AiGenerationJobEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
  
    @Index()
    @Column({ type: 'uuid' })
    journeyId!: string;
  
    @Column({ type: 'varchar', length: 32 })
    status!: JobStatus;
  
    @Column({ type: 'text', nullable: true })
    errorMessage?: string | null;
  
    @CreateDateColumn({ type: 'timestamptz' })
    startedAt!: Date;
  
    @Column({ type: 'timestamptz', nullable: true })
    completedAt?: Date | null;
  }
  
  export type LogStatus = 'success' | 'failure';
  
  @Entity('ai_request_log')
  export class AiRequestLogEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
  
    @Index()
    @Column({ type: 'uuid' })
    journeyId!: string;
  
    @Column({ type: 'varchar', length: 64 })
    module!: JourneyGenerationStage;
  
    @Column({ type: 'varchar', length: 16 })
    status!: LogStatus;
  
    @Column({ type: 'jsonb' })
    promptJson!: Record<string, unknown>;
  
    @Column({ type: 'jsonb', nullable: true })
    responseRaw?: Record<string, unknown> | null;
  
    @Column({ type: 'text', nullable: true })
    errorMessage?: string | null;
  
    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;
  }
  
  @Entity({ name: 'ai_safety_notice_cache' })
  @Index(['cacheKey'], { unique: true })
  export class AiSafetyNoticeCacheEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
  
    @Column({ type: 'varchar', length: 255, name: 'cache_key' })
    cacheKey!: string;
  
    @Column({ type: 'text' })
    noticeText!: string;
  
    @Column({ type: 'varchar', length: 10 })
    lang!: string;
  
    @Column({ type: 'jsonb', nullable: true })
    metadata?: Record<string, unknown>;
  
    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;
  
    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt!: Date;
  }
  