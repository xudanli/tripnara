import { ApiProperty } from '@nestjs/swagger';

/**
 * 高海拔地区搜索结果 DTO
 */
export class AltitudeRegionDto {
  @ApiProperty({ description: '地区ID', example: 'cn-lasa' })
  id!: string;

  @ApiProperty({ description: '地区名称', example: '拉萨' })
  name!: string;

  @ApiProperty({ description: '别名列表', example: ['Lhasa', 'Lasa'], required: false })
  aliases?: string[];

  @ApiProperty({ description: '国家', example: '中国' })
  country!: string;

  @ApiProperty({ description: '海拔范围', example: '3650m' })
  altitudeRange!: string;

  @ApiProperty({ description: '海拔分类', enum: ['low', 'medium', 'high', 'extreme'], example: 'high' })
  category!: 'low' | 'medium' | 'high' | 'extreme';

  @ApiProperty({ description: '特殊说明', example: '建议到达后休息2-3小时再活动', required: false })
  notes?: string;
}

/**
 * 搜索请求 DTO
 */
export class SearchAltitudeRegionsRequestDto {
  @ApiProperty({ description: '搜索关键词', example: '拉萨' })
  q!: string;
}

/**
 * 搜索响应 DTO
 */
export class SearchAltitudeRegionsResponseDto {
  @ApiProperty({ description: '搜索结果列表', type: [AltitudeRegionDto] })
  results!: AltitudeRegionDto[];
}

/**
 * 风险报告 - 当前天气信息
 */
export class CurrentWeatherDto {
  @ApiProperty({ description: '温度', example: '5°C' })
  temp!: string;

  @ApiProperty({ description: '风速', example: '15 km/h' })
  wind!: string;
}

/**
 * 风险评估 DTO
 */
export class RiskAssessmentDto {
  @ApiProperty({ description: '风险等级', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], example: 'HIGH' })
  level!: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

  @ApiProperty({ description: '颜色代码', example: '#FF4500' })
  colorCode!: string;

  @ApiProperty({ description: '建议', example: '高海拔地区，建议到达后在酒店休息 2-3 小时再活动。' })
  advice!: string;

  @ApiProperty({ description: '标签', example: ['寒冷', '大风'], type: [String] })
  tags!: string[];
}

/**
 * 风险报告请求 DTO
 */
export class GetRiskReportRequestDto {
  @ApiProperty({ description: '地区ID', example: 'cn-lasa' })
  id!: string;
}

/**
 * 风险报告响应 DTO
 */
export class RiskReportResponseDto {
  @ApiProperty({ description: '地区名称', example: '拉萨' })
  regionName!: string;

  @ApiProperty({ description: '海拔范围', example: '3650m' })
  elevation!: string;

  @ApiProperty({ description: '当前天气', type: CurrentWeatherDto })
  currentWeather!: CurrentWeatherDto;

  @ApiProperty({ description: '风险评估', type: RiskAssessmentDto })
  riskAssessment!: RiskAssessmentDto;

  @ApiProperty({ description: '是否来自缓存', example: false })
  fromCache?: boolean;
}

