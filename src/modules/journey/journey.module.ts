import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  JourneyEntity,
  JourneyDayEntity,
  JourneyTimeSlotEntity,
} from '../persistence/entities/journey.entity';
import { JourneyController } from './journey.controller';
import { JourneyService } from './journey.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      JourneyEntity,
      JourneyDayEntity,
      JourneyTimeSlotEntity,
    ]),
  ],
  controllers: [JourneyController],
  providers: [JourneyService],
  exports: [JourneyService],
})
export class JourneyModule {}
