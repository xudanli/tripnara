import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ItineraryRepository } from '../../persistence/repositories/itinerary/itinerary.repository';
import {
  ExpenseDto,
  GetExpenseListResponseDto,
  CreateExpenseDto,
  CreateExpenseResponseDto,
  UpdateExpenseDto,
  UpdateExpenseResponseDto,
  DeleteExpenseResponseDto,
} from '../dto/itinerary.dto';

@Injectable()
export class JourneyExpenseService {
  private readonly logger = new Logger(JourneyExpenseService.name);

  constructor(
    private readonly itineraryRepository: ItineraryRepository,
  ) {}

  /**
   * 获取支出列表
   */
  async getExpenses(
    journeyId: string,
    userId: string,
    filters?: {
      category?: string;
      startDate?: string;
      endDate?: string;
      payerId?: string;
    },
  ): Promise<GetExpenseListResponseDto> {
    // 检查行程所有权
    const isOwner = await this.itineraryRepository.checkOwnership(
      journeyId,
      userId,
    );
    if (!isOwner) {
      throw new ForbiddenException('无权访问此行程的支出');
    }

    // 转换日期字符串为 Date 对象
    const startDate = filters?.startDate
      ? new Date(filters.startDate)
      : undefined;
    const endDate = filters?.endDate ? new Date(filters.endDate) : undefined;

    // 获取支出列表
    const expenses = await this.itineraryRepository.findExpensesByItineraryId(
      journeyId,
      {
        category: filters?.category as any,
        startDate,
        endDate,
        payerId: filters?.payerId,
      },
    );

    // 转换为 DTO
    const expenseDtos: ExpenseDto[] = expenses.map((expense) =>
      this.entityToExpenseDto(expense),
    );

    // 计算总支出
    const total = await this.itineraryRepository.calculateTotalExpenses(
      journeyId,
    );

    return {
      success: true,
      data: expenseDtos,
      total: Number(total),
    };
  }

  /**
   * 创建支出
   */
  async createExpense(
    journeyId: string,
    userId: string,
    dto: CreateExpenseDto,
  ): Promise<CreateExpenseResponseDto> {
    // 检查行程所有权
    const isOwner = await this.itineraryRepository.checkOwnership(
      journeyId,
      userId,
    );
    if (!isOwner) {
      throw new ForbiddenException('无权为此行程添加支出');
    }

    // 验证自定义分摊详情
    if (
      dto.splitType === 'custom' &&
      (!dto.splitDetails || Object.keys(dto.splitDetails).length === 0)
    ) {
      throw new BadRequestException(
        '当分摊方式为custom时，必须提供splitDetails',
      );
    }

    // 验证分摊详情总和等于金额
    if (dto.splitType === 'custom' && dto.splitDetails) {
      const totalSplit = Object.values(dto.splitDetails).reduce(
        (sum, amount) => sum + amount,
        0,
      );
      if (Math.abs(totalSplit - dto.amount) > 0.01) {
        throw new BadRequestException('分摊详情的总和必须等于支出金额');
      }
    }

    // 获取行程信息，确定默认货币
    const itinerary = await this.itineraryRepository.findById(journeyId);
    if (!itinerary) {
      throw new NotFoundException(`行程不存在: ${journeyId}`);
    }

    // 确定支出日期（默认为今天）
    const expenseDate = dto.date ? new Date(dto.date) : new Date();

    // 创建支出
    const created = await this.itineraryRepository.createExpense(journeyId, {
      title: dto.title,
      amount: dto.amount,
      currencyCode: dto.currencyCode || 'USD',
      category: dto.category,
      location: dto.location,
      payerId: dto.payerId,
      payerName: dto.payerName,
      splitType: dto.splitType || 'none',
      splitDetails: dto.splitDetails,
      date: expenseDate,
      notes: dto.notes,
    });

    return {
      success: true,
      data: this.entityToExpenseDto(created),
      message: '支出创建成功',
    };
  }

  /**
   * 更新支出
   */
  async updateExpense(
    journeyId: string,
    expenseId: string,
    userId: string,
    dto: UpdateExpenseDto,
  ): Promise<UpdateExpenseResponseDto> {
    // 检查行程所有权
    const isOwner = await this.itineraryRepository.checkOwnership(
      journeyId,
      userId,
    );
    if (!isOwner) {
      throw new ForbiddenException('无权修改此行程的支出');
    }

    // 检查支出是否属于该行程
    const expenseOwnership = await this.itineraryRepository.checkExpenseOwnership(
      expenseId,
      journeyId,
    );
    if (!expenseOwnership) {
      throw new NotFoundException(`支出不存在或不属于此行程: ${expenseId}`);
    }

    // 验证自定义分摊详情
    if (
      dto.splitType === 'custom' &&
      (!dto.splitDetails || Object.keys(dto.splitDetails).length === 0)
    ) {
      throw new BadRequestException(
        '当分摊方式为custom时，必须提供splitDetails',
      );
    }

    // 验证分摊详情总和等于金额
    if (dto.splitType === 'custom' && dto.splitDetails && dto.amount) {
      const totalSplit = Object.values(dto.splitDetails).reduce(
        (sum, amount) => sum + amount,
        0,
      );
      if (Math.abs(totalSplit - dto.amount) > 0.01) {
        throw new BadRequestException('分摊详情的总和必须等于支出金额');
      }
    }

    // 构建更新数据
    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.amount !== undefined) updateData.amount = dto.amount;
    if (dto.currencyCode !== undefined)
      updateData.currencyCode = dto.currencyCode;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.location !== undefined) updateData.location = dto.location;
    if (dto.payerId !== undefined) updateData.payerId = dto.payerId;
    if (dto.payerName !== undefined) updateData.payerName = dto.payerName;
    if (dto.splitType !== undefined) updateData.splitType = dto.splitType;
    if (dto.splitDetails !== undefined)
      updateData.splitDetails = dto.splitDetails;
    if (dto.date !== undefined) updateData.date = new Date(dto.date);
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    // 更新支出
    const updated = await this.itineraryRepository.updateExpense(
      expenseId,
      updateData,
    );

    if (!updated) {
      throw new NotFoundException(`支出不存在: ${expenseId}`);
    }

    return {
      success: true,
      data: this.entityToExpenseDto(updated),
      message: '支出更新成功',
    };
  }

  /**
   * 删除支出
   */
  async deleteExpense(
    journeyId: string,
    expenseId: string,
    userId: string,
  ): Promise<DeleteExpenseResponseDto> {
    // 检查行程所有权
    const isOwner = await this.itineraryRepository.checkOwnership(
      journeyId,
      userId,
    );
    if (!isOwner) {
      throw new ForbiddenException('无权删除此行程的支出');
    }

    // 检查支出是否属于该行程
    const expenseOwnership = await this.itineraryRepository.checkExpenseOwnership(
      expenseId,
      journeyId,
    );
    if (!expenseOwnership) {
      throw new NotFoundException(`支出不存在或不属于此行程: ${expenseId}`);
    }

    // 删除支出
    const deleted = await this.itineraryRepository.deleteExpense(expenseId);
    if (!deleted) {
      throw new NotFoundException(`支出不存在: ${expenseId}`);
    }

    return {
      success: true,
      message: '支出删除成功',
    };
  }

  /**
   * 将 Expense 实体转换为 DTO
   */
  private entityToExpenseDto(expense: any): ExpenseDto {
    return {
      id: expense.id,
      title: expense.title,
      amount: Number(expense.amount),
      currencyCode: expense.currencyCode,
      category: expense.category,
      location: expense.location,
      payerId: expense.payerId,
      payerName: expense.payerName,
      splitType: expense.splitType || 'none',
      splitDetails: expense.splitDetails,
      date:
        expense.date instanceof Date
          ? expense.date.toISOString().split('T')[0]
          : expense.date,
      notes: expense.notes,
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
    };
  }
}

