import { Test, TestingModule } from '@nestjs/testing';
import { ItineraryController } from './itinerary.controller';
import { ItineraryService } from './itinerary.service';
import { GenerateItineraryRequestDto } from './dto/itinerary.dto';

describe('ItineraryController', () => {
  let controller: ItineraryController;
  let service: jest.Mocked<ItineraryService>;

  beforeEach(async () => {
    service = {
      generateItinerary: jest.fn(),
    } as unknown as jest.Mocked<ItineraryService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ItineraryController],
      providers: [
        { provide: ItineraryService, useValue: service },
      ],
    }).compile();

    controller = module.get<ItineraryController>(ItineraryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('调用服务生成行程', async () => {
    const mockResponse = {
      success: true,
      data: {
        days: [],
        totalCost: 8000,
        summary: '测试摘要',
      },
      generatedAt: '2024-01-01T00:00:00Z',
    };

    service.generateItinerary.mockResolvedValue(mockResponse);

    const dto: GenerateItineraryRequestDto = {
      destination: '瑞士琉森',
      days: 5,
      startDate: '2024-06-01',
    };

    const user = { userId: 'user-1' };
    const result = await controller.generateItinerary(dto, user);

    expect(result.success).toBe(true);
    expect(service.generateItinerary).toHaveBeenCalledWith(dto, 'user-1');
  });
});

