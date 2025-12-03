import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CurrencyService } from './currency.service';
import { CurrencyController } from './currency.controller';
import { CurrencyAdminService } from './currency-admin.service';
import { CurrencyAdminController } from './currency-admin.controller';
import { DestinationModule } from '../destination/destination.module';
import {
  CurrencyEntity,
  CountryCurrencyMappingEntity,
} from '../persistence/entities/reference.entity';

@Module({
  imports: [
    forwardRef(() => DestinationModule),
    TypeOrmModule.forFeature([CurrencyEntity, CountryCurrencyMappingEntity]),
  ],
  providers: [CurrencyService, CurrencyAdminService],
  controllers: [CurrencyController, CurrencyAdminController],
  exports: [CurrencyService, CurrencyAdminService],
})
export class CurrencyModule {}

