import { Test, TestingModule } from '@nestjs/testing';
import { PreferencesService } from './preferences.service';
import { UserPreferenceRepository } from '../persistence/repositories/user-preference/user-preference.repository';

describe('PreferencesService', () => {
  let service: PreferencesService;
  let repository: jest.Mocked<UserPreferenceRepository>;

  beforeEach(async () => {
    repository = {
      getByUserId: jest.fn(),
      savePreferences: jest.fn(),
    } as unknown as jest.Mocked<UserPreferenceRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreferencesService,
        { provide: UserPreferenceRepository, useValue: repository },
      ],
    }).compile();

    service = module.get<PreferencesService>(PreferencesService);
  });

  it('returns empty object when no preferences stored', async () => {
    repository.getByUserId.mockResolvedValue(null);

    await expect(service.getPreferences('user-1')).resolves.toEqual({});
    expect(repository.getByUserId).toHaveBeenCalledWith('user-1');
  });

  it('returns stored preferences', async () => {
    repository.getByUserId.mockResolvedValue({
      preferences: { language: 'zh-CN' },
    } as any);

    await expect(service.getPreferences('user-1')).resolves.toEqual({
      language: 'zh-CN',
    });
  });

  it('saves preferences', async () => {
    repository.savePreferences.mockResolvedValue({
      preferences: { currency: 'USD' },
    } as any);

    await expect(
      service.updatePreferences('user-1', { currency: 'USD' }),
    ).resolves.toEqual({ currency: 'USD' });
    expect(repository.savePreferences).toHaveBeenCalledWith('user-1', {
      currency: 'USD',
    });
  });
});

