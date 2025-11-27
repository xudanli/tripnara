import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, LessThan } from 'typeorm';
import {
  JourneyMemberEntity,
  JourneyInvitationEntity,
  MemberRole,
  InvitationStatus,
} from '../../entities/journey-member.entity';

@Injectable()
export class JourneyMemberRepository {
  constructor(
    @InjectRepository(JourneyMemberEntity)
    private readonly memberRepository: Repository<JourneyMemberEntity>,
    @InjectRepository(JourneyInvitationEntity)
    private readonly invitationRepository: Repository<JourneyInvitationEntity>,
  ) {}

  /**
   * 获取行程的所有成员
   */
  async findMembersByJourneyId(journeyId: string): Promise<JourneyMemberEntity[]> {
    return await this.memberRepository.find({
      where: { journeyId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * 根据ID查找成员
   */
  async findMemberById(memberId: string): Promise<JourneyMemberEntity | null> {
    return await this.memberRepository.findOne({
      where: { id: memberId },
      relations: ['user', 'journey'],
    });
  }

  /**
   * 根据行程ID和用户ID查找成员
   */
  async findMemberByJourneyAndUser(
    journeyId: string,
    userId: string,
  ): Promise<JourneyMemberEntity | null> {
    return await this.memberRepository.findOne({
      where: { journeyId, userId },
      relations: ['user'],
    });
  }

  /**
   * 根据行程ID和邮箱查找成员
   */
  async findMemberByJourneyAndEmail(
    journeyId: string,
    email: string,
  ): Promise<JourneyMemberEntity | null> {
    return await this.memberRepository.findOne({
      where: { journeyId, email },
      relations: ['user'],
    });
  }

  /**
   * 创建成员
   */
  async createMember(input: {
    journeyId: string;
    name: string;
    email?: string;
    role: MemberRole;
    userId?: string | null;
  }): Promise<JourneyMemberEntity> {
    const member = this.memberRepository.create(input);
    return await this.memberRepository.save(member);
  }

  /**
   * 更新成员
   */
  async updateMember(
    memberId: string,
    input: {
      name?: string;
      email?: string;
      role?: MemberRole;
    },
  ): Promise<JourneyMemberEntity | null> {
    const updateData: {
      name?: string;
      email?: string;
      role?: MemberRole;
    } = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.role !== undefined) updateData.role = input.role;

    await this.memberRepository.update({ id: memberId }, updateData);
    return await this.findMemberById(memberId);
  }

  /**
   * 删除成员
   */
  async deleteMember(memberId: string): Promise<boolean> {
    const result = await this.memberRepository.delete({ id: memberId });
    return (result.affected ?? 0) > 0;
  }

  /**
   * 检查用户是否是行程成员
   */
  async isMember(journeyId: string, userId: string): Promise<boolean> {
    const member = await this.findMemberByJourneyAndUser(journeyId, userId);
    return !!member;
  }

  /**
   * 获取用户的角色
   */
  async getMemberRole(
    journeyId: string,
    userId: string,
  ): Promise<MemberRole | null> {
    const member = await this.findMemberByJourneyAndUser(journeyId, userId);
    return member?.role || null;
  }

  /**
   * 创建邀请
   */
  async createInvitation(input: {
    journeyId: string;
    email: string;
    role: 'member' | 'admin';
    message?: string;
    invitedBy: string;
    expiresAt: Date;
  }): Promise<JourneyInvitationEntity> {
    const invitation = this.invitationRepository.create({
      ...input,
      status: 'pending' as InvitationStatus,
    });
    return await this.invitationRepository.save(invitation);
  }

  /**
   * 查找邀请
   */
  async findInvitationById(invitationId: string): Promise<JourneyInvitationEntity | null> {
    return await this.invitationRepository.findOne({
      where: { id: invitationId },
      relations: ['journey', 'inviter'],
    });
  }

  /**
   * 根据行程ID和邮箱查找待处理的邀请
   */
  async findPendingInvitationByJourneyAndEmail(
    journeyId: string,
    email: string,
  ): Promise<JourneyInvitationEntity | null> {
    return await this.invitationRepository.findOne({
      where: {
        journeyId,
        email,
        status: 'pending',
      },
      relations: ['inviter'],
    });
  }

  /**
   * 更新邀请状态
   */
  async updateInvitationStatus(
    invitationId: string,
    status: InvitationStatus,
  ): Promise<JourneyInvitationEntity | null> {
    await this.invitationRepository.update({ id: invitationId }, { status });
    return await this.findInvitationById(invitationId);
  }

  /**
   * 标记过期的邀请
   */
  async expireOldInvitations(): Promise<number> {
    const now = new Date();
    const result = await this.invitationRepository.update(
      {
        status: 'pending',
        expiresAt: LessThan(now),
      },
      { status: 'expired' },
    );
    return result.affected ?? 0;
  }

  /**
   * 检查邮箱是否已被邀请
   */
  async hasPendingInvitation(journeyId: string, email: string): Promise<boolean> {
    const invitation = await this.findPendingInvitationByJourneyAndEmail(journeyId, email);
    return !!invitation;
  }
}

