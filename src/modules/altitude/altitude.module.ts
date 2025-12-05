import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AltitudeService } from './altitude.service';
import { AltitudeController } from './altitude.controller';

@Module({
  imports: [HttpModule],
  controllers: [AltitudeController],
  providers: [AltitudeService],
  exports: [AltitudeService],
})
export class AltitudeModule {}

