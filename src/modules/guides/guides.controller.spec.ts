import { Test, TestingModule } from '@nestjs/testing';
import { GuidesController } from './guides.controller';
import { GuideSourceService } from './services/guide-source.service';
import { GuidesCacheService } from './services/guides-cache.service';
import {
  GuideSearchRequestDto,
  GuideSearchResponseDto,
  GuideSourcesResponseDto,
} from './dto/guides.dto';

const mockGuideSourceService = {
  searchGuides: jest.fn(),
  listSources: jest.fn(),
};

const mockGuidesCacheService = {
  get: jest.fn(),
  set: jest.fn(),
};

describe('GuidesController', () => {
  let controller: GuidesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GuidesController],
      providers: [
        { provide: GuideSourceService, useValue: mockGuideSourceService },
        { provide: GuidesCacheService, useValue: mockGuidesCacheService },
      ],
    }).compile();

    controller = module.get<GuidesController>(GuidesController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns cached search results when available', async () => {
    const dto: GuideSearchRequestDto = { query: 'Lisbon' };
    const cached: GuideSearchResponseDto = { results: [] };
    mockGuidesCacheService.get.mockReturnValue(cached);

    await expect(controller.searchGuides(dto)).resolves.toEqual(cached);
    expect(mockGuidesCacheService.get).toHaveBeenCalledWith(dto);
    expect(mockGuideSourceService.searchGuides).not.toHaveBeenCalled();
  });

  it('fetches from source and caches when no cache', async () => {
    const dto: GuideSearchRequestDto = { query: 'Kyoto' };
    const response: GuideSearchResponseDto = {
      results: [{ title: 'Kyoto Guide', url: 'https://example.com' }],
    };
    mockGuidesCacheService.get.mockReturnValue(null);
    mockGuideSourceService.searchGuides.mockResolvedValue(response);

    await expect(controller.searchGuides(dto)).resolves.toEqual(response);
    expect(mockGuideSourceService.searchGuides).toHaveBeenCalledWith(dto);
    expect(mockGuidesCacheService.set).toHaveBeenCalledWith(dto, response);
  });

  it('lists guide sources', async () => {
    const response: GuideSourcesResponseDto = { sources: [] };
    mockGuideSourceService.listSources.mockResolvedValue(response);

    await expect(controller.getSources()).resolves.toEqual(response);
    expect(mockGuideSourceService.listSources).toHaveBeenCalled();
  });
});
