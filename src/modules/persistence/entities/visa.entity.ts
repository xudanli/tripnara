import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export type ApplicantType = 'nationality' | 'permanent_resident';
export type VisaType =
  | 'visa-free'
  | 'visa-on-arrival'
  | 'e-visa'
  | 'visa-required'
  | 'permanent-resident-benefit';

@Entity({ name: 'visa_policies' })
@Unique(['destinationCountryCode', 'applicantType', 'applicantCountryCode'])
@Index(['destinationCountryCode'])
@Index(['applicantType', 'applicantCountryCode'])
@Index(['isActive', 'effectiveDate', 'expiryDate'])
export class VisaPolicyEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'destination_country_code', type: 'varchar', length: 2 })
  destinationCountryCode!: string;

  @Column({ name: 'destination_country_name', type: 'varchar', length: 100 })
  destinationCountryName!: string;

  @Column({
    name: 'applicant_type',
    type: 'varchar',
    length: 20,
  })
  applicantType!: ApplicantType;

  @Column({ name: 'applicant_country_code', type: 'varchar', length: 2 })
  applicantCountryCode!: string;

  @Column({ name: 'applicant_description', type: 'varchar', length: 100 })
  applicantDescription!: string;

  @Column({ name: 'visa_type', type: 'varchar', length: 20 })
  visaType!: VisaType;

  @Column({
    name: 'language',
    type: 'varchar',
    length: 10,
    nullable: true,
    default: 'zh-CN',
  })
  language?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'duration_days', type: 'integer', nullable: true })
  durationDays?: number;

  @Column({ name: 'application_url', type: 'text', nullable: true })
  applicationUrl?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'effective_date', type: 'date', nullable: true })
  effectiveDate?: Date;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate?: Date;

  @Column({ name: 'updated_by', type: 'varchar', length: 100, nullable: true })
  updatedBy?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'last_updated_at', type: 'timestamptz' })
  lastUpdatedAt!: Date;
}

@Entity({ name: 'visa_unions' })
@Index(['unionKey'], { unique: true })
export class VisaUnionEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'union_key', type: 'varchar', length: 50, unique: true })
  unionKey!: string;

  @Column({ name: 'union_name', type: 'varchar', length: 100 })
  unionName!: string;

  @Column({ name: 'visa_name', type: 'varchar', length: 100 })
  visaName!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => VisaUnionCountryEntity, (country) => country.union)
  countries!: VisaUnionCountryEntity[];
}

@Entity({ name: 'visa_union_countries' })
@Unique(['unionId', 'countryCode'])
@Index(['unionId'])
@Index(['countryCode'])
export class VisaUnionCountryEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'union_id', type: 'integer' })
  unionId!: number;

  @ManyToOne(() => VisaUnionEntity, (union) => union.countries, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'union_id' })
  union!: VisaUnionEntity;

  @Column({ name: 'country_code', type: 'varchar', length: 2 })
  countryCode!: string;

  @Column({ name: 'country_name', type: 'varchar', length: 100 })
  countryName!: string;
}

@Entity({ name: 'visa_policy_history' })
@Index(['policyId'])
@Index(['changedAt'])
export class VisaPolicyHistoryEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'policy_id', type: 'integer' })
  policyId!: number;

  @Column({ type: 'varchar', length: 20 })
  action!: 'created' | 'updated' | 'deleted';

  @Column({ name: 'old_data', type: 'jsonb', nullable: true })
  oldData?: Record<string, unknown>;

  @Column({ name: 'new_data', type: 'jsonb', nullable: true })
  newData?: Record<string, unknown>;

  @Column({ name: 'changed_by', type: 'varchar', length: 100, nullable: true })
  changedBy?: string;

  @CreateDateColumn({ name: 'changed_at', type: 'timestamptz' })
  changedAt!: Date;
}

