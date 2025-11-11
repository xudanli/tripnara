import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  JourneyTemplateEntity,
  TemplateDayEntity,
  TemplateTimeSlotEntity,
} from '../persistence/entities/journey-template.entity';
import { TemplateController } from './template.controller';
import { TemplateService } from './template.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      JourneyTemplateEntity,
      TemplateDayEntity,
      TemplateTimeSlotEntity,
    ]),
  ],
  controllers: [TemplateController],
  providers: [TemplateService],
  exports: [TemplateService],
})
export class TemplateModule {}
