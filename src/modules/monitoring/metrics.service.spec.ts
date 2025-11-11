import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  it('初始化后能够返回指标字符串', async () => {
    const service = new MetricsService();
    const metrics = await service.getMetrics();
    expect(typeof metrics).toBe('string');
    expect(metrics.length).toBeGreaterThan(0);
  });
});
