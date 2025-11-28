import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiOkResponse,
} from '@nestjs/swagger';
import { CurrencyAdminService } from './currency-admin.service';
import {
  CreateCurrencyRequestDto,
  UpdateCurrencyRequestDto,
  CurrencyResponseDto,
  CurrencyListResponseDto,
  CreateCountryCurrencyMappingRequestDto,
  UpdateCountryCurrencyMappingRequestDto,
  CountryCurrencyMappingResponseDto,
  CountryCurrencyMappingListResponseDto,
  CurrencyAdminResponseDto,
  BatchCreateCountryCurrencyMappingRequestDto,
  BatchCreateCountryCurrencyMappingResponseDto,
  BatchCreateCountryCurrencyMappingByCodeRequestDto,
} from './dto/currency-admin.dto';

@ApiTags('Currency Admin')
@Controller('v1/admin/currency')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class CurrencyAdminController {
  constructor(private readonly adminService: CurrencyAdminService) {}

  // ==================== 货币管理 ====================

  @Post('currencies')
  @ApiOperation({
    summary: '创建货币',
    description: '创建新的货币信息',
  })
  @ApiOkResponse({ type: CurrencyAdminResponseDto })
  async createCurrency(
    @Body() dto: CreateCurrencyRequestDto,
  ): Promise<CurrencyAdminResponseDto> {
    return this.adminService.createCurrency(dto);
  }

  @Get('currencies')
  @ApiOperation({
    summary: '获取货币列表',
    description: '获取货币列表，支持分页和搜索',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiOkResponse({ type: CurrencyListResponseDto })
  async getCurrencies(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('isActive') isActive?: boolean,
  ): Promise<CurrencyListResponseDto> {
    return this.adminService.getCurrencies(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      search,
      isActive !== undefined ? isActive === true : undefined,
    );
  }

  @Get('currencies/:id')
  @ApiOperation({
    summary: '获取货币详情',
    description: '根据 ID 获取货币详细信息',
  })
  @ApiParam({ name: 'id', description: '货币ID' })
  @ApiOkResponse({ type: CurrencyAdminResponseDto })
  async getCurrencyById(@Param('id') id: string): Promise<CurrencyAdminResponseDto> {
    return this.adminService.getCurrencyById(id);
  }

  @Put('currencies/:id')
  @ApiOperation({
    summary: '更新货币',
    description: '更新货币信息（完整更新）',
  })
  @ApiParam({ name: 'id', description: '货币ID' })
  @ApiOkResponse({ type: CurrencyAdminResponseDto })
  async updateCurrency(
    @Param('id') id: string,
    @Body() dto: UpdateCurrencyRequestDto,
  ): Promise<CurrencyAdminResponseDto> {
    return this.adminService.updateCurrency(id, dto);
  }

  @Patch('currencies/:id')
  @ApiOperation({
    summary: '更新货币（部分更新）',
    description: '更新货币信息（部分更新）',
  })
  @ApiParam({ name: 'id', description: '货币ID' })
  @ApiOkResponse({ type: CurrencyAdminResponseDto })
  async patchCurrency(
    @Param('id') id: string,
    @Body() dto: UpdateCurrencyRequestDto,
  ): Promise<CurrencyAdminResponseDto> {
    return this.adminService.updateCurrency(id, dto);
  }

  @Delete('currencies/:id')
  @ApiOperation({
    summary: '删除货币',
    description: '删除货币信息（如果存在国家映射则无法删除）',
  })
  @ApiParam({ name: 'id', description: '货币ID' })
  @ApiOkResponse({ type: CurrencyAdminResponseDto })
  async deleteCurrency(@Param('id') id: string): Promise<CurrencyAdminResponseDto> {
    return this.adminService.deleteCurrency(id);
  }

  // ==================== 国家货币映射管理 ====================

  @Post('country-mappings')
  @ApiOperation({
    summary: '创建国家货币映射',
    description: '创建国家代码与货币的映射关系',
  })
  @ApiOkResponse({ type: CurrencyAdminResponseDto })
  async createCountryCurrencyMapping(
    @Body() dto: CreateCountryCurrencyMappingRequestDto,
  ): Promise<CurrencyAdminResponseDto> {
    return this.adminService.createCountryCurrencyMapping(dto);
  }

  @Get('country-mappings')
  @ApiOperation({
    summary: '获取国家货币映射列表',
    description: '获取国家货币映射列表，支持分页和搜索',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiOkResponse({ type: CountryCurrencyMappingListResponseDto })
  async getCountryCurrencyMappings(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('isActive') isActive?: boolean,
  ): Promise<CountryCurrencyMappingListResponseDto> {
    return this.adminService.getCountryCurrencyMappings(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      search,
      isActive !== undefined ? isActive === true : undefined,
    );
  }

  @Get('country-mappings/:id')
  @ApiOperation({
    summary: '获取国家货币映射详情',
    description: '根据 ID 获取国家货币映射详细信息',
  })
  @ApiParam({ name: 'id', description: '映射ID' })
  @ApiOkResponse({ type: CurrencyAdminResponseDto })
  async getCountryCurrencyMappingById(
    @Param('id') id: string,
  ): Promise<CurrencyAdminResponseDto> {
    return this.adminService.getCountryCurrencyMappingById(id);
  }

  @Put('country-mappings/:id')
  @ApiOperation({
    summary: '更新国家货币映射',
    description: '更新国家货币映射信息（完整更新）',
  })
  @ApiParam({ name: 'id', description: '映射ID' })
  @ApiOkResponse({ type: CurrencyAdminResponseDto })
  async updateCountryCurrencyMapping(
    @Param('id') id: string,
    @Body() dto: UpdateCountryCurrencyMappingRequestDto,
  ): Promise<CurrencyAdminResponseDto> {
    return this.adminService.updateCountryCurrencyMapping(id, dto);
  }

  @Patch('country-mappings/:id')
  @ApiOperation({
    summary: '更新国家货币映射（部分更新）',
    description: '更新国家货币映射信息（部分更新）',
  })
  @ApiParam({ name: 'id', description: '映射ID' })
  @ApiOkResponse({ type: CurrencyAdminResponseDto })
  async patchCountryCurrencyMapping(
    @Param('id') id: string,
    @Body() dto: UpdateCountryCurrencyMappingRequestDto,
  ): Promise<CurrencyAdminResponseDto> {
    return this.adminService.updateCountryCurrencyMapping(id, dto);
  }

  @Delete('country-mappings/:id')
  @ApiOperation({
    summary: '删除国家货币映射',
    description: '删除国家货币映射信息',
  })
  @ApiParam({ name: 'id', description: '映射ID' })
  @ApiOkResponse({ type: CurrencyAdminResponseDto })
  async deleteCountryCurrencyMapping(
    @Param('id') id: string,
  ): Promise<CurrencyAdminResponseDto> {
    return this.adminService.deleteCountryCurrencyMapping(id);
  }

  @Post('country-mappings/batch')
  @ApiOperation({
    summary: '批量创建国家货币映射（通过货币ID）',
    description: '批量创建国家代码与货币的映射关系，需要提供货币ID',
  })
  @ApiOkResponse({ type: BatchCreateCountryCurrencyMappingResponseDto })
  async batchCreateCountryCurrencyMappings(
    @Body() dto: BatchCreateCountryCurrencyMappingRequestDto,
  ): Promise<BatchCreateCountryCurrencyMappingResponseDto> {
    return this.adminService.batchCreateCountryCurrencyMappings(dto);
  }

  @Post('country-mappings/batch-by-code')
  @ApiOperation({
    summary: '批量创建国家货币映射（通过货币代码，推荐）',
    description: '批量创建国家代码与货币的映射关系，使用货币代码而非货币ID，更便于导入',
  })
  @ApiOkResponse({ type: BatchCreateCountryCurrencyMappingResponseDto })
  async batchCreateCountryCurrencyMappingsByCode(
    @Body() dto: BatchCreateCountryCurrencyMappingByCodeRequestDto,
  ): Promise<BatchCreateCountryCurrencyMappingResponseDto> {
    return this.adminService.batchCreateCountryCurrencyMappingsByCode(dto);
  }
}

