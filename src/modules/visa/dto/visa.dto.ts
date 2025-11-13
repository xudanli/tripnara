import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsInt,
  Min,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import type {
  ApplicantType,
  VisaType,
} from '../../persistence/entities/visa.entity';

export class GetVisaInfoQueryDto {
  @ApiProperty({ description: '目的地国家代码（ISO 3166-1 alpha-2）' })
  @IsString()
  @IsNotEmpty()
  destinationCountry!: string;

  @ApiPropertyOptional({ description: '用户国籍代码（ISO 3166-1 alpha-2）' })
  @IsOptional()
  @IsString()
  nationalityCode?: string;

  @ApiPropertyOptional({
    description: '永久居民身份国家代码（ISO 3166-1 alpha-2）',
  })
  @IsOptional()
  @IsString()
  permanentResidencyCode?: string;
}

export interface VisaInfo {
  destinationCountry: string;
  destinationName: string;
  visaType: VisaType;
  applicableTo: string;
  description?: string;
  duration?: number;
  applicationUrl?: string;
}

export class MultiDestinationAnalysisRequestDto {
  @ApiProperty({
    description: '目的地国家代码数组（ISO 3166-1 alpha-2）',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  destinationCountries!: string[];

  @ApiPropertyOptional({ description: '用户国籍代码' })
  @IsOptional()
  @IsString()
  nationalityCode?: string;

  @ApiPropertyOptional({ description: '永久居民身份国家代码' })
  @IsOptional()
  @IsString()
  permanentResidencyCode?: string;
}

export interface RequiredVisa {
  name: string;
  description: string;
  countries: string[];
  visaInfo: VisaInfo[];
}

export interface UnionGroup {
  unionName: string;
  description: string;
  countries: string[];
}

export interface MultiDestinationAnalysisResponse {
  allCountries: string[];
  requiredVisas: RequiredVisa[];
  groupedByUnion: Record<string, UnionGroup>;
  summary: string;
}

export class CreateVisaPolicyDto {
  @ApiProperty({ description: '目的地国家代码' })
  @IsString()
  @MaxLength(2)
  destinationCountryCode!: string;

  @ApiProperty({ description: '目的地国家名称（中文）' })
  @IsString()
  @MaxLength(100)
  destinationCountryName!: string;

  @ApiProperty({
    description: '申请人类型',
    enum: ['nationality', 'permanent_resident'],
  })
  @IsEnum(['nationality', 'permanent_resident'])
  applicantType!: ApplicantType;

  @ApiProperty({ description: '申请人国籍/永久居民国家代码' })
  @IsString()
  @MaxLength(2)
  applicantCountryCode!: string;

  @ApiProperty({ description: '申请人描述（如：中国护照、美国永久居民）' })
  @IsString()
  @MaxLength(100)
  applicantDescription!: string;

  @ApiProperty({
    description: '签证类型',
    enum: [
      'visa-free',
      'visa-on-arrival',
      'e-visa',
      'visa-required',
      'permanent-resident-benefit',
    ],
  })
  @IsEnum([
    'visa-free',
    'visa-on-arrival',
    'e-visa',
    'visa-required',
    'permanent-resident-benefit',
  ])
  visaType!: VisaType;

  @ApiPropertyOptional({ description: '详细说明' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '停留期限（天数）' })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

  @ApiPropertyOptional({ description: '申请链接' })
  @IsOptional()
  @IsString()
  applicationUrl?: string;

  @ApiPropertyOptional({ description: '是否生效', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '生效日期' })
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @ApiPropertyOptional({ description: '失效日期' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ description: '更新人' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  updatedBy?: string;
}

export class UpdateVisaPolicyDto {
  @ApiPropertyOptional({ description: '目的地国家代码' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  destinationCountryCode?: string;

  @ApiPropertyOptional({ description: '目的地国家名称（中文）' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  destinationCountryName?: string;

  @ApiPropertyOptional({
    description: '申请人类型',
    enum: ['nationality', 'permanent_resident'],
  })
  @IsOptional()
  @IsEnum(['nationality', 'permanent_resident'])
  applicantType?: ApplicantType;

  @ApiPropertyOptional({ description: '申请人国籍/永久居民国家代码' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  applicantCountryCode?: string;

  @ApiPropertyOptional({ description: '申请人描述' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  applicantDescription?: string;

  @ApiPropertyOptional({
    description: '签证类型',
    enum: [
      'visa-free',
      'visa-on-arrival',
      'e-visa',
      'visa-required',
      'permanent-resident-benefit',
    ],
  })
  @IsOptional()
  @IsEnum([
    'visa-free',
    'visa-on-arrival',
    'e-visa',
    'visa-required',
    'permanent-resident-benefit',
  ])
  visaType?: VisaType;

  @ApiPropertyOptional({ description: '详细说明' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '停留期限（天数）' })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

  @ApiPropertyOptional({ description: '申请链接' })
  @IsOptional()
  @IsString()
  applicationUrl?: string;

  @ApiPropertyOptional({ description: '是否生效' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '生效日期' })
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @ApiPropertyOptional({ description: '失效日期' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ description: '更新人' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  updatedBy?: string;
}

export class VisaPolicyQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ description: '目的地国家代码' })
  @IsOptional()
  @IsString()
  destinationCountryCode?: string;

  @ApiPropertyOptional({ description: '申请人类型' })
  @IsOptional()
  @IsEnum(['nationality', 'permanent_resident'])
  applicantType?: ApplicantType;

  @ApiPropertyOptional({ description: '申请人国家代码' })
  @IsOptional()
  @IsString()
  applicantCountryCode?: string;

  @ApiPropertyOptional({ description: '签证类型' })
  @IsOptional()
  @IsEnum([
    'visa-free',
    'visa-on-arrival',
    'e-visa',
    'visa-required',
    'permanent-resident-benefit',
  ])
  visaType?: VisaType;

  @ApiPropertyOptional({ description: '是否生效' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

