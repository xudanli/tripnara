import { Controller, Get, Header } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

@ApiTags('Monitoring')
@Controller()
export class MonitoringController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly dbIndicator: TypeOrmHealthIndicator,
    private readonly metricsService: MetricsService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: '应用健康状态' })
  @ApiOkResponse({ description: '健康检查结果' })
  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.dbIndicator.pingCheck('database', { timeout: 1500 }),
    ]);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Prometheus 指标导出' })
  @ApiOkResponse({ description: 'Prometheus 文本格式指标' })
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async metrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }
}
