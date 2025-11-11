import { Test, TestingModule } from '@nestjs/testing';
import { GuidesCacheService } from './guides-cache.service';
import {
  GuideSearchRequestDto,
  GuideSearchResponseDto,
} from '../dto/guides.dto';

describe('GuidesCacheService', () => {
  let service: GuidesCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GuidesCacheService],
    }).compile();

    service = module.get<GuidesCacheService>(GuidesCacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('stores and retrieves cached entries', () => {
    const dto: GuideSearchRequestDto = { query: 'Tokyo' };
    const response: GuideSearchResponseDto = {
      results: [{ title: 'Tokyo Guide', url: 'https://example.com' }],
    };

    expect(service.get(dto)).toBeNull();

    service.set(dto, response);
    expect(service.get(dto)).toEqual(response);
  });
});
