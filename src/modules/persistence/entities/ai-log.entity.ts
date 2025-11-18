import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
  } from 'typeorm';
  
  export type JobStatus = 'running' | 'completed' | 'failed';
  
  @Entity('ai_generation_job')
  export class AiGenerationJobEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
  
    @Index()
  @Column({ type: 'uuid', nullable: true })
  resourceId?: string; // 通用资源ID，不再特定于journey
  
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
  @Column({ type: 'uuid', nullable: true })
  resourceId?: string; // 通用资源ID，不再特定于journey
  
    @Column({ type: 'varchar', length: 64 })
  module!: string; // 模块名称，不再使用JourneyGenerationStage
  
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
  