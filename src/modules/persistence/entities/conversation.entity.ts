import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 对话消息实体
 * 用于存储AI助手与用户的对话历史
 */
@Entity('conversation_messages')
@Index(['conversationId', 'createdAt'])
@Index(['journeyId', 'conversationId'])
export class ConversationMessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 对话ID（同一对话的所有消息共享此ID）
   */
  @Index()
  @Column({ type: 'uuid', name: 'conversation_id' })
  conversationId!: string;

  /**
   * 行程ID
   */
  @Index()
  @Column({ type: 'uuid', name: 'journey_id' })
  journeyId!: string;

  /**
   * 用户ID
   */
  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  /**
   * 消息角色：user（用户）或 assistant（AI助手）
   */
  @Column({ type: 'varchar', length: 20 })
  role!: 'user' | 'assistant';

  /**
   * 消息内容
   */
  @Column({ type: 'text' })
  content!: string;

  /**
   * 消息序号（在同一对话中的顺序，从1开始）
   */
  @Column({ type: 'int', name: 'sequence' })
  sequence!: number;

  /**
   * 元数据（JSON格式，可存储修改建议等额外信息）
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null;

  /**
   * 创建时间
   */
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  /**
   * 更新时间
   */
  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}

