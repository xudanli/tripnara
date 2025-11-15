import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class UpdatePreferencesDto {
  @ApiProperty({
    description: '用户自定义偏好 JSON 对象',
    default: {},
    type: Object,
  })
  @IsObject()
  preferences!: Record<string, unknown>;
}

