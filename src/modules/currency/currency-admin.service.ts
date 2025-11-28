import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';
import {
  CurrencyEntity,
  CountryCurrencyMappingEntity,
} from '../persistence/entities/reference.entity';
import {
  CreateCurrencyRequestDto,
  UpdateCurrencyRequestDto,
  CurrencyResponseDto,
  CreateCountryCurrencyMappingRequestDto,
  UpdateCountryCurrencyMappingRequestDto,
  CountryCurrencyMappingResponseDto,
  CurrencyListResponseDto,
  CountryCurrencyMappingListResponseDto,
} from './dto/currency-admin.dto';
import { CurrencyService } from './currency.service';

@Injectable()
export class CurrencyAdminService {
  private readonly logger = new Logger(CurrencyAdminService.name);

  constructor(
    @InjectRepository(CurrencyEntity)
    private readonly currencyRepository: Repository<CurrencyEntity>,
    @InjectRepository(CountryCurrencyMappingEntity)
    private readonly mappingRepository: Repository<CountryCurrencyMappingEntity>,
    @Optional() @Inject(CurrencyService)
    private readonly currencyService?: CurrencyService,
  ) {}

  // ==================== 货币管理 ====================

  /**
   * 创建货币
   */
  async createCurrency(
    dto: CreateCurrencyRequestDto,
  ): Promise<{ success: boolean; data: CurrencyResponseDto; message?: string }> {
    // 检查货币代码是否已存在
    const existing = await this.currencyRepository.findOne({
      where: { code: dto.code.toUpperCase() },
    });

    if (existing) {
      throw new ConflictException(`货币代码 ${dto.code} 已存在`);
    }

    const currency = this.currencyRepository.create({
      code: dto.code.toUpperCase(),
      symbol: dto.symbol,
      nameZh: dto.nameZh,
      nameEn: dto.nameEn,
      isActive: dto.isActive ?? true,
      metadata: dto.metadata,
    });

    const saved = await this.currencyRepository.save(currency);

    // 刷新 CurrencyService 缓存
    if (this.currencyService) {
      await this.currencyService.refreshCache().catch((err) => {
        this.logger.warn('刷新货币缓存失败', err);
      });
    }

    return {
      success: true,
      data: this.mapCurrencyToDto(saved),
      message: '创建成功',
    };
  }

  /**
   * 获取货币列表
   */
  async getCurrencies(
    page: number = 1,
    limit: number = 20,
    search?: string,
    isActive?: boolean,
  ): Promise<CurrencyListResponseDto> {
    const skip = (page - 1) * limit;
    const where: FindOptionsWhere<CurrencyEntity> = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const queryBuilder = this.currencyRepository.createQueryBuilder('currency');

    if (search) {
      queryBuilder.where(
        '(currency.code ILIKE :search OR currency.nameZh ILIKE :search OR currency.nameEn ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('currency.isActive = :isActive', { isActive });
    }

    const total = await queryBuilder.getCount();
    const currencies = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('currency.code', 'ASC')
      .getMany();

    return {
      data: currencies.map((c) => this.mapCurrencyToDto(c)),
      total,
      page,
      limit,
    };
  }

  /**
   * 根据 ID 获取货币
   */
  async getCurrencyById(
    id: string,
  ): Promise<{ success: boolean; data: CurrencyResponseDto; message?: string }> {
    const currency = await this.currencyRepository.findOne({
      where: { id },
    });

    if (!currency) {
      throw new NotFoundException('货币不存在');
    }

    return {
      success: true,
      data: this.mapCurrencyToDto(currency),
      message: '获取成功',
    };
  }

  /**
   * 更新货币
   */
  async updateCurrency(
    id: string,
    dto: UpdateCurrencyRequestDto,
  ): Promise<{ success: boolean; data: CurrencyResponseDto; message?: string }> {
    const currency = await this.currencyRepository.findOne({
      where: { id },
    });

    if (!currency) {
      throw new NotFoundException('货币不存在');
    }

    // 如果更新货币代码，检查是否冲突
    if (dto.code && dto.code.toUpperCase() !== currency.code) {
      const existing = await this.currencyRepository.findOne({
        where: { code: dto.code.toUpperCase() },
      });

      if (existing) {
        throw new ConflictException(`货币代码 ${dto.code} 已存在`);
      }
    }

    // 更新字段
    if (dto.code !== undefined) {
      currency.code = dto.code.toUpperCase();
    }
    if (dto.symbol !== undefined) {
      currency.symbol = dto.symbol;
    }
    if (dto.nameZh !== undefined) {
      currency.nameZh = dto.nameZh;
    }
    if (dto.nameEn !== undefined) {
      currency.nameEn = dto.nameEn;
    }
    if (dto.isActive !== undefined) {
      currency.isActive = dto.isActive;
    }
    if (dto.metadata !== undefined) {
      currency.metadata = dto.metadata;
    }

    const updated = await this.currencyRepository.save(currency);

    // 刷新 CurrencyService 缓存
    if (this.currencyService) {
      await this.currencyService.refreshCache().catch((err) => {
        this.logger.warn('刷新货币缓存失败', err);
      });
    }

    return {
      success: true,
      data: this.mapCurrencyToDto(updated),
      message: '更新成功',
    };
  }

  /**
   * 删除货币
   */
  async deleteCurrency(id: string): Promise<{ success: boolean; message?: string }> {
    const currency = await this.currencyRepository.findOne({
      where: { id },
    });

    if (!currency) {
      throw new NotFoundException('货币不存在');
    }

    // 检查是否有国家映射使用此货币
    const mappings = await this.mappingRepository.count({
      where: { currencyId: id },
    });

    if (mappings > 0) {
      throw new BadRequestException(
        `无法删除货币：仍有 ${mappings} 个国家映射使用此货币`,
      );
    }

    await this.currencyRepository.remove(currency);

    // 刷新 CurrencyService 缓存
    if (this.currencyService) {
      await this.currencyService.refreshCache().catch((err) => {
        this.logger.warn('刷新货币缓存失败', err);
      });
    }

    return {
      success: true,
      message: '删除成功',
    };
  }

  // ==================== 国家货币映射管理 ====================

  /**
   * 创建国家货币映射
   */
  async createCountryCurrencyMapping(
    dto: CreateCountryCurrencyMappingRequestDto,
  ): Promise<{
    success: boolean;
    data: CountryCurrencyMappingResponseDto;
    message?: string;
  }> {
    // 检查国家代码是否已存在
    const existing = await this.mappingRepository.findOne({
      where: { countryCode: dto.countryCode.toUpperCase() },
    });

    if (existing) {
      throw new ConflictException(`国家代码 ${dto.countryCode} 的映射已存在`);
    }

    // 验证货币是否存在
    const currency = await this.currencyRepository.findOne({
      where: { id: dto.currencyId },
    });

    if (!currency) {
      throw new NotFoundException('货币不存在');
    }

    const mapping = this.mappingRepository.create({
      countryCode: dto.countryCode.toUpperCase(),
      currencyId: dto.currencyId,
      currencyCode: currency.code,
      countryNames: dto.countryNames,
      isActive: dto.isActive ?? true,
      metadata: dto.metadata,
    });

    const saved = await this.mappingRepository.save(mapping);

    // 刷新 CurrencyService 缓存
    if (this.currencyService) {
      await this.currencyService.refreshCache().catch((err) => {
        this.logger.warn('刷新货币缓存失败', err);
      });
    }

    return {
      success: true,
      data: this.mapMappingToDto(saved),
      message: '创建成功',
    };
  }

  /**
   * 获取国家货币映射列表
   */
  async getCountryCurrencyMappings(
    page: number = 1,
    limit: number = 20,
    search?: string,
    isActive?: boolean,
  ): Promise<CountryCurrencyMappingListResponseDto> {
    const skip = (page - 1) * limit;

    const queryBuilder = this.mappingRepository
      .createQueryBuilder('mapping')
      .leftJoinAndSelect('mapping.currencyId', 'currency');

    if (search) {
      queryBuilder.where(
        '(mapping.countryCode ILIKE :search OR mapping.currencyCode ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('mapping.isActive = :isActive', { isActive });
    }

    const total = await queryBuilder.getCount();
    const mappings = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('mapping.countryCode', 'ASC')
      .getMany();

    return {
      data: mappings.map((m) => this.mapMappingToDto(m)),
      total,
      page,
      limit,
    };
  }

  /**
   * 根据 ID 获取国家货币映射
   */
  async getCountryCurrencyMappingById(
    id: string,
  ): Promise<{
    success: boolean;
    data: CountryCurrencyMappingResponseDto;
    message?: string;
  }> {
    const mapping = await this.mappingRepository.findOne({
      where: { id },
    });

    if (!mapping) {
      throw new NotFoundException('国家货币映射不存在');
    }

    return {
      success: true,
      data: this.mapMappingToDto(mapping),
      message: '获取成功',
    };
  }

  /**
   * 更新国家货币映射
   */
  async updateCountryCurrencyMapping(
    id: string,
    dto: UpdateCountryCurrencyMappingRequestDto,
  ): Promise<{
    success: boolean;
    data: CountryCurrencyMappingResponseDto;
    message?: string;
  }> {
    const mapping = await this.mappingRepository.findOne({
      where: { id },
    });

    if (!mapping) {
      throw new NotFoundException('国家货币映射不存在');
    }

    // 如果更新国家代码，检查是否冲突
    if (dto.countryCode && dto.countryCode.toUpperCase() !== mapping.countryCode) {
      const existing = await this.mappingRepository.findOne({
        where: { countryCode: dto.countryCode.toUpperCase() },
      });

      if (existing) {
        throw new ConflictException(`国家代码 ${dto.countryCode} 的映射已存在`);
      }
    }

    // 如果更新货币ID，验证货币是否存在并更新货币代码
    if (dto.currencyId && dto.currencyId !== mapping.currencyId) {
      const currency = await this.currencyRepository.findOne({
        where: { id: dto.currencyId },
      });

      if (!currency) {
        throw new NotFoundException('货币不存在');
      }

      mapping.currencyId = dto.currencyId;
      mapping.currencyCode = currency.code;
    }

    // 更新其他字段
    if (dto.countryCode !== undefined) {
      mapping.countryCode = dto.countryCode.toUpperCase();
    }
    if (dto.countryNames !== undefined) {
      mapping.countryNames = dto.countryNames;
    }
    if (dto.isActive !== undefined) {
      mapping.isActive = dto.isActive;
    }
    if (dto.metadata !== undefined) {
      mapping.metadata = dto.metadata;
    }

    const updated = await this.mappingRepository.save(mapping);

    // 刷新 CurrencyService 缓存
    if (this.currencyService) {
      await this.currencyService.refreshCache().catch((err) => {
        this.logger.warn('刷新货币缓存失败', err);
      });
    }

    return {
      success: true,
      data: this.mapMappingToDto(updated),
      message: '更新成功',
    };
  }

  /**
   * 删除国家货币映射
   */
  async deleteCountryCurrencyMapping(
    id: string,
  ): Promise<{ success: boolean; message?: string }> {
    const mapping = await this.mappingRepository.findOne({
      where: { id },
    });

    if (!mapping) {
      throw new NotFoundException('国家货币映射不存在');
    }

    await this.mappingRepository.remove(mapping);

    // 刷新 CurrencyService 缓存
    if (this.currencyService) {
      await this.currencyService.refreshCache().catch((err) => {
        this.logger.warn('刷新货币缓存失败', err);
      });
    }

    return {
      success: true,
      message: '删除成功',
    };
  }

  // ==================== 辅助方法 ====================

  private mapCurrencyToDto(currency: CurrencyEntity): CurrencyResponseDto {
    return {
      id: currency.id,
      code: currency.code,
      symbol: currency.symbol,
      nameZh: currency.nameZh,
      nameEn: currency.nameEn,
      isActive: currency.isActive,
      metadata: currency.metadata,
      createdAt: currency.createdAt.toISOString(),
      updatedAt: currency.updatedAt.toISOString(),
    };
  }

  private mapMappingToDto(
    mapping: CountryCurrencyMappingEntity,
  ): CountryCurrencyMappingResponseDto {
    return {
      id: mapping.id,
      countryCode: mapping.countryCode,
      currencyId: mapping.currencyId,
      currencyCode: mapping.currencyCode,
      countryNames: mapping.countryNames,
      isActive: mapping.isActive,
      metadata: mapping.metadata,
      createdAt: mapping.createdAt.toISOString(),
      updatedAt: mapping.updatedAt.toISOString(),
    };
  }
}

