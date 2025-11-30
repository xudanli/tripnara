import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import {
  VisaPolicyEntity,
  VisaUnionEntity,
  VisaUnionCountryEntity,
  VisaPolicyHistoryEntity,
  ApplicantType,
  VisaType,
} from '../persistence/entities/visa.entity';
import {
  VisaInfo,
  MultiDestinationAnalysisRequestDto,
  MultiDestinationAnalysisResponse,
  RequiredVisa,
  UnionGroup,
  CreateVisaPolicyDto,
  UpdateVisaPolicyDto,
  VisaPolicyQueryDto,
} from './dto/visa.dto';

@Injectable()
export class VisaService {
  private readonly logger = new Logger(VisaService.name);
  private readonly redisClient?: Redis;
  private readonly useRedisCache: boolean;
  private readonly visaCacheTtlSeconds = 24 * 60 * 60; // 24小时（签证政策相对稳定）

  constructor(
    @InjectRepository(VisaPolicyEntity)
    private visaPolicyRepository: Repository<VisaPolicyEntity>,
    @InjectRepository(VisaUnionEntity)
    private visaUnionRepository: Repository<VisaUnionEntity>,
    @InjectRepository(VisaUnionCountryEntity)
    private visaUnionCountryRepository: Repository<VisaUnionCountryEntity>,
    @InjectRepository(VisaPolicyHistoryEntity)
    private visaPolicyHistoryRepository: Repository<VisaPolicyHistoryEntity>,
    private readonly configService: ConfigService,
  ) {
    // 初始化 Redis 客户端（如果配置了 REDIS_URL）
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      try {
        const url = new URL(redisUrl);
        const password = url.password || undefined;
        const host = url.hostname;
        const port = parseInt(url.port || '6379', 10);

        this.redisClient = new Redis({
          host,
          port,
          password,
          ...(url.username && url.username !== 'default'
            ? { username: url.username }
            : {}),
          keepAlive: 1000,
          connectTimeout: 10000,
          maxRetriesPerRequest: null, // 让 ioredis 自己处理重试
          enableReadyCheck: false,
          lazyConnect: false,
          retryStrategy: (times) => {
            if (times > 3) {
              return null;
            }
            return Math.min(times * 200, 2000);
          },
        });

        this.redisClient.on('error', (error) => {
          this.logger.warn('Redis connection error in VisaService:', error.message);
        });

        this.redisClient.on('connect', () => {
          this.logger.log('Redis connected for visa policy cache');
        });

        this.useRedisCache = true;
        this.logger.log('Redis cache enabled for VisaService');
      } catch (error) {
        this.logger.warn(
          'Failed to initialize Redis client for VisaService, using database only:',
          error instanceof Error ? error.message : error,
        );
        this.useRedisCache = false;
      }
    } else {
      this.useRedisCache = false;
      this.logger.log('Redis URL not configured for VisaService, using database only');
    }
  }

  /**
   * 查询指定目的地的签证信息
   * 性能优化：使用 Redis 缓存，减少数据库查询
   */
  async getVisaInfo(
    destinationCountry: string,
    nationalityCode?: string,
    permanentResidencyCode?: string,
  ): Promise<VisaInfo[]> {
    // 生成缓存键：CN -> EG (nationality) 或 CN -> EG (permanent_resident)
    const cacheKey = `visa:${destinationCountry.toUpperCase()}:${nationalityCode?.toUpperCase() || 'none'}:${permanentResidencyCode?.toUpperCase() || 'none'}`;
    
    // 尝试从 Redis 缓存读取
    if (this.useRedisCache && this.redisClient) {
      try {
        const cached = await this.redisClient.get(cacheKey);
        if (cached) {
          const visaInfos = JSON.parse(cached) as VisaInfo[];
          this.logger.debug(`Redis cache hit for visa info: ${cacheKey}`);
          return visaInfos;
        }
      } catch (error) {
        this.logger.warn(`Redis cache read error for ${cacheKey}:`, error);
        // 继续从数据库查询
      }
    }

    const now = new Date();
    const results: VisaInfo[] = [];

    // 优先查询永久居民身份
    if (permanentResidencyCode) {
      const prPolicies = await this.visaPolicyRepository.find({
        where: {
          destinationCountryCode: destinationCountry.toUpperCase(),
          applicantType: 'permanent_resident',
          applicantCountryCode: permanentResidencyCode.toUpperCase(),
          isActive: true,
        },
      });

      // 过滤有效日期
      const validPrPolicies = prPolicies.filter((policy) => {
        if (policy.effectiveDate && policy.effectiveDate > now) return false;
        if (policy.expiryDate && policy.expiryDate < now) return false;
        return true;
      });

      results.push(...validPrPolicies.map(this.mapToVisaInfo));
    }

    // 查询国籍信息
    if (nationalityCode) {
      const nationalityPolicies = await this.visaPolicyRepository.find({
        where: {
          destinationCountryCode: destinationCountry.toUpperCase(),
          applicantType: 'nationality',
          applicantCountryCode: nationalityCode.toUpperCase(),
          isActive: true,
        },
      });

      // 过滤有效日期
      const validNationalityPolicies = nationalityPolicies.filter((policy) => {
        if (policy.effectiveDate && policy.effectiveDate > now) return false;
        if (policy.expiryDate && policy.expiryDate < now) return false;
        return true;
      });

      results.push(...validNationalityPolicies.map(this.mapToVisaInfo));
    }

    // 写入 Redis 缓存（24小时）
    if (this.useRedisCache && this.redisClient) {
      try {
        await this.redisClient.setex(
          cacheKey,
          this.visaCacheTtlSeconds,
          JSON.stringify(results),
        );
        this.logger.debug(`Redis cache set for visa info: ${cacheKey}`);
      } catch (error) {
        this.logger.warn(`Redis cache write error for ${cacheKey}:`, error);
      }
    }

    return results;
  }

  /**
   * 多目的地签证分析
   */
  async analyzeMultiDestinationVisa(
    request: MultiDestinationAnalysisRequestDto,
  ): Promise<MultiDestinationAnalysisResponse> {
    const { destinationCountries, nationalityCode, permanentResidencyCode } =
      request;

    const allCountries = destinationCountries.map((c) => c.toUpperCase());
    const now = new Date();

    // 查询所有目的地的签证信息
    const allVisaInfos: Array<VisaInfo & { country: string }> = [];

    for (const country of allCountries) {
      const visaInfos = await this.getVisaInfo(
        country,
        nationalityCode,
        permanentResidencyCode,
      );
      allVisaInfos.push(
        ...visaInfos.map((info) => ({ ...info, country })),
      );
    }

    // 识别需要签证的国家
    const requiredVisas: RequiredVisa[] = [];
    const visaFreeCountries: string[] = [];
    const visaOnArrivalCountries: string[] = [];
    const eVisaCountries: string[] = [];
    const visaRequiredCountries: string[] = [];

    for (const info of allVisaInfos) {
      switch (info.visaType) {
        case 'visa-free':
          if (!visaFreeCountries.includes(info.country)) {
            visaFreeCountries.push(info.country);
          }
          break;
        case 'visa-on-arrival':
          if (!visaOnArrivalCountries.includes(info.country)) {
            visaOnArrivalCountries.push(info.country);
          }
          break;
        case 'e-visa':
          if (!eVisaCountries.includes(info.country)) {
            eVisaCountries.push(info.country);
          }
          break;
        case 'visa-required':
          if (!visaRequiredCountries.includes(info.country)) {
            visaRequiredCountries.push(info.country);
          }
          break;
      }
    }

    // 构建需要签证的列表
    if (visaOnArrivalCountries.length > 0) {
      requiredVisas.push({
        name: '落地签',
        description: '可以在抵达时办理签证',
        countries: visaOnArrivalCountries,
        visaInfo: allVisaInfos
          .filter((info) => info.visaType === 'visa-on-arrival')
          .map(({ country, ...info }) => info),
      });
    }

    if (eVisaCountries.length > 0) {
      requiredVisas.push({
        name: '电子签证',
        description: '需要提前在线申请电子签证',
        countries: eVisaCountries,
        visaInfo: allVisaInfos
          .filter((info) => info.visaType === 'e-visa')
          .map(({ country, ...info }) => info),
      });
    }

    if (visaRequiredCountries.length > 0) {
      requiredVisas.push({
        name: '需要提前办理签证',
        description: '需要提前在使领馆或签证中心办理签证',
        countries: visaRequiredCountries,
        visaInfo: allVisaInfos
          .filter((info) => info.visaType === 'visa-required')
          .map(({ country, ...info }) => info),
      });
    }

    // 查询签证联盟
    const unions = await this.visaUnionRepository.find({
      relations: ['countries'],
    });

    const groupedByUnion: Record<string, UnionGroup> = {};

    for (const union of unions) {
      const unionCountries = union.countries.map((c) => c.countryCode);
      const matchingCountries = allCountries.filter((c) =>
        unionCountries.includes(c),
      );

      if (matchingCountries.length > 0) {
        groupedByUnion[union.unionKey] = {
          unionName: union.unionName,
          description: union.description || '',
          countries: matchingCountries,
        };
      }
    }

    // 生成摘要
    const summaryParts: string[] = [];
    if (visaFreeCountries.length > 0) {
      summaryParts.push(
        `${visaFreeCountries.length}个国家免签：${visaFreeCountries.join(', ')}`,
      );
    }
    if (visaOnArrivalCountries.length > 0) {
      summaryParts.push(
        `${visaOnArrivalCountries.length}个国家可落地签：${visaOnArrivalCountries.join(', ')}`,
      );
    }
    if (eVisaCountries.length > 0) {
      summaryParts.push(
        `${eVisaCountries.length}个国家可电子签：${eVisaCountries.join(', ')}`,
      );
    }
    if (visaRequiredCountries.length > 0) {
      summaryParts.push(
        `${visaRequiredCountries.length}个国家需要提前办理签证：${visaRequiredCountries.join(', ')}`,
      );
    }

    const summary = summaryParts.join('；') || '暂无签证信息';

    return {
      allCountries,
      requiredVisas,
      groupedByUnion,
      summary,
    };
  }

  /**
   * 获取所有签证政策（管理接口）
   */
  async listPolicies(query: VisaPolicyQueryDto) {
    const {
      page = 1,
      limit = 20,
      destinationCountryCode,
      applicantType,
      applicantCountryCode,
      visaType,
      isActive,
      language,
    } = query;

    const qb = this.visaPolicyRepository.createQueryBuilder('policy');

    if (destinationCountryCode) {
      qb.andWhere('policy.destinationCountryCode = :code', {
        code: destinationCountryCode.toUpperCase(),
      });
    }

    if (applicantType) {
      qb.andWhere('policy.applicantType = :type', { type: applicantType });
    }

    if (applicantCountryCode) {
      qb.andWhere('policy.applicantCountryCode = :code', {
        code: applicantCountryCode.toUpperCase(),
      });
    }

    if (visaType) {
      qb.andWhere('policy.visaType = :visaType', { visaType });
    }

    if (isActive !== undefined) {
      qb.andWhere('policy.isActive = :isActive', { isActive });
    }

    if (language) {
      qb.andWhere('policy.language = :language', { language });
    }

    qb.orderBy('policy.lastUpdatedAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * 创建签证政策
   */
  async createPolicy(
    dto: CreateVisaPolicyDto,
    updatedBy?: string,
  ): Promise<VisaPolicyEntity> {
    const policy = this.visaPolicyRepository.create({
      ...dto,
      destinationCountryCode: dto.destinationCountryCode.toUpperCase(),
      applicantCountryCode: dto.applicantCountryCode.toUpperCase(),
      language: dto.language || 'zh-CN',
      effectiveDate: dto.effectiveDate
        ? new Date(dto.effectiveDate)
        : undefined,
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      updatedBy: updatedBy || dto.updatedBy,
      isActive: dto.isActive ?? true,
    });

    const saved = await this.visaPolicyRepository.save(policy);

    // 清除相关缓存（当政策创建时）
    await this.invalidateVisaCache(saved.destinationCountryCode, saved.applicantCountryCode);

    // 记录历史
    await this.visaPolicyHistoryRepository.save({
      policyId: saved.id,
      action: 'created',
      newData: saved as unknown as Record<string, unknown>,
      changedBy: updatedBy || dto.updatedBy,
    });

    return saved;
  }

  /**
   * 更新签证政策
   */
  async updatePolicy(
    id: number,
    dto: UpdateVisaPolicyDto,
    updatedBy?: string,
  ): Promise<VisaPolicyEntity> {
    const policy = await this.visaPolicyRepository.findOne({
      where: { id },
    });

    if (!policy) {
      throw new NotFoundException(`签证政策 #${id} 不存在`);
    }

    const oldData = { ...policy };

    // 更新字段
    if (dto.destinationCountryCode !== undefined) {
      policy.destinationCountryCode = dto.destinationCountryCode.toUpperCase();
    }
    if (dto.destinationCountryName !== undefined) {
      policy.destinationCountryName = dto.destinationCountryName;
    }
    if (dto.applicantType !== undefined) {
      policy.applicantType = dto.applicantType;
    }
    if (dto.applicantCountryCode !== undefined) {
      policy.applicantCountryCode = dto.applicantCountryCode.toUpperCase();
    }
    if (dto.applicantDescription !== undefined) {
      policy.applicantDescription = dto.applicantDescription;
    }
    if (dto.visaType !== undefined) {
      policy.visaType = dto.visaType;
    }
    if (dto.description !== undefined) {
      policy.description = dto.description;
    }
    if (dto.language !== undefined) {
      policy.language = dto.language;
    }
    if (dto.durationDays !== undefined) {
      policy.durationDays = dto.durationDays;
    }
    if (dto.applicationUrl !== undefined) {
      policy.applicationUrl = dto.applicationUrl;
    }
    if (dto.isActive !== undefined) {
      policy.isActive = dto.isActive;
    }
    if (dto.effectiveDate !== undefined) {
      policy.effectiveDate = dto.effectiveDate
        ? new Date(dto.effectiveDate)
        : undefined;
    }
    if (dto.expiryDate !== undefined) {
      policy.expiryDate = dto.expiryDate
        ? new Date(dto.expiryDate)
        : undefined;
    }
    if (updatedBy || dto.updatedBy) {
      policy.updatedBy = updatedBy || dto.updatedBy;
    }

    const saved = await this.visaPolicyRepository.save(policy);

    // 清除相关缓存（当政策更新时）
    await this.invalidateVisaCache(saved.destinationCountryCode, saved.applicantCountryCode);

    // 记录历史
    await this.visaPolicyHistoryRepository.save({
      policyId: saved.id,
      action: 'updated',
      oldData: oldData as unknown as Record<string, unknown>,
      newData: saved as unknown as Record<string, unknown>,
      changedBy: updatedBy || dto.updatedBy,
    });

    return saved;
  }

  /**
   * 删除签证政策（软删除）
   */
  async deletePolicy(id: number, updatedBy?: string): Promise<void> {
    const policy = await this.visaPolicyRepository.findOne({
      where: { id },
    });

    if (!policy) {
      throw new NotFoundException(`签证政策 #${id} 不存在`);
    }

    const oldData = { ...policy };
    policy.isActive = false;

    await this.visaPolicyRepository.save(policy);

    // 记录历史
    await this.visaPolicyHistoryRepository.save({
      policyId: id,
      action: 'deleted',
      oldData: oldData as unknown as Record<string, unknown>,
      newData: policy as unknown as Record<string, unknown>,
      changedBy: updatedBy,
    });
  }

  /**
   * 获取政策变更历史
   */
  async getPolicyHistory(id: number) {
    return this.visaPolicyHistoryRepository.find({
      where: { policyId: id },
      order: { changedAt: 'DESC' },
    });
  }

  /**
   * 将实体映射为 VisaInfo
   */
  private mapToVisaInfo(policy: VisaPolicyEntity): VisaInfo {
    return {
      destinationCountry: policy.destinationCountryCode,
      destinationName: policy.destinationCountryName,
      visaType: policy.visaType,
      applicableTo: policy.applicantDescription,
      description: policy.description,
      duration: policy.durationDays,
      applicationUrl: policy.applicationUrl,
    };
  }

  /**
   * 清除签证政策缓存
   * 当政策创建、更新或删除时调用
   */
  private async invalidateVisaCache(
    destinationCountryCode: string,
    applicantCountryCode: string,
  ): Promise<void> {
    if (!this.useRedisCache || !this.redisClient) {
      return;
    }

    try {
      // 清除所有相关的缓存键（使用模式匹配）
      const pattern = `visa:${destinationCountryCode.toUpperCase()}:*:${applicantCountryCode.toUpperCase()}`;
      const keys = await this.redisClient.keys(pattern);
      if (keys.length > 0) {
        await this.redisClient.del(...keys);
        this.logger.debug(`Cleared ${keys.length} visa cache entries for ${destinationCountryCode} -> ${applicantCountryCode}`);
      }
    } catch (error) {
      this.logger.warn('Failed to invalidate visa cache:', error);
    }
  }
}

