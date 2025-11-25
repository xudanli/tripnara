import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AlertsService } from './alerts.service';
import {
  CreateAlertRequestDto,
  CreateAlertResponseDto,
  GetAlertsQueryDto,
  AlertListResponseDto,
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
    description: '创建新的通用旅行安全通知（后台）',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async createAlert(
    @Body() dto: CreateAlertRequestDto,
    @CurrentUser() user: { userId: string },
  ): Promise<CreateAlertResponseDto> {
    return this.alertsService.createAlert(dto, user.userId);
  }
}

