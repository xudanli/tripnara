import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GeocodeService } from './services/geocode.service';
import { TransportService } from './services/transport.service';
import { AltitudeService } from './services/altitude.service';
import { FestivalService } from './services/festival.service';
import { DestinationController } from './destination.controller';

@Module({
  imports: [HttpModule],
  controllers: [DestinationController],
  providers: [
    GeocodeService,
    TransportService,
    AltitudeService,
    FestivalService,
  ],
  exports: [GeocodeService, TransportService, AltitudeService, FestivalService],
})
export class DestinationModule {}
