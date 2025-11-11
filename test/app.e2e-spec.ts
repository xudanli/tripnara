import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

jest.setTimeout(30000);

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/ (GET)', async () => {
    await request(app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect('Hello World!');
  });

  it('/health (GET)', async () => {
    await request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('status');
      });
  });

  it('/api/destination/geocode (POST)', async () => {
    const hasMapboxToken = !!process.env.MAPBOX_ACCESS_TOKEN;
    const expectedStatus = hasMapboxToken ? 200 : 500;

    const response = await request(app.getHttpServer())
      .post('/api/destination/geocode')
      .send({ query: 'Paris', limit: 1 })
      .expect(expectedStatus);

    if (hasMapboxToken) {
      const body = response.body as { features?: unknown };
      expect(Array.isArray(body.features)).toBe(true);
    }
  });

  it('/api/guides/search (POST)', async () => {
    const hasGoogleConfig =
      !!process.env.GUIDES_GOOGLE_API_KEY && !!process.env.GUIDES_GOOGLE_CX;
    const expectedStatus = hasGoogleConfig ? 200 : 500;

    const response = await request(app.getHttpServer())
      .post('/api/guides/search')
      .send({ query: 'Lisbon' })
      .expect(expectedStatus);

    if (hasGoogleConfig) {
      const body = response.body as { results?: unknown };
      expect(Array.isArray(body.results)).toBe(true);
    }
  });
});
