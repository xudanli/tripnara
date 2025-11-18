import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LlmService } from '../llm/llm.service';
import { PreferencesService } from '../preferences/preferences.service';
import { ItineraryService } from './itinerary.service';
import { GenerateItineraryRequestDto } from './dto/itinerary.dto';

describe('ItineraryService', () => {
  let service: ItineraryService;
  let llmServiceMock: jest.Mocked<LlmService>;
  let preferencesServiceMock: jest.Mocked<PreferencesService>;

  const createService = async () => {
    llmServiceMock = {
      chatCompletionJson: jest.fn(),
    } as unknown as jest.Mocked<LlmService>;

    preferencesServiceMock = {
      getPreferences: jest.fn(),
    } as unknown as jest.Mocked<PreferencesService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItineraryService,
        { provide: LlmService, useValue: llmServiceMock },
        { provide: PreferencesService, useValue: preferencesServiceMock },
      ],
    }).compile();

    return module.get<ItineraryService>(ItineraryService);
  };

  beforeEach(async () => {
    service = await createService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('生成行程成功', async () => {
    preferencesServiceMock.getPreferences.mockResolvedValue({});

    const mockAiResponse = {
      days: [
        {
          day: 1,
          date: '2024-06-01',
          activities: [
            {
              time: '09:00',
              title: '铁力士峰云端漫步',
              type: 'attraction',
              duration: 120,
              location: { lat: 46.7704, lng: 8.4050 },
              notes: '详细的游览建议',
              cost: 400,
            },
          ],
        },
      ],
      totalCost: 8000,
      summary: '行程摘要',
    };

    llmServiceMock.chatCompletionJson.mockResolvedValue(mockAiResponse);

    const dto: GenerateItineraryRequestDto = {
      destination: '瑞士琉森',
      days: 5,
      preferences: {
        interests: ['自然风光', '户外活动'],
        budget: 'medium',
        travelStyle: 'relaxed',
      },
      startDate: '2024-06-01',
    };

    const result = await service.generateItinerary(dto, 'user-1');

    expect(result.success).toBe(true);
    expect(result.data.days).toHaveLength(1);
    expect(result.data.totalCost).toBe(8000);
    expect(result.data.summary).toBe('行程摘要');
    expect(llmServiceMock.chatCompletionJson).toHaveBeenCalled();
  });

  it('使用用户偏好生成行程', async () => {
    preferencesServiceMock.getPreferences.mockResolvedValue({
      interests: ['文化', '历史'],
      budget: 'high',
    });

    const mockAiResponse = {
      days: [],
      totalCost: 10000,
      summary: '豪华文化之旅',
    };

    llmServiceMock.chatCompletionJson.mockResolvedValue(mockAiResponse);

    const dto: GenerateItineraryRequestDto = {
      destination: '日本',
      days: 3,
      startDate: '2024-06-01',
    };

    await service.generateItinerary(dto, 'user-1');

    expect(preferencesServiceMock.getPreferences).toHaveBeenCalledWith('user-1');
  });

  it('AI生成失败时抛出错误', async () => {
    preferencesServiceMock.getPreferences.mockResolvedValue({});
    llmServiceMock.chatCompletionJson.mockRejectedValue(
      new Error('AI service error'),
    );

    const dto: GenerateItineraryRequestDto = {
      destination: '瑞士琉森',
      days: 5,
      startDate: '2024-06-01',
    };

    await expect(service.generateItinerary(dto)).rejects.toThrow();
  });
});

