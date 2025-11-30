import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
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
    ConfigModule,
  ],
  controllers: [VisaController],
  providers: [VisaService],
  exports: [VisaService],
})
export class VisaModule {}

