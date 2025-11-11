import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'users' })
@Unique(['email'])
@Unique(['phone'])
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nickname?: string;

  @Column({ type: 'text', nullable: true })
  avatarUrl?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  preferredLanguage?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity({ name: 'user_profiles' })
export class UserProfileEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ type: 'varchar', length: 120, nullable: true })
  nationality?: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  residenceCity?: string;

  @Column({ type: 'jsonb', nullable: true })
  preferencesJson?: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  personaTags?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity({ name: 'user_auth_providers' })
@Index(['provider', 'providerUserId'], { unique: true })
export class UserAuthProviderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ type: 'varchar', length: 50 })
  provider!: string;

  @Column({ type: 'varchar', length: 255 })
  providerUserId!: string;

  @Column({ type: 'text', nullable: true })
  authToken?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  linkedAt!: Date;
}

@Entity({ name: 'user_settings' })
export class UserSettingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true })
  userId!: string;

  @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ type: 'jsonb', nullable: true })
  notifyPreferencesJson?: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  experimentFlagsJson?: Record<string, unknown>;

  @Column({ type: 'boolean', default: true })
  autoGenerateSafetyNotice!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
