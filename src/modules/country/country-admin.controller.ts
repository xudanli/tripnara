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
import { CountryAdminService } from './country-admin.service';
import {
  CreateCountryRequestDto,
  UpdateCountryRequestDto,
  CountryResponseDto,
  CountryListResponseDto,
  CountryAdminResponseDto,
  BatchCreateCountryRequestDto,
  BatchCreateCountryResponseDto,
} from './dto/country-admin.dto';

@ApiTags('Country Admin')
@Controller('v1/admin/countries')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class CountryAdminController {
  constructor(private readonly adminService: CountryAdminService) {}

  @Post()
  @ApiOperation({
    summary: '创建国家',
    description: '创建新的国家信息',
  })
  @ApiOkResponse({ type: CountryAdminResponseDto })
  async createCountry(
    @Body() dto: CreateCountryRequestDto,
  ): Promise<CountryAdminResponseDto> {
    return this.adminService.createCountry(dto);
  }

  @Get()
  @ApiOperation({
    summary: '获取国家列表',
    description: '获取国家列表，支持分页和搜索',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiOkResponse({ type: CountryListResponseDto })
  async getCountries(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ): Promise<CountryListResponseDto> {
    return this.adminService.getCountries(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      search,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: '获取国家详情',
    description: '根据 ID 获取国家详细信息',
  })
  @ApiParam({ name: 'id', description: '国家ID' })
  @ApiOkResponse({ type: CountryAdminResponseDto })
  async getCountryById(
    @Param('id') id: string,
  ): Promise<CountryAdminResponseDto> {
    return this.adminService.getCountryById(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: '更新国家',
    description: '更新国家信息（完整更新）',
  })
  @ApiParam({ name: 'id', description: '国家ID' })
  @ApiOkResponse({ type: CountryAdminResponseDto })
  async updateCountry(
    @Param('id') id: string,
    @Body() dto: UpdateCountryRequestDto,
  ): Promise<CountryAdminResponseDto> {
    return this.adminService.updateCountry(id, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: '更新国家（部分更新）',
    description: '更新国家信息（部分更新）',
  })
  @ApiParam({ name: 'id', description: '国家ID' })
  @ApiOkResponse({ type: CountryAdminResponseDto })
  async patchCountry(
    @Param('id') id: string,
    @Body() dto: UpdateCountryRequestDto,
  ): Promise<CountryAdminResponseDto> {
    return this.adminService.updateCountry(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: '删除国家',
    description: '删除国家信息',
  })
  @ApiParam({ name: 'id', description: '国家ID' })
  @ApiOkResponse({ type: CountryAdminResponseDto })
  async deleteCountry(
    @Param('id') id: string,
  ): Promise<CountryAdminResponseDto> {
    return this.adminService.deleteCountry(id);
  }

  @Post('batch')
  @ApiOperation({
    summary: '批量创建国家',
    description: '批量创建国家信息，支持一次导入多个国家',
  })
  @ApiOkResponse({ type: BatchCreateCountryResponseDto })
  async batchCreateCountries(
    @Body() dto: BatchCreateCountryRequestDto,
  ): Promise<BatchCreateCountryResponseDto> {
    return this.adminService.batchCreateCountries(dto);
  }
}

