import {
  Controller,
  Get,
  Param,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { MemberService } from './member.service';
import { VerifyInvitationResponseDto } from './dto/member.dto';

@ApiTags('Journey Invitations')
@Controller('v1/journeys/invitations')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class InvitationController {
  constructor(private readonly memberService: MemberService) {}

  @Get(':invitationId')
  @ApiOperation({
    summary: '验证邀请',
    description: '验证邀请链接的有效性，获取邀请信息（公开接口，无需认证）',
  })
  @ApiParam({
    name: 'invitationId',
    description: '邀请ID（UUID）',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: '邀请验证成功',
    type: VerifyInvitationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '邀请ID无效',
  })
  @ApiResponse({
    status: 404,
    description: '邀请不存在或已过期',
  })
  async verifyInvitation(
    @Param('invitationId') invitationId: string,
  ): Promise<VerifyInvitationResponseDto> {
    return await this.memberService.verifyInvitation(invitationId);
  }
}

