import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  MaxLength,
  MinLength,
} from 'class-validator';

export type MemberRole = 'owner' | 'admin' | 'member';

/**
 * 成员信息 DTO
 */
export class MemberDto {
  @ApiProperty({ description: '成员ID', example: 'member_001' })
  id!: string;

  @ApiProperty({ description: '成员名称', example: '张三' })
  name!: string;

  @ApiPropertyOptional({ description: '成员邮箱', example: 'zhangsan@example.com' })
  email?: string;

  @ApiProperty({ description: '角色', enum: ['owner', 'admin', 'member'], example: 'owner' })
  role!: MemberRole;

  @ApiPropertyOptional({ description: '关联的用户ID', example: 'user_001' })
  userId?: string | null;

  @ApiProperty({ description: '创建时间', example: '2025-11-25T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ description: '更新时间', example: '2025-11-25T10:00:00.000Z' })
  updatedAt!: string;
}

/**
 * 获取成员列表响应 DTO
 */
export class GetMembersResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '成员列表', type: [MemberDto] })
  data!: MemberDto[];
}

/**
 * 邀请成员请求 DTO
 */
export class InviteMemberRequestDto {
  @ApiProperty({ description: '被邀请人邮箱地址', example: 'newmember@example.com' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  @IsNotEmpty()
  email!: string;

  @ApiPropertyOptional({
    description: '角色',
    enum: ['member', 'admin'],
    default: 'member',
    example: 'member',
  })
  @IsOptional()
  @IsEnum(['member', 'admin'])
  role?: 'member' | 'admin';

  @ApiPropertyOptional({
    description: '邀请消息（最多500字符）',
    example: '欢迎加入我们的冰岛之旅！',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}

/**
 * 邀请信息 DTO
 */
export class InvitationDto {
  @ApiProperty({ description: '邀请ID', example: 'inv_123456' })
  id!: string;

  @ApiProperty({ description: '被邀请人邮箱', example: 'newmember@example.com' })
  email!: string;

  @ApiProperty({ description: '角色', enum: ['member', 'admin'], example: 'member' })
  role!: 'member' | 'admin';

  @ApiProperty({ description: '邀请状态', enum: ['pending', 'accepted', 'expired'], example: 'pending' })
  status!: 'pending' | 'accepted' | 'expired' | 'cancelled';

  @ApiProperty({ description: '过期时间', example: '2025-12-02T10:00:00.000Z' })
  expiresAt!: string;
}

/**
 * 邀请成员响应 DTO
 */
export class InviteMemberResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '响应消息', example: '邀请已发送' })
  message!: string;

  @ApiProperty({ description: '邀请信息', type: InvitationDto })
  data!: InvitationDto;
}

/**
 * 添加成员请求 DTO
 */
export class AddMemberRequestDto {
  @ApiProperty({ description: '成员名称', example: '新成员' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ description: '成员邮箱', example: 'newmember@example.com' })
  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  email?: string;

  @ApiPropertyOptional({
    description: '角色',
    enum: ['member', 'admin'],
    default: 'member',
    example: 'member',
  })
  @IsOptional()
  @IsEnum(['member', 'admin'])
  role?: 'member' | 'admin';

  @ApiPropertyOptional({ description: '关联的用户ID', example: 'user_003' })
  @IsOptional()
  @IsString()
  userId?: string;
}

/**
 * 添加成员响应 DTO
 */
export class AddMemberResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '响应消息', example: '成员添加成功' })
  message!: string;

  @ApiProperty({ description: '成员信息', type: MemberDto })
  data!: MemberDto;
}

/**
 * 更新成员请求 DTO
 */
export class UpdateMemberRequestDto {
  @ApiPropertyOptional({ description: '成员名称', example: '更新后的名称' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: '角色',
    enum: ['admin', 'member'],
    example: 'admin',
  })
  @IsOptional()
  @IsEnum(['admin', 'member'])
  role?: 'admin' | 'member';

  @ApiPropertyOptional({ description: '成员邮箱', example: 'updated@example.com' })
  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  email?: string;
}

/**
 * 更新成员响应 DTO
 */
export class UpdateMemberResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '响应消息', example: '成员信息更新成功' })
  message!: string;

  @ApiProperty({ description: '成员信息', type: MemberDto })
  data!: MemberDto;
}

/**
 * 删除成员响应 DTO
 */
export class DeleteMemberResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '响应消息', example: '成员已移除' })
  message!: string;
}

