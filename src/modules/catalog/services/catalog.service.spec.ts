import { Test, TestingModule } from '@nestjs/testing';
import { CatalogService } from './catalog.service';

describe('CatalogService', () => {
  let service: CatalogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CatalogService],
    }).compile();

    service = module.get<CatalogService>(CatalogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns catalog data with transport modes', () => {
    const catalog = service.getCatalog();

    expect(catalog.transportModes.length).toBeGreaterThan(0);
    expect(catalog.transportModes[0]).toHaveProperty('id');
    expect(catalog.llmParameterHints.length).toBeGreaterThan(0);
    expect(catalog.constants).toHaveProperty('supportedTripLengths');
  });
});
