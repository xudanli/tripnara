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
import { ApiOperation, ApiTags, ApiQuery, ApiParam, ApiOkResponse } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import {
  CreateAlertRequestDto,
  CreateAlertResponseDto,
  GetAlertsQueryDto,
  AlertListResponseDto,
  UpdateAlertRequestDto,
  UpdateAlertResponseDto,
  GetAlertResponseDto,
  DeleteAlertResponseDto,
} from './dto/alerts.dto';

@ApiTags('Alerts')
@Controller('v1/alerts')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @ApiOperation({
    summary: '获取安全通知列表',
    description: '根据目的地、时间段等条件查询通用旅行安全通知',
  })
  @ApiQuery({ name: 'destination', required: false, description: '目的地' })
  @ApiQuery({ name: 'countryCode', required: false, description: '国家代码' })
  @ApiQuery({ name: 'severity', required: false, enum: ['low', 'medium', 'high', 'critical'] })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'expired', 'archived'] })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAlerts(
    @Query() query: GetAlertsQueryDto,
  ): Promise<AlertListResponseDto> {
    return this.alertsService.getAlerts(query);
  }

  @Post()
  @ApiOperation({
    summary: '创建安全通知',
    description: '创建新的通用旅行安全通知（公开接口，无需认证）',
  })
  @ApiOkResponse({ type: CreateAlertResponseDto })
  async createAlert(
    @Body() dto: CreateAlertRequestDto,
  ): Promise<CreateAlertResponseDto> {
    return this.alertsService.createAlert(dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: '获取单个安全提示详情',
    description: '根据 ID 获取单个安全提示的详细信息（公开接口，无需认证）',
  })
  @ApiParam({ name: 'id', description: '安全提示 ID' })
  @ApiOkResponse({ type: GetAlertResponseDto })
  async getAlertById(
    @Param('id') id: string,
  ): Promise<GetAlertResponseDto> {
    return this.alertsService.getAlertById(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: '更新安全提示',
    description: '更新指定的安全提示（公开接口，无需认证）',
  })
  @ApiParam({ name: 'id', description: '安全提示 ID' })
  @ApiOkResponse({ type: UpdateAlertResponseDto })
  async updateAlert(
    @Param('id') id: string,
    @Body() dto: UpdateAlertRequestDto,
  ): Promise<UpdateAlertResponseDto> {
    return this.alertsService.updateAlert(id, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: '更新安全提示（部分更新）',
    description: '更新指定的安全提示（公开接口，无需认证）',
  })
  @ApiParam({ name: 'id', description: '安全提示 ID' })
  @ApiOkResponse({ type: UpdateAlertResponseDto })
  async patchAlert(
    @Param('id') id: string,
    @Body() dto: UpdateAlertRequestDto,
  ): Promise<UpdateAlertResponseDto> {
    return this.alertsService.updateAlert(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: '删除安全提示',
    description: '删除指定的安全提示（公开接口，无需认证）',
  })
  @ApiParam({ name: 'id', description: '安全提示 ID' })
  @ApiOkResponse({ type: DeleteAlertResponseDto })
  async deleteAlert(
    @Param('id') id: string,
  ): Promise<DeleteAlertResponseDto> {
    return this.alertsService.deleteAlert(id);
  }
}

