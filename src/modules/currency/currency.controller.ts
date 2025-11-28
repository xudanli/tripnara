import {
  Controller,
  Get,
  Query,
  Param,
  UsePipes,
  ValidationPipe,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam, ApiResponse } from '@nestjs/swagger';
import { CurrencyService } from './currency.service';

/**
 * 货币推断响应 DTO
 */
export class CurrencyInfoDto {
  code!: string;
  symbol!: string;
  name!: string;
}

/**
 * 货币推断响应
 */
export class InferCurrencyResponseDto {
  success!: boolean;
  data!: CurrencyInfoDto;
}

@ApiTags('Currency')
@Controller('v1/currency')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Get('infer')
  @ApiOperation({
    summary: '推断货币信息',
    description: '根据国家代码、国家名称、坐标或地址推断货币信息',
  })
  @ApiQuery({
    name: 'countryCode',
    required: false,
    description: '国家代码（ISO 3166-1 alpha-2）',
    example: 'CH',
  })
  @ApiQuery({
    name: 'countryName',
    required: false,
    description: '国家名称',
    example: '瑞士',
  })
  @ApiQuery({
    name: 'lat',
    required: false,
    description: '纬度',
    example: 46.8182,
  })
  @ApiQuery({
    name: 'lng',
    required: false,
    description: '经度',
    example: 8.2275,
  })
  @ApiQuery({
    name: 'address',
    required: false,
    description: '地址',
    example: '瑞士琉森',
  })
  @ApiQuery({
    name: 'destination',
    required: false,
    description: '目的地字符串',
    example: '瑞士琉森',
  })
  @ApiQuery({
    name: 'language',
    required: false,
    description: '语言（zh/en）',
    example: 'zh',
    enum: ['zh', 'en'],
  })
  @ApiResponse({
    status: 200,
    description: '推断成功',
    type: InferCurrencyResponseDto,
  })
  async inferCurrency(
    @Query('countryCode') countryCode?: string,
    @Query('countryName') countryName?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('address') address?: string,
    @Query('destination') destination?: string,
    @Query('language') language: string = 'zh',
  ): Promise<InferCurrencyResponseDto> {
    const currency = await this.currencyService.inferCurrency(
      {
        countryCode,
        countryName,
        coordinates:
          lat && lng
            ? { lat: parseFloat(lat), lng: parseFloat(lng) }
            : undefined,
        address,
        destination,
      },
      language,
    );

    return {
      success: true,
      data: currency,
    };
  }

  @Get(':countryCode')
  @ApiOperation({
    summary: '根据国家代码获取货币信息',
    description: '根据ISO 3166-1 alpha-2国家代码获取货币信息',
  })
  @ApiParam({
    name: 'countryCode',
    description: '国家代码（ISO 3166-1 alpha-2）',
    example: 'CH',
  })
  @ApiQuery({
    name: 'language',
    required: false,
    description: '语言（zh/en）',
    example: 'zh',
    enum: ['zh', 'en'],
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: InferCurrencyResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: '未找到该国家的货币信息',
  })
  async getCurrencyByCode(
    @Param('countryCode') countryCode: string,
    @Query('language') language: string = 'zh',
  ): Promise<InferCurrencyResponseDto> {
    const currency = this.currencyService.getCurrencyByCountryCode(
      countryCode,
      language,
    );

    if (!currency) {
      throw new NotFoundException('未找到该国家的货币信息');
    }

    return {
      success: true,
      data: currency,
    };
  }
}

