import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';
import { CountryEntity } from '../persistence/entities/reference.entity';
import {
  CreateCountryRequestDto,
  UpdateCountryRequestDto,
  CountryResponseDto,
  CountryListResponseDto,
  CountryAdminResponseDto,
  BatchCreateCountryRequestDto,
  BatchCreateCountryResponseDto,
  BatchCreateCountryResultDto,
} from './dto/country-admin.dto';

@Injectable()
export class CountryAdminService {
  private readonly logger = new Logger(CountryAdminService.name);

  constructor(
    @InjectRepository(CountryEntity)
    private readonly countryRepository: Repository<CountryEntity>,
  ) {}

  /**
   * 创建国家
   */
  async createCountry(
    dto: CreateCountryRequestDto,
  ): Promise<{ success: boolean; data: CountryResponseDto; message?: string }> {
    // 检查国家代码是否已存在
    const existing = await this.countryRepository.findOne({
      where: { isoCode: dto.isoCode.toUpperCase() },
    });

    if (existing) {
      throw new ConflictException(`国家代码 ${dto.isoCode} 已存在`);
    }

    const country = this.countryRepository.create({
      isoCode: dto.isoCode.toUpperCase(),
      name: dto.name,
      visaSummary: dto.visaSummary,
      metadata: dto.metadata,
    });

    const saved = await this.countryRepository.save(country);

    return {
      success: true,
      data: this.mapCountryToDto(saved),
      message: '创建成功',
    };
  }

  /**
   * 获取国家列表
   */
  async getCountries(
    page: number = 1,
    limit: number = 20,
    search?: string,
  ): Promise<CountryListResponseDto> {
    const skip = (page - 1) * limit;

    const queryBuilder = this.countryRepository.createQueryBuilder('country');

    if (search) {
      queryBuilder.where(
        '(country.isoCode ILIKE :search OR country.name ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const total = await queryBuilder.getCount();
    const countries = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('country.isoCode', 'ASC')
      .getMany();

    return {
      data: countries.map((c) => this.mapCountryToDto(c)),
      total,
      page,
      limit,
    };
  }

  /**
   * 根据 ID 获取国家
   */
  async getCountryById(
    id: string,
  ): Promise<{ success: boolean; data: CountryResponseDto; message?: string }> {
    const country = await this.countryRepository.findOne({
      where: { id },
    });

    if (!country) {
      throw new NotFoundException('国家不存在');
    }

    return {
      success: true,
      data: this.mapCountryToDto(country),
      message: '获取成功',
    };
  }

  /**
   * 更新国家
   */
  async updateCountry(
    id: string,
    dto: UpdateCountryRequestDto,
  ): Promise<{ success: boolean; data: CountryResponseDto; message?: string }> {
    const country = await this.countryRepository.findOne({
      where: { id },
    });

    if (!country) {
      throw new NotFoundException('国家不存在');
    }

    // 如果更新国家代码，检查是否冲突
    if (dto.isoCode && dto.isoCode.toUpperCase() !== country.isoCode) {
      const existing = await this.countryRepository.findOne({
        where: { isoCode: dto.isoCode.toUpperCase() },
      });

      if (existing) {
        throw new ConflictException(`国家代码 ${dto.isoCode} 已存在`);
      }

      country.isoCode = dto.isoCode.toUpperCase();
    }

    // 更新其他字段
    if (dto.name !== undefined) {
      country.name = dto.name;
    }
    if (dto.visaSummary !== undefined) {
      country.visaSummary = dto.visaSummary;
    }
    if (dto.metadata !== undefined) {
      country.metadata = dto.metadata;
    }

    const updated = await this.countryRepository.save(country);

    return {
      success: true,
      data: this.mapCountryToDto(updated),
      message: '更新成功',
    };
  }

  /**
   * 删除国家
   */
  async deleteCountry(
    id: string,
  ): Promise<{ success: boolean; message?: string }> {
    const country = await this.countryRepository.findOne({
      where: { id },
    });

    if (!country) {
      throw new NotFoundException('国家不存在');
    }

    await this.countryRepository.remove(country);

    return {
      success: true,
      message: '删除成功',
    };
  }

  /**
   * 批量创建国家
   */
  async batchCreateCountries(
    dto: BatchCreateCountryRequestDto,
  ): Promise<BatchCreateCountryResponseDto> {
    const result: BatchCreateCountryResultDto = {
      created: 0,
      skipped: 0,
      failed: 0,
      errors: [],
      data: [],
    };

    if (!dto.countries || dto.countries.length === 0) {
      return {
        success: true,
        data: result,
        message: '没有需要导入的数据',
      };
    }

    // 批量检查已存在的国家
    const isoCodes = dto.countries.map((c) => c.isoCode.toUpperCase());
    const existingCountries = await this.countryRepository.find({
      where: isoCodes.map((code) => ({ isoCode: code })),
    });
    const existingIsoCodes = new Set(
      existingCountries.map((c) => c.isoCode),
    );

    // 批量处理
    const countriesToCreate: CountryEntity[] = [];

    for (const countryDto of dto.countries) {
      try {
        const isoCode = countryDto.isoCode.toUpperCase();

        // 检查国家代码是否已存在
        if (existingIsoCodes.has(isoCode)) {
          result.skipped++;
          this.logger.debug(`跳过已存在的国家: ${isoCode}`);
          continue;
        }

        // 创建新国家
        const country = this.countryRepository.create({
          isoCode,
          name: countryDto.name,
          visaSummary: countryDto.visaSummary,
          metadata: countryDto.metadata,
        });

        countriesToCreate.push(country);
      } catch (error) {
        result.failed++;
        const errorMessage =
          error instanceof Error ? error.message : '未知错误';
        result.errors.push({
          isoCode: countryDto.isoCode.toUpperCase(),
          error: errorMessage,
        });
        this.logger.error(
          `批量创建国家失败: ${countryDto.isoCode}`,
          error,
        );
      }
    }

    // 批量保存
    if (countriesToCreate.length > 0) {
      const saved = await this.countryRepository.save(countriesToCreate);
      result.data = saved.map((c) => this.mapCountryToDto(c));
      result.created = saved.length;
    }

    return {
      success: true,
      data: result,
      message: `批量导入完成: 成功 ${result.created} 个, 跳过 ${result.skipped} 个, 失败 ${result.failed} 个`,
    };
  }

  /**
   * 映射实体到 DTO
   */
  private mapCountryToDto(country: CountryEntity): CountryResponseDto {
    return {
      id: country.id,
      isoCode: country.isoCode,
      name: country.name,
      visaSummary: country.visaSummary,
      metadata: country.metadata,
      createdAt: country.createdAt.toISOString(),
      updatedAt: country.updatedAt.toISOString(),
    };
  }
}

