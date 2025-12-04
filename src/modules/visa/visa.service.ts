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
  private readonly emptyCacheTtlSeconds = 5 * 60; // 5分钟（空结果缓存，防止穿透）
  private readonly maxCacheTtlSeconds = 24 * 60 * 60; // 最大缓存时间：24小时
  
  // Redis 熔断状态
  private redisCircuitBreakerOpen = false;
  private redisCircuitBreakerOpenTime?: Date;
  private readonly circuitBreakerTimeout = 60 * 1000; // 熔断器超时：60秒
  
  // 签证类型权重（用于最优策略选择）
  private readonly visaTypeWeights: Record<VisaType, number> = {
    'visa-free': 1, // 最优
    'visa-on-arrival': 2,
    'e-visa': 3,
    'permanent-resident-benefit': 4,
    'visa-required': 5, // 最差
  };

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
   * 性能优化：
   * 1. 使用 Redis 缓存，减少数据库查询
   * 2. 合并查询，减少数据库 I/O
   * 3. 最优策略选择：对比国籍和PR政策，返回最优结果
   * 4. 缓存穿透保护：缓存空结果
   * 5. 动态 TTL：根据政策过期时间设置缓存TTL
   * 6. Redis 熔断：故障时直接降级到数据库
   */
  async getVisaInfo(
    destinationCountry: string,
    nationalityCode?: string,
    permanentResidencyCode?: string,
  ): Promise<VisaInfo[]> {
    const destUpper = destinationCountry.toUpperCase();
    const natUpper = nationalityCode?.toUpperCase();
    const prUpper = permanentResidencyCode?.toUpperCase();
    
    // 生成缓存键
    const cacheKey = `visa:${destUpper}:${natUpper || 'none'}:${prUpper || 'none'}`;
    
    // 检查熔断器状态
    this.checkCircuitBreaker();
    
    // 尝试从 Redis 缓存读取（如果熔断器未打开）
    if (this.useRedisCache && this.redisClient && !this.redisCircuitBreakerOpen) {
      try {
        const cached = await this.redisClient.get(cacheKey);
        if (cached !== null) {
          // 检查是否是空结果标记
          if (cached === '__EMPTY__') {
            this.logger.debug(`Redis cache hit (empty) for visa info: ${cacheKey}`);
            return [];
          }
          
          const visaInfos = JSON.parse(cached) as VisaInfo[];
          this.logger.debug(`Redis cache hit for visa info: ${cacheKey}`);
          
          // 重置熔断器（成功读取）
          this.redisCircuitBreakerOpen = false;
          this.redisCircuitBreakerOpenTime = undefined;
          
          return visaInfos;
        }
      } catch (error) {
        this.logger.warn(`Redis cache read error for ${cacheKey}:`, error);
        // 打开熔断器
        this.openCircuitBreaker();
        // 继续从数据库查询
      }
    }

    // 从数据库查询
    const now = new Date();
    const destCode = destUpper;
    
    // 优化：合并查询，一次性获取所有相关策略
    const queryBuilder = this.visaPolicyRepository
      .createQueryBuilder('policy')
      .where('policy.destinationCountryCode = :destCode', { destCode })
      .andWhere('policy.isActive = :isActive', { isActive: true })
      .andWhere(
        '(policy.effectiveDate IS NULL OR policy.effectiveDate <= :now)',
        { now },
      )
      .andWhere(
        '(policy.expiryDate IS NULL OR policy.expiryDate >= :now)',
        { now },
      );

    // 构建 OR 条件：同时查询国籍和永久居民
    const orConditions: string[] = [];

    if (natUpper) {
      orConditions.push(
        "(policy.applicantType = 'nationality' AND policy.applicantCountryCode = :natCode)",
      );
      queryBuilder.setParameter('natCode', natUpper);
    }

    if (prUpper) {
      orConditions.push(
        "(policy.applicantType = 'permanent_resident' AND policy.applicantCountryCode = :prCode)",
      );
      queryBuilder.setParameter('prCode', prUpper);
    }

    if (orConditions.length === 0) {
      // 如果没有提供任何查询条件，返回空数组
      return [];
    }

    queryBuilder.andWhere(`(${orConditions.join(' OR ')})`);

    const policies = await queryBuilder.getMany();

    // 过滤有效日期（双重检查，确保时区一致性）
    const validPolicies = policies.filter((policy) => {
      if (policy.effectiveDate) {
        const effective = new Date(policy.effectiveDate);
        if (effective > now) return false;
      }
      if (policy.expiryDate) {
        const expiry = new Date(policy.expiryDate);
        if (expiry < now) return false;
      }
        return true;
      });

    // 转换为 VisaInfo
    const allResults = validPolicies.map(this.mapToVisaInfo);

    // 最优策略选择：如果同时有国籍和PR政策，选择最优的
    const results = this.selectBestPolicies(
      allResults,
      natUpper,
      prUpper,
      validPolicies,
    );

    // 计算动态 TTL
    const cacheTtl = this.calculateDynamicTtl(validPolicies, now);

    // 写入 Redis 缓存
    if (this.useRedisCache && this.redisClient && !this.redisCircuitBreakerOpen) {
      try {
        // 缓存穿透保护：如果结果为空，缓存特殊标记
        if (results.length === 0) {
          await this.redisClient.setex(
            cacheKey,
            this.emptyCacheTtlSeconds, // 空结果使用较短的TTL
            '__EMPTY__',
          );
          this.logger.debug(
            `Redis cache set (empty) for visa info: ${cacheKey}, TTL: ${this.emptyCacheTtlSeconds}s`,
          );
        } else {
        await this.redisClient.setex(
          cacheKey,
            cacheTtl,
          JSON.stringify(results),
        );
          this.logger.debug(
            `Redis cache set for visa info: ${cacheKey}, TTL: ${cacheTtl}s`,
          );
        }
        
        // 重置熔断器（成功写入）
        this.redisCircuitBreakerOpen = false;
        this.redisCircuitBreakerOpenTime = undefined;
      } catch (error) {
        this.logger.warn(`Redis cache write error for ${cacheKey}:`, error);
        // 打开熔断器
        this.openCircuitBreaker();
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

    // 清除相关缓存（当政策删除时）
    await this.invalidateVisaCache(
      policy.destinationCountryCode,
      policy.applicantCountryCode,
    );

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
   * 最优策略选择
   * 如果同时有国籍和PR政策，选择对用户最有利的策略
   */
  private selectBestPolicies(
    allResults: VisaInfo[],
    nationalityCode?: string,
    permanentResidencyCode?: string,
    policies?: VisaPolicyEntity[],
  ): VisaInfo[] {
    // 如果没有提供两个身份，直接返回所有结果
    if (!nationalityCode || !permanentResidencyCode) {
      return allResults;
    }

    // 如果没有提供 policies，无法区分国籍和PR，返回所有结果
    if (!policies || policies.length === 0) {
      return allResults;
    }

    // 分离国籍和PR政策
    const nationalityResults: VisaInfo[] = [];
    const prResults: VisaInfo[] = [];

    policies.forEach((policy, index) => {
      if (index >= allResults.length) return;
      const visaInfo = allResults[index];
      if (policy.applicantType === 'nationality') {
        nationalityResults.push(visaInfo);
      } else if (policy.applicantType === 'permanent_resident') {
        prResults.push(visaInfo);
      }
    });

    // 如果只有一种类型的政策，直接返回
    if (nationalityResults.length === 0) {
      return prResults;
    }
    if (prResults.length === 0) {
      return nationalityResults;
    }

    // 对比两种政策，选择最优的
    const bestNationality = this.getBestPolicy(nationalityResults);
    const bestPR = this.getBestPolicy(prResults);

    // 返回最优策略（如果权重相同，返回两个）
    const bestWeight = Math.min(
      this.visaTypeWeights[bestNationality.visaType],
      this.visaTypeWeights[bestPR.visaType],
    );

    const results: VisaInfo[] = [];
    if (this.visaTypeWeights[bestNationality.visaType] === bestWeight) {
      results.push(bestNationality);
    }
    if (
      this.visaTypeWeights[bestPR.visaType] === bestWeight &&
      bestPR.visaType !== bestNationality.visaType
    ) {
      results.push(bestPR);
    }

    // 如果最优策略相同，返回两个（让用户知道两种身份都可以）
    if (results.length === 0) {
      results.push(bestNationality, bestPR);
    }

    return results;
  }

  /**
   * 从多个策略中选择最优的（权重最低的）
   */
  private getBestPolicy(policies: VisaInfo[]): VisaInfo {
    if (policies.length === 0) {
      throw new Error('Cannot select best policy from empty array');
    }

    return policies.reduce((best, current) => {
      const bestWeight = this.visaTypeWeights[best.visaType];
      const currentWeight = this.visaTypeWeights[current.visaType];
      return currentWeight < bestWeight ? current : best;
    });
  }

  /**
   * 计算动态 TTL
   * 如果政策的过期时间距离现在很近，使用较短的TTL
   */
  private calculateDynamicTtl(
    policies: VisaPolicyEntity[],
    now: Date,
  ): number {
    if (policies.length === 0) {
      return this.emptyCacheTtlSeconds;
    }

    // 找到最近的过期时间
    let minTtl = this.maxCacheTtlSeconds;

    for (const policy of policies) {
      if (policy.expiryDate) {
        const expiry = new Date(policy.expiryDate);
        const secondsUntilExpiry = Math.floor(
          (expiry.getTime() - now.getTime()) / 1000,
        );

        // 如果过期时间在24小时内，使用过期时间作为TTL
        if (secondsUntilExpiry > 0 && secondsUntilExpiry < minTtl) {
          minTtl = secondsUntilExpiry;
        }
      }
    }

    // 确保TTL不会太短（至少5分钟）也不会超过最大值
    return Math.max(
      this.emptyCacheTtlSeconds,
      Math.min(minTtl, this.maxCacheTtlSeconds),
    );
  }

  /**
   * 打开 Redis 熔断器
   */
  private openCircuitBreaker(): void {
    if (!this.redisCircuitBreakerOpen) {
      this.redisCircuitBreakerOpen = true;
      this.redisCircuitBreakerOpenTime = new Date();
      this.logger.warn(
        'Redis circuit breaker opened due to connection errors',
      );
    }
  }

  /**
   * 检查并尝试关闭熔断器
   */
  private checkCircuitBreaker(): void {
    if (
      this.redisCircuitBreakerOpen &&
      this.redisCircuitBreakerOpenTime
    ) {
      const elapsed = Date.now() - this.redisCircuitBreakerOpenTime.getTime();
      if (elapsed >= this.circuitBreakerTimeout) {
        this.redisCircuitBreakerOpen = false;
        this.redisCircuitBreakerOpenTime = undefined;
        this.logger.log('Redis circuit breaker closed, attempting to reconnect');
      }
    }
  }

  /**
   * 清除签证政策缓存
   * 优化：使用通配符删除所有相关缓存（visa:JP:*）
   * 当政策创建、更新或删除时调用
   */
  private async invalidateVisaCache(
    destinationCountryCode: string,
    applicantCountryCode?: string,
  ): Promise<void> {
    if (!this.useRedisCache || !this.redisClient || this.redisCircuitBreakerOpen) {
      return;
    }

    try {
      const destUpper = destinationCountryCode.toUpperCase();
      
      // 使用通配符删除所有相关缓存
      // 模式1: visa:JP:* (删除该目的地的所有缓存)
      const pattern1 = `visa:${destUpper}:*`;
      const keys1 = await this.redisClient.keys(pattern1);
      
      // 模式2: 如果提供了申请人国家代码，也删除特定组合
      let keys2: string[] = [];
      if (applicantCountryCode) {
        const appUpper = applicantCountryCode.toUpperCase();
        const pattern2 = `visa:${destUpper}:*:${appUpper}`;
        const pattern3 = `visa:${destUpper}:${appUpper}:*`;
        keys2 = await this.redisClient.keys(pattern2);
        const keys3 = await this.redisClient.keys(pattern3);
        keys2 = [...keys2, ...keys3];
      }
      
      // 合并并去重
      const allKeys = [...new Set([...keys1, ...keys2])];
      
      if (allKeys.length > 0) {
        // 使用 pipeline 批量删除，提高性能
        const pipeline = this.redisClient.pipeline();
        allKeys.forEach((key) => pipeline.del(key));
        await pipeline.exec();
        
        this.logger.debug(
          `Cleared ${allKeys.length} visa cache entries for ${destUpper}`,
        );
      }
    } catch (error) {
      this.logger.warn('Failed to invalidate visa cache:', error);
      // 打开熔断器
      this.openCircuitBreaker();
    }
  }
}

