import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemberController } from './member.controller';
import { InvitationController } from './invitation.controller';
import { MemberService } from './member.service';
import { JourneyMemberRepository } from '../persistence/repositories/journey-member/journey-member.repository';
import { PersistenceModule } from '../persistence/persistence.module';
import { EmailModule } from '../email/email.module';
import {
  JourneyMemberEntity,
  JourneyInvitationEntity,
} from '../persistence/entities/journey-member.entity';
import { UserEntity } from '../persistence/entities/user.entity';

@Module({
  imports: [
    PersistenceModule,
    EmailModule,
    TypeOrmModule.forFeature([
      JourneyMemberEntity,
      JourneyInvitationEntity,
      UserEntity,
    ]),
  ],
  controllers: [MemberController, InvitationController],
  providers: [MemberService, JourneyMemberRepository],
  exports: [MemberService],
})
export class MemberModule {}

