import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LlmService } from '../llm/llm.service';
import { LocationService } from './location.service';
import { GenerateLocationRequestDto } from './dto/location.dto';

describe('LocationService', () => {
  let service: LocationService;
  let llmServiceMock: jest.Mocked<LlmService>;
  let configServiceMock: jest.Mocked<ConfigService>;

  const createService = async () => {
    llmServiceMock = {
      chatCompletionJson: jest.fn(),
    } as unknown as jest.Mocked<LlmService>;

    configServiceMock = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationService,
        { provide: LlmService, useValue: llmServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    return module.get<LocationService>(LocationService);
  };

  beforeEach(async () => {
    service = await createService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('生成位置信息成功', async () => {
    const mockAiResponse = {
      chineseName: '铁力士峰云端漫步',
      localName: 'Titlis Cliff Walk',
      chineseAddress: 'Titlis Bergstation, 6390 Engelberg, Switzerland',
      localAddress: 'Titlis Bergstation, 6390 Engelberg, Switzerland',
      transportInfo: '从琉森乘火车约45分钟至Engelberg站',
      openingHours: '全年开放，夏季8:30-17:30',
      ticketPrice: 'Cliff Walk约CHF 15',
      visitTips: '最佳游览时间：上午10点前',
      category: '景点',
      rating: 4.8,
      visitDuration: '2-3小时',
      bestTimeToVisit: '上午10点前，晴朗天气',
    };

    llmServiceMock.chatCompletionJson.mockResolvedValue(mockAiResponse);

    const dto: GenerateLocationRequestDto = {
      activityName: '铁力士峰云端漫步',
      destination: '瑞士琉森',
      activityType: 'attraction',
      coordinates: {
        lat: 46.7704,
        lng: 8.4050,
        region: '市中心区域',
      },
    };

    const result = await service.generateLocationInfo(dto);

    expect(result.chineseName).toBe('铁力士峰云端漫步');
    expect(result.localName).toBe('Titlis Cliff Walk');
    expect(result.rating).toBe(4.8);
    expect(llmServiceMock.chatCompletionJson).toHaveBeenCalled();
  });

  it('使用缓存返回结果', async () => {
    const mockAiResponse = {
      chineseName: '测试景点',
      localName: 'Test Attraction',
      chineseAddress: '测试地址',
      localAddress: 'Test Address',
      transportInfo: '交通信息',
      openingHours: '09:00-18:00',
      ticketPrice: '100元',
      visitTips: '游览建议',
      category: '景点',
      rating: 4.5,
      visitDuration: '2小时',
      bestTimeToVisit: '上午',
    };

    llmServiceMock.chatCompletionJson.mockResolvedValue(mockAiResponse);

    const dto: GenerateLocationRequestDto = {
      activityName: '测试景点',
      destination: '测试目的地',
      activityType: 'attraction',
      coordinates: { lat: 0, lng: 0 },
    };

    // 第一次调用，应该调用AI
    await service.generateLocationInfo(dto);
    expect(llmServiceMock.chatCompletionJson).toHaveBeenCalledTimes(1);

    // 第二次调用，应该使用缓存
    await service.generateLocationInfo(dto);
    expect(llmServiceMock.chatCompletionJson).toHaveBeenCalledTimes(1);
  });

  it('AI失败时使用默认信息', async () => {
    llmServiceMock.chatCompletionJson.mockRejectedValue(
      new Error('AI service error'),
    );

    const dto: GenerateLocationRequestDto = {
      activityName: '测试活动',
      destination: '测试目的地',
      activityType: 'attraction',
      coordinates: { lat: 0, lng: 0 },
    };

    const result = await service.generateLocationInfo(dto);

    expect(result.chineseName).toBe('测试活动');
    expect(result.category).toBe('景点');
    expect(result.rating).toBeGreaterThanOrEqual(1);
    expect(result.rating).toBeLessThanOrEqual(5);
  });

  it('批量生成位置信息', async () => {
    const mockAiResponse = {
      chineseName: '测试景点',
      localName: 'Test',
      chineseAddress: '地址',
      localAddress: 'Address',
      transportInfo: '交通',
      openingHours: '09:00-18:00',
      ticketPrice: '100元',
      visitTips: '建议',
      category: '景点',
      rating: 4.5,
      visitDuration: '2小时',
      bestTimeToVisit: '上午',
    };

    llmServiceMock.chatCompletionJson.mockResolvedValue(mockAiResponse);

    const activities = [
      {
        activityName: '活动1',
        destination: '目的地1',
        activityType: 'attraction' as const,
        coordinates: { lat: 0, lng: 0 },
      },
      {
        activityName: '活动2',
        destination: '目的地2',
        activityType: 'meal' as const,
        coordinates: { lat: 1, lng: 1 },
      },
    ];

    const results = await service.generateLocationBatch(activities);

    expect(results).toHaveLength(2);
    expect(results[0].activityName).toBe('活动1');
    expect(results[1].activityName).toBe('活动2');
  });
});

