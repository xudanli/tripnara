import { Test, TestingModule } from '@nestjs/testing';
import { TravelSummaryController } from './travel-summary.controller';
import { TravelSummaryService } from './travel-summary.service';
import { GenerateTravelSummaryRequestDto } from './dto/travel-summary.dto';

describe('TravelSummaryController', () => {
  let controller: TravelSummaryController;
  let service: jest.Mocked<TravelSummaryService>;

  beforeEach(async () => {
    service = {
      generateSummary: jest.fn(),
    } as unknown as jest.Mocked<TravelSummaryService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TravelSummaryController],
      providers: [
        { provide: TravelSummaryService, useValue: service },
      ],
    }).compile();

    controller = module.get<TravelSummaryController>(TravelSummaryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('生成旅行摘要', async () => {
    const mockResponse = {
      summary: '5天琉森文化探索之旅...',
      generatedAt: '2024-01-01T00:00:00Z',
    };

    service.generateSummary.mockResolvedValue(mockResponse);

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

    const result = await controller.generateSummary(dto);

    expect(result.success).toBe(true);
    expect(result.data.summary).toContain('琉森');
    expect(service.generateSummary).toHaveBeenCalledWith(dto);
  });
});

