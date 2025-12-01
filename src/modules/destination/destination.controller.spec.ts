import { Test, TestingModule } from '@nestjs/testing';
import { DestinationController } from './destination.controller';
import { GeocodeService } from './services/geocode.service';
import { TransportService } from './services/transport.service';
import { AltitudeService } from './services/altitude.service';
import {
  GeocodeLookupDto,
  TransportRequestDto,
} from './dto/destination.dto';

const mockGeocodeService = {
  lookup: jest.fn(),
};
const mockTransportService = {
  calculateRoutes: jest.fn(),
};
const mockAltitudeService = {
  evaluateDestination: jest.fn(),
};

describe('DestinationController', () => {
  let controller: DestinationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DestinationController],
      providers: [
        { provide: GeocodeService, useValue: mockGeocodeService },
        { provide: TransportService, useValue: mockTransportService },
        { provide: AltitudeService, useValue: mockAltitudeService },
      ],
    }).compile();

    controller = module.get<DestinationController>(DestinationController);

    jest.clearAllMocks();
  });

  it('calls geocode service', async () => {
    const dto: GeocodeLookupDto = { query: 'Paris' };
    const response = { features: [] };
    mockGeocodeService.lookup.mockResolvedValue(response);

    await expect(controller.geocode(dto)).resolves.toEqual(response);
    expect(mockGeocodeService.lookup).toHaveBeenCalledWith(dto);
  });

  it('calls transport service', async () => {
    const dto: TransportRequestDto = {
      origin: { latitude: 0, longitude: 0 },
      destination: { latitude: 1, longitude: 1 },
    };
    const response = { options: [] };
    mockTransportService.calculateRoutes.mockResolvedValue(response);

    await expect(controller.transport(dto)).resolves.toEqual(response);
    expect(mockTransportService.calculateRoutes).toHaveBeenCalledWith(dto);
  });

  it('calls altitude service', async () => {
    const response = { isHighAltitude: true };
    mockAltitudeService.evaluateDestination.mockResolvedValue(response);

    await expect(controller.highAltitude({ name: 'La Paz' })).resolves.toEqual(
      response,
    );
    expect(mockAltitudeService.evaluateDestination).toHaveBeenCalledWith(
      'La Paz',
    );
  });
});
