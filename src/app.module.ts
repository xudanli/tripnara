import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GatewayModule } from './modules/gateway/gateway.module';
import { LlmModule } from './modules/llm/llm.module';
import { DestinationModule } from './modules/destination/destination.module';
import { GuidesModule } from './modules/guides/guides.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { PersistenceModule } from './modules/persistence/persistence.module';
import { TaskModule } from './modules/task/task.module';
import { validateEnv } from './config/env.validation';
import { TYPEORM_ENTITIES } from './config/typeorm.entities';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { TemplateModule } from './modules/templates/template.module';
import { VisaModule } from './modules/visa/visa.module';
import { AuthModule } from './modules/auth/auth.module';
import { PreferencesModule } from './modules/preferences/preferences.module';
import { ExternalModule } from './modules/external/external.module';
import { EventbriteModule } from './modules/eventbrite/eventbrite.module';
import { ItineraryModule } from './modules/itinerary/itinerary.module';
import { LocationModule } from './modules/location/location.module';
import { TravelModule } from './modules/travel/travel.module';

const resolveEnvFilePaths = (): string[] => {
  const env = process.env.NODE_ENV?.toLowerCase();
  const defaults = ['.env'];

  if (!env) {
    return defaults;
  }

  if (['production', 'prod'].includes(env)) {
    return ['.env.prod', ...defaults];
  }

  if (['staging', 'stage'].includes(env)) {
    return ['.env.stage', ...defaults];
  }

  if (env === 'test') {
    return ['.env.test', '.env'];
  }

  return [`.env.${env}`, ...defaults];
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: resolveEnvFilePaths(),
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get<string>('NODE_ENV', 'development');
        const isProduction = nodeEnv === 'production';
        const isTest = nodeEnv === 'test';

        if (isTest) {
          return {
            type: 'sqlite' as const,
            database: ':memory:',
            entities: TYPEORM_ENTITIES,
            synchronize: true,
            logging: false,
          };
        }

        const databaseUrl = configService.get<string>('DATABASE_URL');
        if (!databaseUrl) {
          throw new Error('DATABASE_URL must be configured for persistence');
        }

        return {
          type: 'postgres' as const,
          url: databaseUrl,
          entities: TYPEORM_ENTITIES,
          synchronize: !isProduction,
          logging: !isProduction,
        };
      },
    }),
    GatewayModule,
    LlmModule,
    DestinationModule,
    TemplateModule,
    GuidesModule,
    CatalogModule,
    PersistenceModule,
    TaskModule,
    MonitoringModule,
    VisaModule,
    AuthModule,
    PreferencesModule,
    ExternalModule,
    EventbriteModule,
    ItineraryModule,
    LocationModule,
    TravelModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
