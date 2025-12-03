import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DestinationEntity } from '../persistence/entities/reference.entity';
import { GeocodeService } from './services/geocode.service';
import { AccurateGeocodingService } from './services/accurate-geocoding.service';
import { TransportService } from './services/transport.service';
import { AltitudeService } from './services/altitude.service';
import { WeatherService } from './services/weather.service';
import { PoiService } from './services/poi.service';
import { DestinationController } from './destination.controller';
import { DestinationsV1Controller } from './destinations-v1.controller';
import { TransportV1Controller } from './transport-v1.controller';
import { PoiV1Controller } from './poi-v1.controller';
import { ExternalModule } from '../external/external.module';
import { LlmModule } from '../llm/llm.module';
import { ItineraryModule } from '../itinerary/itinerary.module';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([DestinationEntity]),
    ExternalModule,
    LlmModule,
    forwardRef(() => ItineraryModule),
  ],
  controllers: [
    DestinationController,
    DestinationsV1Controller,
    TransportV1Controller,
    PoiV1Controller,
  ],
  providers: [
    GeocodeService,
    AccurateGeocodingService,
    TransportService,
    AltitudeService,
    WeatherService,
    PoiService,
  ],
  exports: [
    GeocodeService,
    AccurateGeocodingService,
    TransportService,
    AltitudeService,
  ],
})
export class DestinationModule {}
