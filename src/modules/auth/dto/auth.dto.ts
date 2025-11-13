import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class GoogleAuthRequestDto {
  @ApiProperty({
    description: 'Google ID Token（从 Google 登录获取）',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjE2Nz...',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class AuthResponseDto {
  @ApiProperty({ description: '是否成功' })
  success!: boolean;

  @ApiProperty({ description: 'JWT Token' })
  token!: string;

  @ApiProperty({ description: '用户信息' })
  user!: {
    id: string;
    email?: string;
    nickname?: string;
    avatarUrl?: string;
  };

  @ApiPropertyOptional({ description: '错误消息' })
  message?: string;
}

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

