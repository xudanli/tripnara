import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'destinations' })
@Index(['slug'], { unique: true })
export class DestinationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  slug!: string;

  @Column({ type: 'varchar', length: 3, nullable: true })
  countryCode?: string;

  @Column({ type: 'jsonb', nullable: true })
  geoJson?: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity({ name: 'countries' })
export class CountryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 3, unique: true })
  isoCode!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  visaSummary?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity({ name: 'transport_modes' })
export class TransportModeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity({ name: 'high_altitude_regions' })
export class HighAltitudeRegionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category?: string;

  @Column({ type: 'jsonb', nullable: true })
  geoJson?: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  referenceNote?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity({ name: 'preparation_profiles' })
export class PreparationProfileEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'jsonb' })
  tasks!: Record<string, unknown>[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity({ name: 'media_assets' })
export class MediaAssetEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  url!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  mediaType?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity({ name: 'external_api_keys' })
export class ExternalApiKeyEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  service!: string;

  @Column({ type: 'jsonb' })
  credentials!: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'active' | 'expired' | 'archived';

@Entity({ name: 'travel_alerts' })
@Index(['destination', 'startDate', 'endDate'])
@Index(['status', 'severity'])
export class TravelAlertEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'varchar', length: 255 })
  destination!: string;

  @Column({ type: 'varchar', length: 3, nullable: true })
  countryCode?: string;

  @Column({ type: 'varchar', length: 20 })
  severity!: AlertSeverity;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: AlertStatus;

  @Column({ type: 'timestamptz' })
  startDate!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endDate?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ type: 'uuid', nullable: true })
  createdBy?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

/**
 * 货币信息实体
 */
@Entity({ name: 'currencies' })
@Index(['code'], { unique: true })
export class CurrencyEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 10, unique: true })
  code!: string; // 货币代码，如 'CNY', 'USD'

  @Column({ type: 'varchar', length: 20 })
  symbol!: string; // 货币符号，如 '¥', '$'

  @Column({ type: 'varchar', length: 100 })
  nameZh!: string; // 中文名称

  @Column({ type: 'varchar', length: 100 })
  nameEn!: string; // 英文名称

  @Column({ type: 'boolean', default: true })
  isActive!: boolean; // 是否启用

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>; // 元数据

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

/**
 * 国家货币映射实体
 */
@Entity({ name: 'country_currency_mappings' })
@Index(['countryCode'], { unique: true })
export class CountryCurrencyMappingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 3, unique: true })
  countryCode!: string; // 国家代码（ISO 3166-1 alpha-2），如 'CN', 'US'

  @Column({ type: 'uuid' })
  currencyId!: string; // 货币ID（外键）

  @Column({ type: 'varchar', length: 10 })
  currencyCode!: string; // 货币代码（冗余字段，便于查询）

  @Column({ type: 'jsonb', nullable: true })
  countryNames?: {
    zh?: string[];
    en?: string[];
  }; // 国家名称映射（支持多个名称）

  @Column({ type: 'boolean', default: true })
  isActive!: boolean; // 是否启用

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>; // 元数据

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
