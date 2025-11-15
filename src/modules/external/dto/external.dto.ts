import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class EventSearchQueryDto {
  @ApiProperty({ description: '地点，例如 “深圳”', example: '深圳' })
  @IsString()
  @MinLength(1)
  location!: string;
}

export class LocationSearchQueryDto {
  @ApiProperty({ description: '目的地关键字', example: '拉萨' })
  @IsString()
  @MinLength(1)
  query!: string;
}

