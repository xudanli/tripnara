import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPreferenceRepository } from './user-preference.repository';
import { UserPreferenceEntity } from '../../entities/user-preference.entity';

describe('UserPreferenceRepository', () => {
  let repository: UserPreferenceRepository;
  let ormRepository: jest.Mocked<Repository<UserPreferenceEntity>>;

  const createTestingModule = async () => {
    ormRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<UserPreferenceEntity>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserPreferenceRepository,
        {
          provide: getRepositoryToken(UserPreferenceEntity),
          useValue: ormRepository,
        },
      ],
    }).compile();

    repository = module.get(UserPreferenceRepository);
  };

  beforeEach(async () => {
    await createTestingModule();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('fetches preferences by user id', async () => {
    const preference = {
      id: 'pref-1',
      userId: 'user',
      preferences: {},
    } as UserPreferenceEntity;
    ormRepository.findOne.mockResolvedValue(preference);

    const result = await repository.getByUserId('user');

    expect(ormRepository.findOne).toHaveBeenCalledWith({
      where: { userId: 'user' },
    });
    expect(result).toBe(preference);
  });

  it('saves new preferences when none exist', async () => {
    const entity = {
      id: 'pref-1',
      userId: 'user',
      preferences: { currency: 'USD' },
    } as UserPreferenceEntity;
    ormRepository.findOne.mockResolvedValue(null);
    ormRepository.create.mockReturnValue(entity);
    ormRepository.save.mockResolvedValue(entity);

    const result = await repository.savePreferences('user', {
      currency: 'USD',
    });

    expect(ormRepository.create).toHaveBeenCalledWith({
      userId: 'user',
      preferences: { currency: 'USD' },
    });
    expect(result).toBe(entity);
  });

  it('updates existing preferences', async () => {
    const existing = {
      id: 'pref-1',
      userId: 'user',
      preferences: {},
    } as UserPreferenceEntity;
    ormRepository.findOne.mockResolvedValue(existing);
    ormRepository.save.mockImplementation(
      async (value) => value as UserPreferenceEntity,
    );

    const result = await repository.savePreferences('user', {
      language: 'zh-CN',
    });

    expect(existing.preferences).toEqual({ language: 'zh-CN' });
    expect(result).toBe(existing);
  });
});
