import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  JourneyEntity,
  JourneyDayEntity,
  JourneyTimeSlotEntity,
} from '../persistence/entities/journey.entity';
import { JourneyService } from './journey.service';
import { CreateJourneyDto } from './dto/journey.dto';

const createQueryBuilderMock = () => {
  type JourneyQueryBuilder = ReturnType<
    Repository<JourneyEntity>['createQueryBuilder']
  >;
  const qb: Pick<
    JourneyQueryBuilder,
    'andWhere' | 'skip' | 'take' | 'orderBy' | 'getManyAndCount'
  > = {
    andWhere: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  };
  return qb;
};

describe('JourneyService', () => {
  let service: JourneyService;
  let journeyRepo: jest.Mocked<Repository<JourneyEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JourneyService,
        {
          provide: getRepositoryToken(JourneyEntity),
          useValue: {
            create: jest.fn((value: Partial<JourneyEntity>) => value),
            save: jest
              .fn((value: JourneyEntity) => Promise.resolve(value))
              .mockName('save'),
            preload: jest.fn(() => Promise.resolve(undefined)),
            findOne: jest.fn(() => Promise.resolve(null)),
            remove: jest.fn((value: JourneyEntity) => Promise.resolve(value)),
            createQueryBuilder: jest.fn(() => createQueryBuilderMock()),
          },
        },
        {
          provide: getRepositoryToken(JourneyDayEntity),
          useValue: {
            find: jest.fn(() => Promise.resolve([])),
            findOne: jest.fn(() => Promise.resolve(null)),
            create: jest.fn((value: Partial<JourneyDayEntity>) => value),
            save: jest.fn((value: JourneyDayEntity) => Promise.resolve(value)),
            remove: jest.fn((value: JourneyDayEntity) =>
              Promise.resolve(value),
            ),
          },
        },
        {
          provide: getRepositoryToken(JourneyTimeSlotEntity),
          useValue: {
            find: jest.fn(() => Promise.resolve([])),
            findOne: jest.fn(() => Promise.resolve(null)),
            create: jest.fn((value: Partial<JourneyTimeSlotEntity>) => value),
            save: jest.fn((value: JourneyTimeSlotEntity) =>
              Promise.resolve(value),
            ),
            remove: jest.fn((value: JourneyTimeSlotEntity) =>
              Promise.resolve(value),
            ),
          },
        },
      ],
    }).compile();

    service = module.get(JourneyService);
    journeyRepo = module.get(getRepositoryToken(JourneyEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a journey and persists via repository', async () => {
    const payload: CreateJourneyDto = { title: 'Test Journey' };
    await service.createJourney(payload);
    const createCalls = (journeyRepo.create as jest.Mock).mock.calls as Array<
      [Partial<JourneyEntity>]
    >;
    const [createPayload] = createCalls[0];
    expect(createPayload).toEqual(
      expect.objectContaining({ title: 'Test Journey' }),
    );
    const saveCalls = (journeyRepo.save as jest.Mock).mock.calls as Array<
      [JourneyEntity]
    >;
    expect(saveCalls).toHaveLength(1);
  });
});
