import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JourneyRepository, CreateJourneyInput } from './journey.repository';
import { JourneyEntity } from '../../entities/journey.entity';

describe('JourneyRepository', () => {
  let repository: JourneyRepository;
  let ormRepository: jest.Mocked<Repository<JourneyEntity>>;

  const createTestingModule = async () => {
    ormRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<JourneyEntity>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JourneyRepository,
        {
          provide: getRepositoryToken(JourneyEntity),
          useValue: ormRepository,
        },
      ],
    }).compile();

    repository = module.get(JourneyRepository);
  };

  beforeEach(async () => {
    await createTestingModule();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('creates a journey', async () => {
    const input: CreateJourneyInput = {
      userId: 'user-1',
      itinerary: { days: [] },
      metadata: { locale: 'en' },
    };

    const entity = new JourneyEntity();
    ormRepository.create.mockReturnValue(entity);
    ormRepository.save.mockResolvedValue({ ...entity, id: 'journey-1' });

    const result = await repository.createJourney(input);

    expect(ormRepository.create).toHaveBeenCalledWith({
      userId: 'user-1',
      itinerary: { days: [] },
      metadata: { locale: 'en' },
    });
    expect(ormRepository.save).toHaveBeenCalledWith(entity);
    expect(result.id).toBe('journey-1');
  });

  it('updates an existing journey', async () => {
    const existing = {
      id: 'journey-1',
      itinerary: { days: [] },
      metadata: {},
    } as JourneyEntity;
    ormRepository.findOne.mockResolvedValue(existing);
    ormRepository.save.mockImplementation(
      async (value) => value as JourneyEntity,
    );

    const result = await repository.updateJourney('journey-1', {
      itinerary: { days: [{ day: 1 }] },
    });

    expect(ormRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'journey-1' },
    });
    expect(result?.itinerary).toEqual({ days: [{ day: 1 }] });
    expect(ormRepository.save).toHaveBeenCalledWith(existing);
  });

  it('deletes a journey', async () => {
    await repository.deleteJourney('journey-1');
    expect(ormRepository.delete).toHaveBeenCalledWith('journey-1');
  });
});
