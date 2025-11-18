import { Test, TestingModule } from '@nestjs/testing';
import { LlmService } from '../llm/llm.service';
import { TravelSummaryService } from './travel-summary.service';
import { GenerateTravelSummaryRequestDto } from './dto/travel-summary.dto';

describe('TravelSummaryService', () => {
  let service: TravelSummaryService;
  let llmServiceMock: jest.Mocked<LlmService>;

  const createService = async () => {
    llmServiceMock = {
      chatCompletion: jest.fn(),
    } as unknown as jest.Mocked<LlmService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TravelSummaryService,
        { provide: LlmService, useValue: llmServiceMock },
      ],
    }).compile();

    return module.get<TravelSummaryService>(TravelSummaryService);
  };

  beforeEach(async () => {
    service = await createService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('生成摘要成功', async () => {
    const mockSummary =
      '5天琉森文化探索之旅，从铁力士峰的云端漫步到琉森湖的湖光山色，从卡佩尔桥的古老韵味到狮子纪念碑的历史沉淀。行程融合自然与人文，既有登高望远的壮阔体验，也有深入当地文化的精致品味，让您在这个瑞士中部明珠中感受阿尔卑斯山的魅力与琉森古城的优雅。';

    llmServiceMock.chatCompletion.mockResolvedValue(mockSummary);

    const dto: GenerateTravelSummaryRequestDto = {
      destination: '瑞士琉森',
      itinerary: {
        days: [
          {
            day: 1,
            date: '2024-06-01',
            activities: [
              {
                time: '09:00',
                title: '铁力士峰云端漫步',
                type: 'attraction',
                notes: '详细的游览建议',
              },
            ],
          },
        ],
      },
    };

    const result = await service.generateSummary(dto);

    expect(result.summary).toContain('琉森');
    expect(result.generatedAt).toBeDefined();
    expect(llmServiceMock.chatCompletion).toHaveBeenCalled();
  });

  it('AI失败时使用模板回退', async () => {
    llmServiceMock.chatCompletion.mockRejectedValue(
      new Error('AI service error'),
    );

    const dto: GenerateTravelSummaryRequestDto = {
      destination: '瑞士琉森',
      itinerary: {
        days: [
          {
            day: 1,
            date: '2024-06-01',
            activities: [
              {
                time: '09:00',
                title: '铁力士峰云端漫步',
                type: 'attraction',
              },
            ],
          },
        ],
      },
    };

    const result = await service.generateSummary(dto);

    expect(result.summary).toBeDefined();
    expect(result.summary.length).toBeGreaterThan(0);
    expect(result.generatedAt).toBeDefined();
  });

  it('分析行程数据正确', async () => {
    llmServiceMock.chatCompletion.mockResolvedValue('测试摘要');

    const dto: GenerateTravelSummaryRequestDto = {
      destination: '日本',
      itinerary: {
        days: [
          {
            day: 1,
            date: '2024-06-01',
            activities: [
              {
                time: '09:00',
                title: '景点1',
                type: 'attraction',
              },
              {
                time: '12:00',
                title: '美食1',
                type: 'meal',
              },
            ],
          },
          {
            day: 2,
            date: '2024-06-02',
            activities: [
              {
                time: '10:00',
                title: '购物1',
                type: 'shopping',
              },
            ],
          },
        ],
      },
    };

    await service.generateSummary(dto);

    // 验证AI调用时包含了正确的活动类型信息
    const callArgs = llmServiceMock.chatCompletion.mock.calls[0][0];
    expect(callArgs.messages[1].content).toContain('attraction');
    expect(callArgs.messages[1].content).toContain('meal');
    expect(callArgs.messages[1].content).toContain('shopping');
  });

  it('摘要长度控制在100-150字', async () => {
    // 模拟返回一个很长的摘要
    const longSummary = '测试'.repeat(100);
    llmServiceMock.chatCompletion.mockResolvedValue(longSummary);

    const dto: GenerateTravelSummaryRequestDto = {
      destination: '测试目的地',
      itinerary: {
        days: [
          {
            day: 1,
            date: '2024-06-01',
            activities: [
              {
                time: '09:00',
                title: '测试活动',
                type: 'attraction',
              },
            ],
          },
        ],
      },
    };

    const result = await service.generateSummary(dto);

    // 验证摘要长度被调整
    const chineseCharCount = result.summary.replace(/[^\u4e00-\u9fa5]/g, '').length;
    expect(chineseCharCount).toBeLessThanOrEqual(150);
  });
});

