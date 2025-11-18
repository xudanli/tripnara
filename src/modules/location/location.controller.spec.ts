import { Test, TestingModule } from '@nestjs/testing';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';
import { GenerateLocationRequestDto } from './dto/location.dto';

describe('LocationController', () => {
  let controller: LocationController;
  let service: jest.Mocked<LocationService>;

  beforeEach(async () => {
    service = {
      generateLocationInfo: jest.fn(),
      generateLocationBatch: jest.fn(),
    } as unknown as jest.Mocked<LocationService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LocationController],
      providers: [
        { provide: LocationService, useValue: service },
      ],
    }).compile();

    controller = module.get<LocationController>(LocationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('生成单个位置信息', async () => {
    const mockLocationInfo = {
      chineseName: '测试景点',
      localName: 'Test',
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

    service.generateLocationInfo.mockResolvedValue(mockLocationInfo);

    const dto: GenerateLocationRequestDto = {
      activityName: '测试景点',
      destination: '测试目的地',
      activityType: 'attraction',
      coordinates: { lat: 0, lng: 0 },
    };

    const result = await controller.generateLocation(dto);

    expect(result.success).toBe(true);
    expect(result.data.chineseName).toBe('测试景点');
    expect(service.generateLocationInfo).toHaveBeenCalledWith(dto);
  });

  it('批量生成位置信息', async () => {
    const mockResults = [
      {
        activityName: '活动1',
        locationInfo: {
          chineseName: '活动1',
          localName: 'Activity 1',
          chineseAddress: '地址1',
          localAddress: 'Address 1',
          transportInfo: '交通1',
          openingHours: '09:00-18:00',
          ticketPrice: '100元',
          visitTips: '建议1',
          category: '景点',
          rating: 4.5,
          visitDuration: '2小时',
          bestTimeToVisit: '上午',
        },
      },
    ];

    service.generateLocationBatch.mockResolvedValue(mockResults);

    const dto = {
      activities: [
        {
          activityName: '活动1',
          destination: '目的地1',
          activityType: 'attraction' as const,
          coordinates: { lat: 0, lng: 0 },
        },
      ],
    };

    const result = await controller.generateLocationBatch(dto);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(service.generateLocationBatch).toHaveBeenCalledWith(dto.activities);
  });
});

