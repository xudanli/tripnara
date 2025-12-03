import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 位置信息实体
 * 存储通过AI生成的位置详细信息
 */
@Entity({ name: 'location_infos' })
@Index(['activityName', 'destination', 'activityType'], { unique: true })
@Index(['destination'])
@Index(['activityType'])
@Index(['createdAt'])
export class LocationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  activityName!: string; // 活动名称

  @Column({ type: 'varchar', length: 255 })
  destination!: string; // 目的地

  @Column({
    type: 'varchar',
    length: 50,
  })
  activityType!:
    | 'attraction'
    | 'meal'
    | 'hotel'
    | 'shopping'
    | 'transport'
    | 'ocean';

  @Column({ type: 'jsonb' })
  coordinates!: { lat: number; lng: number; region?: string }; // 坐标信息

  // 位置信息字段
  @Column({ type: 'varchar', length: 255 })
  chineseName!: string; // 中文名称

  @Column({ type: 'varchar', length: 255 })
  localName!: string; // 当地语言名称

  @Column({ type: 'varchar', length: 500 })
  chineseAddress!: string; // 中文地址

  @Column({ type: 'varchar', length: 500 })
  localAddress!: string; // 当地语言地址

  @Column({ type: 'text' })
  transportInfo!: string; // 交通信息

  @Column({ type: 'varchar', length: 255 })
  openingHours!: string; // 开放时间

  @Column({ type: 'varchar', length: 255 })
  ticketPrice!: string; // 门票价格

  @Column({ type: 'text' })
  visitTips!: string; // 游览建议

  @Column({ type: 'varchar', length: 500, nullable: true })
  nearbyAttractions?: string; // 周边推荐

  @Column({ type: 'varchar', length: 500, nullable: true })
  contactInfo?: string; // 联系方式

  @Column({ type: 'varchar', length: 100 })
  category!: string; // 景点类型

  @Column({ type: 'decimal', precision: 3, scale: 2 })
  rating!: number; // 评分 (1-5)

  @Column({ type: 'varchar', length: 100 })
  visitDuration!: string; // 建议游览时长

  @Column({ type: 'varchar', length: 255 })
  bestTimeToVisit!: string; // 最佳游览时间

  @Column({ type: 'varchar', length: 500, nullable: true })
  accessibility?: string; // 无障碍设施信息

  @Column({ type: 'varchar', length: 500, nullable: true })
  dressingTips?: string; // 穿搭建议

  @Column({ type: 'varchar', length: 500, nullable: true })
  culturalTips?: string; // 当地文化提示

  @Column({ type: 'varchar', length: 500, nullable: true })
  bookingInfo?: string; // 预订信息

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>; // 元数据（用于存储额外信息）

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

