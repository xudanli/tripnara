import { Test, TestingModule } from '@nestjs/testing';
import { JourneyController } from './journey.controller';
import { JourneyService } from './journey.service';
import { CreateJourneyDto } from './dto/journey.dto';

const mockJourneyService = {
  listJourneys: jest.fn(),
  createJourney: jest.fn(),
};

describe('JourneyController', () => {
  let controller: JourneyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JourneyController],
      providers: [
        {
          provide: JourneyService,
          useValue: mockJourneyService,
        },
      ],
    }).compile();

    controller = module.get<JourneyController>(JourneyController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('calls service.listJourneys', async () => {
    mockJourneyService.listJourneys.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    });
    await controller.list({});
    expect(mockJourneyService.listJourneys).toHaveBeenCalledWith({});
  });

  it('calls service.createJourney', async () => {
    const payload: CreateJourneyDto = { title: 'Test Journey' };
    await controller.create(payload);
    expect(mockJourneyService.createJourney).toHaveBeenCalledWith(payload);
  });
});
