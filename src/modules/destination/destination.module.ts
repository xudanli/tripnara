import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DestinationEntity } from '../persistence/entities/reference.entity';
import { GeocodeService } from './services/geocode.service';
import { TransportService } from './services/transport.service';
import { AltitudeService } from './services/altitude.service';
import { FestivalService } from './services/festival.service';
import { WeatherService } from './services/weather.service';
import { PoiService } from './services/poi.service';
import { DestinationController } from './destination.controller';
import { DestinationsV1Controller } from './destinations-v1.controller';
import { TransportV1Controller } from './transport-v1.controller';
import { PoiV1Controller } from './poi-v1.controller';
import { ExternalModule } from '../external/external.module';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([DestinationEntity]),
    ExternalModule,
  ],
  controllers: [
    DestinationController,
    DestinationsV1Controller,
    TransportV1Controller,
    PoiV1Controller,
  ],
  providers: [
    GeocodeService,
    TransportService,
    AltitudeService,
    FestivalService,
    WeatherService,
    PoiService,
  ],
  exports: [GeocodeService, TransportService, AltitudeService, FestivalService],
})
export class DestinationModule {}
