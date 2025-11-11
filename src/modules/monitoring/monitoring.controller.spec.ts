import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { MonitoringController } from './monitoring.controller';
import { MetricsService } from './metrics.service';

describe('MonitoringController', () => {
  let controller: MonitoringController;
  let healthService: jest.Mocked<HealthCheckService>;
  let typeOrmIndicator: jest.Mocked<TypeOrmHealthIndicator>;
  let metricsService: jest.Mocked<MetricsService>;

  beforeEach(async () => {
    healthService = {
      check: jest.fn(),
    } as unknown as jest.Mocked<HealthCheckService>;

    typeOrmIndicator = {
      pingCheck: jest.fn().mockResolvedValue({ database: { status: 'up' } }),
    } as unknown as jest.Mocked<TypeOrmHealthIndicator>;

    metricsService = {
      getMetrics: jest.fn().mockResolvedValue('# HELP tripmind_info 1'),
    } as unknown as jest.Mocked<MetricsService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MonitoringController],
      providers: [
        { provide: HealthCheckService, useValue: healthService },
        { provide: TypeOrmHealthIndicator, useValue: typeOrmIndicator },
        { provide: MetricsService, useValue: metricsService },
      ],
    }).compile();

    controller = module.get<MonitoringController>(MonitoringController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('返回健康检查结果并调用数据库指示器', async () => {
    healthService.check.mockImplementation(async (indicators) => {
      await indicators[0]();
      return { status: 'ok' } as any;
    });

    const result = await controller.check();

    expect(typeOrmIndicator.pingCheck).toHaveBeenCalled();
    expect(result).toEqual({ status: 'ok' });
  });

  it('返回 Prometheus 指标文本', async () => {
    metricsService.getMetrics.mockResolvedValue('# HELP tripmind_up 1');

    await expect(controller.metrics()).resolves.toBe('# HELP tripmind_up 1');
    expect(metricsService.getMetrics).toHaveBeenCalled();
  });
});
