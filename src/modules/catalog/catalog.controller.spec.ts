import { Test, TestingModule } from '@nestjs/testing';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './services/catalog.service';

const mockCatalogService = {
  getCatalog: jest.fn(),
};

describe('CatalogController', () => {
  let controller: CatalogController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatalogController],
      providers: [
        {
          provide: CatalogService,
          useValue: mockCatalogService,
        },
      ],
    }).compile();

    controller = module.get<CatalogController>(CatalogController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns catalog data from the service', () => {
    const catalog = {
      transportModes: [],
      llmParameterHints: [],
      constants: {},
    };
    mockCatalogService.getCatalog.mockReturnValue(catalog);

    expect(controller.getCatalog()).toBe(catalog);
    expect(mockCatalogService.getCatalog).toHaveBeenCalled();
  });
});
