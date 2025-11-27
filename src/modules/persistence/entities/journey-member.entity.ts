import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { ItineraryEntity } from './itinerary.entity';
import { UserEntity } from './user.entity';

export type MemberRole = 'owner' | 'admin' | 'member';

@Entity({ name: 'journey_members' })
@Index(['journeyId', 'role'])
@Index(['journeyId', 'userId'])
@Unique(['journeyId', 'email'])
@Unique(['journeyId', 'userId'])
export class JourneyMemberEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  journeyId!: string;

  @ManyToOne(() => ItineraryEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'journey_id' })
  journey!: ItineraryEntity;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'member',
  })
  role!: MemberRole;

  @Column({ type: 'uuid', nullable: true })
  userId?: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

@Entity({ name: 'journey_invitations' })
@Index(['journeyId', 'status'])
@Index(['email', 'status'])
@Index(['expiresAt'])
export class JourneyInvitationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  journeyId!: string;

  @ManyToOne(() => ItineraryEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'journey_id' })
  journey!: ItineraryEntity;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'member',
  })
  role!: 'member' | 'admin';

  @Column({ type: 'text', nullable: true })
  message?: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status!: InvitationStatus;

  @Column({ type: 'uuid' })
  invitedBy!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invited_by' })
  inviter!: UserEntity;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

