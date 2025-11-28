import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JourneyMemberRepository } from '../persistence/repositories/journey-member/journey-member.repository';
import { ItineraryRepository } from '../persistence/repositories/itinerary/itinerary.repository';
import { EmailService } from '../email/email.service';
import { UserEntity } from '../persistence/entities/user.entity';
import {
  MemberDto,
  GetMembersResponseDto,
  InviteMemberRequestDto,
  InviteMemberResponseDto,
  AddMemberRequestDto,
  AddMemberResponseDto,
  UpdateMemberRequestDto,
  UpdateMemberResponseDto,
  DeleteMemberResponseDto,
  VerifyInvitationResponseDto,
  InvitationDetailDto,
  InviterInfoDto,
  MemberRole,
} from './dto/member.dto';

@Injectable()
export class MemberService {
  private readonly logger = new Logger(MemberService.name);
  private readonly MAX_MEMBERS_PER_JOURNEY = 20;
  private readonly INVITATION_EXPIRY_DAYS = 7;

  constructor(
    private readonly memberRepository: JourneyMemberRepository,
    private readonly itineraryRepository: ItineraryRepository,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  /**
   * 获取成员列表
   */
  async getMembers(
    journeyId: string,
    userId: string,
  ): Promise<GetMembersResponseDto> {
    // 检查行程是否存在
    const itinerary = await this.itineraryRepository.findById(journeyId);
    if (!itinerary) {
      throw new NotFoundException(`行程不存在: ${journeyId}`);
    }

    // 检查用户是否有权限查看成员列表
    await this.checkViewPermission(journeyId, userId);

    // 获取所有成员
    const members = await this.memberRepository.findMembersByJourneyId(journeyId);

    return {
      success: true,
      data: members.map((member) => this.toMemberDto(member)),
    };
  }

  /**
   * 邀请成员
   */
  async inviteMember(
    journeyId: string,
    userId: string,
    dto: InviteMemberRequestDto,
  ): Promise<InviteMemberResponseDto> {
    // 检查行程是否存在
    const itinerary = await this.itineraryRepository.findById(journeyId);
    if (!itinerary) {
      throw new NotFoundException(`行程不存在: ${journeyId}`);
    }

    // 检查权限：只有 owner 和 admin 可以邀请
    const userRole = await this.getUserRole(journeyId, userId);
    if (userRole !== 'owner' && userRole !== 'admin') {
      throw new ForbiddenException('无权邀请成员到此行程');
    }

    // 检查邮箱是否已是成员
    const existingMember = await this.memberRepository.findMemberByJourneyAndEmail(
      journeyId,
      dto.email,
    );
    if (existingMember) {
      throw new ConflictException('该邮箱已是此行程的成员');
    }

    // 检查是否有待处理的邀请
    const existingInvitation =
      await this.memberRepository.findPendingInvitationByJourneyAndEmail(
        journeyId,
        dto.email,
      );
    if (existingInvitation) {
      throw new ConflictException('该邮箱已被邀请，请等待对方接受');
    }

    // 检查成员数量限制
    const members = await this.memberRepository.findMembersByJourneyId(journeyId);
    if (members.length >= this.MAX_MEMBERS_PER_JOURNEY) {
      throw new BadRequestException(
        `行程成员数量已达上限（${this.MAX_MEMBERS_PER_JOURNEY}人）`,
      );
    }

    // 创建邀请
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.INVITATION_EXPIRY_DAYS);

    const invitation = await this.memberRepository.createInvitation({
      journeyId,
      email: dto.email,
      role: dto.role || 'member',
      message: dto.message,
      invitedBy: userId,
      expiresAt,
    });

    // 发送邀请邮件
    try {
      await this.sendInvitationEmail(invitation.id, journeyId, userId, dto.email);
    } catch (error) {
      this.logger.error(`Failed to send invitation email to ${dto.email}:`, error);
      // 邮件发送失败不影响邀请创建，只记录错误
    }

    return {
      success: true,
      message: '邀请已发送',
      data: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt.toISOString(),
      },
    };
  }

  /**
   * 发送邀请邮件
   */
  private async sendInvitationEmail(
    invitationId: string,
    journeyId: string,
    inviterUserId: string,
    inviteeEmail: string,
  ): Promise<void> {
    // 获取邀请人信息
    const inviter = await this.userRepository.findOne({
      where: { id: inviterUserId },
    });
    if (!inviter) {
      this.logger.warn(`Inviter user not found: ${inviterUserId}`);
      return;
    }

    // 获取行程信息
    const itinerary = await this.itineraryRepository.findById(journeyId);
    if (!itinerary) {
      this.logger.warn(`Journey not found: ${journeyId}`);
      return;
    }

    // 生成邀请链接
    const frontendOrigin = this.configService.get<string>(
      'FRONTEND_ORIGIN',
      'http://localhost:5173',
    );
    const invitationLink = `${frontendOrigin}/invitations/${invitationId}?journey=${journeyId}`;

    // 获取邀请详情（包含过期时间）
    const invitation = await this.memberRepository.findInvitationById(invitationId);
    if (!invitation) {
      this.logger.warn(`Invitation not found: ${invitationId}`);
      return;
    }

    // 生成邮件内容
    const inviterName = inviter.nickname || inviter.email || '朋友';
    const journeyTitle = itinerary.destination || '新行程';
    const emailContent = this.emailService.generateInvitationEmail({
      inviterName,
      journeyTitle,
      destination: itinerary.destination,
      invitationLink,
      message: invitation.message || undefined,
      expiresAt: invitation.expiresAt,
    });

    // 发送邮件
    await this.emailService.sendEmail({
      to: inviteeEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });
  }

  /**
   * 添加成员
   */
  async addMember(
    journeyId: string,
    userId: string,
    dto: AddMemberRequestDto,
  ): Promise<AddMemberResponseDto> {
    // 检查行程是否存在
    const itinerary = await this.itineraryRepository.findById(journeyId);
    if (!itinerary) {
      throw new NotFoundException(`行程不存在: ${journeyId}`);
    }

    // 检查权限：只有 owner 和 admin 可以添加成员
    const userRole = await this.getUserRole(journeyId, userId);
    if (userRole !== 'owner' && userRole !== 'admin') {
      throw new ForbiddenException('无权添加成员到此行程');
    }

    // 检查成员数量限制
    const members = await this.memberRepository.findMembersByJourneyId(journeyId);
    if (members.length >= this.MAX_MEMBERS_PER_JOURNEY) {
      throw new BadRequestException(
        `行程成员数量已达上限（${this.MAX_MEMBERS_PER_JOURNEY}人）`,
      );
    }

    // 如果提供了邮箱，检查是否已是成员
    if (dto.email) {
      const existingMember = await this.memberRepository.findMemberByJourneyAndEmail(
        journeyId,
        dto.email,
      );
      if (existingMember) {
        throw new ConflictException('该邮箱已是此行程的成员');
      }
    }

    // 如果提供了 userId，检查是否已是成员
    if (dto.userId) {
      const existingMember = await this.memberRepository.findMemberByJourneyAndUser(
        journeyId,
        dto.userId,
      );
      if (existingMember) {
        throw new ConflictException('该用户已是此行程的成员');
      }
    }

    // 创建成员
    const member = await this.memberRepository.createMember({
      journeyId,
      name: dto.name,
      email: dto.email,
      role: dto.role || 'member',
      userId: dto.userId || null,
    });

    return {
      success: true,
      message: '成员添加成功',
      data: this.toMemberDto(member),
    };
  }

  /**
   * 更新成员信息
   */
  async updateMember(
    journeyId: string,
    memberId: string,
    userId: string,
    dto: UpdateMemberRequestDto,
  ): Promise<UpdateMemberResponseDto> {
    // 检查成员是否存在
    const member = await this.memberRepository.findMemberById(memberId);
    if (!member) {
      throw new NotFoundException(`成员不存在: ${memberId}`);
    }

    // 验证成员属于指定行程
    if (member.journeyId !== journeyId) {
      throw new NotFoundException('成员不属于此行程');
    }

    // 检查权限
    const userRole = await this.getUserRole(journeyId, userId);
    if (userRole !== 'owner' && userRole !== 'admin') {
      throw new ForbiddenException('无权修改此成员信息');
    }

    // 特殊规则：不能修改 owner 的角色
    if (member.role === 'owner' && dto.role) {
      throw new BadRequestException('不能将 owner 角色修改为其他角色');
    }

    // admin 不能修改其他 admin 的角色（除非自己是 owner）
    if (
      member.role === 'admin' &&
      dto.role &&
      userRole !== 'owner' &&
      member.userId !== userId
    ) {
      throw new ForbiddenException('无权修改其他 admin 的角色');
    }

    // 更新成员
    const updated = await this.memberRepository.updateMember(memberId, {
      name: dto.name,
      email: dto.email,
      role: dto.role,
    });

    if (!updated) {
      throw new NotFoundException(`成员不存在: ${memberId}`);
    }

    return {
      success: true,
      message: '成员信息更新成功',
      data: this.toMemberDto(updated),
    };
  }

  /**
   * 移除成员
   */
  async removeMember(
    journeyId: string,
    memberId: string,
    userId: string,
  ): Promise<DeleteMemberResponseDto> {
    // 检查成员是否存在
    const member = await this.memberRepository.findMemberById(memberId);
    if (!member) {
      throw new NotFoundException(`成员不存在: ${memberId}`);
    }

    // 验证成员属于指定行程
    if (member.journeyId !== journeyId) {
      throw new NotFoundException('成员不属于此行程');
    }

    // 不能移除 owner
    if (member.role === 'owner') {
      throw new ForbiddenException('不能移除行程所有者');
    }

    // 检查权限
    const userRole = await this.getUserRole(journeyId, userId);
    const isRemovingSelf = member.userId === userId;

    if (!isRemovingSelf && userRole !== 'owner' && userRole !== 'admin') {
      throw new ForbiddenException('无权移除此成员');
    }

    // admin 不能移除其他 admin（除非自己是 owner）
    if (
      !isRemovingSelf &&
      member.role === 'admin' &&
      userRole !== 'owner'
    ) {
      throw new ForbiddenException('无权移除其他 admin');
    }

    // 删除成员
    const deleted = await this.memberRepository.deleteMember(memberId);
    if (!deleted) {
      throw new NotFoundException(`成员不存在: ${memberId}`);
    }

    // TODO: 处理该成员分配的任务（取消分配或重新分配）
    // TODO: 处理该成员相关的支出记录（保留记录但标记为已移除）

    return {
      success: true,
      message: '成员已移除',
    };
  }

  /**
   * 检查用户是否有权限查看成员列表
   */
  private async checkViewPermission(journeyId: string, userId: string): Promise<void> {
    // 检查是否是行程所有者
    const isOwner = await this.itineraryRepository.checkOwnership(journeyId, userId);
    if (isOwner) {
      return;
    }

    // 检查是否是成员
    const isMember = await this.memberRepository.isMember(journeyId, userId);
    if (!isMember) {
      throw new ForbiddenException('无权访问此行程的成员列表');
    }
  }

  /**
   * 获取用户在行程中的角色
   */
  private async getUserRole(
    journeyId: string,
    userId: string,
  ): Promise<MemberRole | null> {
    // 先检查是否是所有者
    const isOwner = await this.itineraryRepository.checkOwnership(journeyId, userId);
    if (isOwner) {
      return 'owner';
    }

    // 检查是否是成员
    return await this.memberRepository.getMemberRole(journeyId, userId);
  }

  /**
   * 转换为 DTO
   */
  private toMemberDto(member: {
    id: string;
    name: string;
    email?: string | null;
    role: MemberRole;
    userId?: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): MemberDto {
    return {
      id: member.id,
      name: member.name,
      email: member.email || undefined,
      role: member.role,
      userId: member.userId || null,
      createdAt: member.createdAt.toISOString(),
      updatedAt: member.updatedAt.toISOString(),
    };
  }

  /**
   * 验证邀请
   * 用于验证邀请链接的有效性，获取邀请信息（公开接口，无需认证）
   */
  async verifyInvitation(
    invitationId: string,
  ): Promise<VerifyInvitationResponseDto> {
    // 验证邀请ID格式
    if (!invitationId || invitationId.trim().length === 0) {
      throw new BadRequestException('邀请ID无效');
    }

    // 查找邀请
    const invitation = await this.memberRepository.findInvitationById(
      invitationId,
    );
    if (!invitation) {
      throw new NotFoundException('邀请不存在或已过期');
    }

    // 检查邀请是否已过期
    const now = new Date();
    if (invitation.expiresAt < now && invitation.status === 'pending') {
      // 自动标记为过期
      await this.memberRepository.updateInvitationStatus(
        invitationId,
        'expired',
      );
      invitation.status = 'expired';
    }

    // 如果邀请已过期或已取消，返回错误
    if (invitation.status === 'expired' || invitation.status === 'cancelled') {
      throw new NotFoundException('邀请不存在或已过期');
    }

    // 获取行程信息
    const journey = invitation.journey;
    if (!journey) {
      throw new NotFoundException('行程不存在');
    }

    // 获取邀请人信息
    const inviter = invitation.inviter;
    let invitedByInfo: InviterInfoDto | undefined;

    if (inviter) {
      invitedByInfo = {
        id: inviter.id,
        name: inviter.nickname || inviter.email || '未知用户',
        email: inviter.email,
      };
    }

    return {
      success: true,
      data: {
        invitationId: invitation.id,
        journeyId: invitation.journeyId,
        email: invitation.email,
        role: invitation.role,
        journeyName: journey.destination, // 使用目的地作为行程名称
        message: invitation.message,
        status: invitation.status,
        expiresAt: invitation.expiresAt.toISOString(),
        invitedBy: invitedByInfo,
      },
    };
  }
}

