import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { TravelAlertEntity, AlertSeverity, AlertStatus } from '../persistence/entities/reference.entity';
import {
  CreateAlertRequestDto,
  CreateAlertResponseDto,
  GetAlertsQueryDto,
  AlertListResponseDto,
  AlertDto,
} from './dto/alerts.dto';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    @InjectRepository(TravelAlertEntity)
    private readonly alertRepository: Repository<TravelAlertEntity>,
  ) {}

  /**
   * 创建安全通知
   */
  async createAlert(
    dto: CreateAlertRequestDto,
    userId?: string,
  ): Promise<CreateAlertResponseDto> {
    // 验证日期
    const startDate = new Date(dto.startDate);
    if (isNaN(startDate.getTime())) {
      throw new BadRequestException('无效的开始日期');
    }

    let endDate: Date | undefined;
    if (dto.endDate) {
      endDate = new Date(dto.endDate);
      if (isNaN(endDate.getTime())) {
        throw new BadRequestException('无效的结束日期');
      }
      if (endDate < startDate) {
        throw new BadRequestException('结束日期不能早于开始日期');
      }
    }

    const alert = this.alertRepository.create({
      title: dto.title,
      content: dto.content,
      destination: dto.destination,
      countryCode: dto.countryCode,
      severity: dto.severity,
      status: dto.status || 'active',
      startDate,
      endDate,
      metadata: dto.metadata,
      createdBy: userId,
    });

    const saved = await this.alertRepository.save(alert);

    return {
      success: true,
      data: this.mapToDto(saved),
      message: '创建成功',
    };
  }

  /**
   * 获取安全通知列表
   */
  async getAlerts(query: GetAlertsQueryDto): Promise<AlertListResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: FindOptionsWhere<TravelAlertEntity> = {};

    if (query.destination) {
      where.destination = query.destination;
    }

    if (query.countryCode) {
      where.countryCode = query.countryCode;
    }

    if (query.severity) {
      where.severity = query.severity;
    }

    if (query.status) {
      where.status = query.status;
    } else {
      // 默认只查询活跃的通知
      where.status = 'active';
    }

    // 日期范围查询
    if (query.startDate || query.endDate) {
      const startDate = query.startDate ? new Date(query.startDate) : undefined;
      const endDate = query.endDate ? new Date(query.endDate) : undefined;

      if (startDate && endDate) {
        // 查询在指定日期范围内生效的通知
        // 通知的开始日期 <= 查询结束日期 且 通知的结束日期 >= 查询开始日期（或没有结束日期）
        where.startDate = LessThanOrEqual(endDate);
        // 这里需要更复杂的查询，使用 QueryBuilder
      } else if (startDate) {
        where.startDate = MoreThanOrEqual(startDate);
      } else if (endDate) {
        where.startDate = LessThanOrEqual(endDate);
      }
    }

    // 使用 QueryBuilder 处理复杂的日期查询
    const queryBuilder = this.alertRepository.createQueryBuilder('alert');

    if (query.destination) {
      queryBuilder.andWhere('alert.destination = :destination', {
        destination: query.destination,
      });
    }

    if (query.countryCode) {
      queryBuilder.andWhere('alert.countryCode = :countryCode', {
        countryCode: query.countryCode,
      });
    }

    if (query.severity) {
      queryBuilder.andWhere('alert.severity = :severity', {
        severity: query.severity,
      });
    }

    if (query.status) {
      queryBuilder.andWhere('alert.status = :status', {
        status: query.status,
      });
    } else {
      queryBuilder.andWhere('alert.status = :status', {
        status: 'active',
      });
    }

    // 日期范围查询：查询在指定日期范围内生效的通知
    if (query.startDate || query.endDate) {
      const startDate = query.startDate ? new Date(query.startDate) : undefined;
      const endDate = query.endDate ? new Date(query.endDate) : undefined;

      if (startDate && endDate) {
        // 通知的开始日期 <= 查询结束日期 且 (通知的结束日期 >= 查询开始日期 或 通知没有结束日期)
        queryBuilder.andWhere('alert.startDate <= :queryEndDate', {
          queryEndDate: endDate,
        });
        queryBuilder.andWhere(
          '(alert.endDate IS NULL OR alert.endDate >= :queryStartDate)',
          {
            queryStartDate: startDate,
          },
        );
      } else if (startDate) {
        queryBuilder.andWhere(
          '(alert.endDate IS NULL OR alert.endDate >= :queryStartDate)',
          {
            queryStartDate: startDate,
          },
        );
      } else if (endDate) {
        queryBuilder.andWhere('alert.startDate <= :queryEndDate', {
          queryEndDate: endDate,
        });
      }
    }

    // 排序：按严重程度和开始日期排序
    queryBuilder
      .orderBy(
        "CASE alert.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END",
        'ASC',
      )
      .addOrderBy('alert.startDate', 'DESC');

    // 获取总数
    const total = await queryBuilder.getCount();

    // 分页查询
    const alerts = await queryBuilder.skip(skip).take(limit).getMany();

    return {
      data: alerts.map((alert) => this.mapToDto(alert)),
      total,
      page,
      limit,
    };
  }

  /**
   * 将实体映射为 DTO
   */
  private mapToDto(alert: TravelAlertEntity): AlertDto {
    return {
      id: alert.id,
      title: alert.title,
      content: alert.content,
      destination: alert.destination,
      countryCode: alert.countryCode,
      severity: alert.severity,
      status: alert.status,
      startDate: alert.startDate.toISOString(),
      endDate: alert.endDate?.toISOString(),
      metadata: alert.metadata,
      createdAt: alert.createdAt.toISOString(),
      updatedAt: alert.updatedAt.toISOString(),
    };
  }
}

