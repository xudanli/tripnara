import { Test, TestingModule } from '@nestjs/testing';
import { AltitudeService } from './altitude.service';

describe('AltitudeService', () => {
  let service: AltitudeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AltitudeService],
    }).compile();

    service = module.get<AltitudeService>(AltitudeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('flags mountain destinations as high altitude', () => {
    const response = service.evaluateDestination('Mountain Vista');

    expect(response.isHighAltitude).toBe(true);
    expect(response.category).toBe('high');
  });
});
