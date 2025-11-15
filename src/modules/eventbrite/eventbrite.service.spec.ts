import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { EventbriteService } from './eventbrite.service';
import { EventbriteConnectionRepository } from '../persistence/repositories/eventbrite-connection/eventbrite-connection.repository';

describe('EventbriteService', () => {
  let service: EventbriteService;
  const repo = {
    findByUserId: jest.fn(),
    upsertConnection: jest.fn(),
    deleteByUserId: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              EVENTBRITE_CLIENT_ID: 'client',
              EVENTBRITE_CLIENT_SECRET: 'secret',
              EVENTBRITE_REDIRECT_URI: 'https://example.com/callback',
            }),
          ],
        }),
        JwtModule.register({
          secret: 'unit-test-secret',
        }),
      ],
      providers: [
        EventbriteService,
        {
          provide: EventbriteConnectionRepository,
          useValue: repo,
        },
      ],
    }).compile();

    service = module.get<EventbriteService>(EventbriteService);
  });

  it('generates auth url', () => {
    const result = service.generateAuthUrl('user-1');
    expect(result).toContain('client_id=client');
    expect(result).toContain('response_type=code');
  });

  it('returns connection status', async () => {
    repo.findByUserId.mockResolvedValueOnce({ eventbriteUserId: 'eb-1' });
    await expect(service.getConnectionStatus('user')).resolves.toEqual({
      connected: true,
      expiresAt: null,
      eventbriteUserId: 'eb-1',
    });
  });
});

