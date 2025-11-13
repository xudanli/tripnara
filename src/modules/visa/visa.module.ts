import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  VisaPolicyEntity,
  VisaUnionEntity,
  VisaUnionCountryEntity,
  VisaPolicyHistoryEntity,
} from '../persistence/entities/visa.entity';
import { VisaController } from './visa.controller';
import { VisaService } from './visa.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VisaPolicyEntity,
      VisaUnionEntity,
      VisaUnionCountryEntity,
      VisaPolicyHistoryEntity,
    ]),
  ],
  controllers: [VisaController],
  providers: [VisaService],
  exports: [VisaService],
})
export class VisaModule {}

