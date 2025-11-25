import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ItineraryEntity } from './itinerary.entity';

export type ExpenseSplitType = 'none' | 'equal' | 'custom';

export type ExpenseCategory =
  | '交通'
  | '住宿'
  | '餐饮'
  | '景点'
  | '购物'
  | '其他';

@Entity({ name: 'itinerary_expenses' })
@Index(['itineraryId', 'date'])
@Index(['itineraryId', 'category'])
export class ExpenseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  itineraryId!: string;

  @ManyToOne(() => ItineraryEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'itinerary_id' })
  itinerary!: ItineraryEntity;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currencyCode!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category?: ExpenseCategory;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location?: string;

  @Column({ type: 'uuid', nullable: true })
  payerId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  payerName?: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'none',
  })
  splitType!: ExpenseSplitType;

  @Column({ type: 'jsonb', nullable: true })
  splitDetails?: Record<string, number>;

  @Column({ type: 'date' })
  date!: Date;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

