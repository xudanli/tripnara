import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MemberService } from './member.service';
import {
  GetMembersResponseDto,
  InviteMemberRequestDto,
  InviteMemberResponseDto,
  AddMemberRequestDto,
  AddMemberResponseDto,
  UpdateMemberRequestDto,
  UpdateMemberResponseDto,
  DeleteMemberResponseDto,
} from './dto/member.dto';

@ApiTags('Journey Members')
@Controller('v1/journeys/:journeyId/members')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: '获取成员列表',
    description: '获取指定行程的所有成员列表',
  })
  @ApiParam({ name: 'journeyId', description: '行程ID（UUID）', type: String })
  @ApiResponse({
    status: 200,
    description: '成功获取成员列表',
    type: GetMembersResponseDto,
  })
  @ApiResponse({ status: 404, description: '行程不存在' })
  @ApiResponse({ status: 403, description: '无权访问此行程的成员列表' })
  async getMembers(
    @Param('journeyId') journeyId: string,
    @CurrentUser() user: { userId: string },
  ): Promise<GetMembersResponseDto> {
    return await this.memberService.getMembers(journeyId, user.userId);
  }

  @Post('invite')
  @ApiBearerAuth()
  @ApiOperation({
    summary: '邀请成员',
    description: '通过邮箱邀请成员加入行程',
  })
  @ApiParam({ name: 'journeyId', description: '行程ID（UUID）', type: String })
  @ApiResponse({
    status: 200,
    description: '邀请已发送',
    type: InviteMemberResponseDto,
  })
  @ApiResponse({ status: 400, description: '邮箱格式不正确、角色无效' })
  @ApiResponse({ status: 403, description: '无权邀请成员到此行程' })
  @ApiResponse({ status: 409, description: '该邮箱已被邀请或已是成员' })
  async inviteMember(
    @Param('journeyId') journeyId: string,
    @Body() dto: InviteMemberRequestDto,
    @CurrentUser() user: { userId: string },
  ): Promise<InviteMemberResponseDto> {
    return await this.memberService.inviteMember(journeyId, user.userId, dto);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary: '添加成员',
    description: '直接添加成员到行程（无需邀请流程）',
  })
  @ApiParam({ name: 'journeyId', description: '行程ID（UUID）', type: String })
  @ApiResponse({
    status: 200,
    description: '成员添加成功',
    type: AddMemberResponseDto,
  })
  @ApiResponse({ status: 400, description: '成员名称不能为空、邮箱格式不正确' })
  @ApiResponse({ status: 403, description: '无权添加成员到此行程' })
  @ApiResponse({ status: 409, description: '该用户已是此行程的成员' })
  async addMember(
    @Param('journeyId') journeyId: string,
    @Body() dto: AddMemberRequestDto,
    @CurrentUser() user: { userId: string },
  ): Promise<AddMemberResponseDto> {
    return await this.memberService.addMember(journeyId, user.userId, dto);
  }

  @Patch(':memberId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: '更新成员信息',
    description: '更新成员信息（如修改角色、名称等）',
  })
  @ApiParam({ name: 'journeyId', description: '行程ID（UUID）', type: String })
  @ApiParam({ name: 'memberId', description: '成员ID（UUID）', type: String })
  @ApiResponse({
    status: 200,
    description: '成员信息更新成功',
    type: UpdateMemberResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '角色必须是 admin 或 member、不能将 owner 角色修改为其他角色',
  })
  @ApiResponse({ status: 403, description: '无权修改此成员信息' })
  @ApiResponse({ status: 404, description: '成员不存在' })
  async updateMember(
    @Param('journeyId') journeyId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRequestDto,
    @CurrentUser() user: { userId: string },
  ): Promise<UpdateMemberResponseDto> {
    return await this.memberService.updateMember(
      journeyId,
      memberId,
      user.userId,
      dto,
    );
  }

  @Delete(':memberId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: '移除成员',
    description: '从行程中移除成员',
  })
  @ApiParam({ name: 'journeyId', description: '行程ID（UUID）', type: String })
  @ApiParam({ name: 'memberId', description: '成员ID（UUID）', type: String })
  @ApiResponse({
    status: 200,
    description: '成员已移除',
    type: DeleteMemberResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: '无权移除此成员、不能移除行程所有者',
  })
  @ApiResponse({ status: 404, description: '成员不存在或不属于此行程' })
  async removeMember(
    @Param('journeyId') journeyId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: { userId: string },
  ): Promise<DeleteMemberResponseDto> {
    return await this.memberService.removeMember(journeyId, memberId, user.userId);
  }
}

