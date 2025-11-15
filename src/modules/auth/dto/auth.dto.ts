import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserProfileDto {
  @ApiProperty({ description: '用户 ID' })
  id!: string;

  @ApiPropertyOptional({ description: '邮箱' })
  email?: string;

  @ApiPropertyOptional({ description: '手机号' })
  phone?: string;

  @ApiPropertyOptional({ description: '昵称' })
  nickname?: string;

  @ApiPropertyOptional({ description: '头像 URL' })
  avatarUrl?: string;

  @ApiPropertyOptional({ description: '偏好语言' })
  preferredLanguage?: string;

  @ApiProperty({ description: '创建时间' })
  createdAt!: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt!: Date;
}

