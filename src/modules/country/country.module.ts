import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CountryAdminService } from './country-admin.service';
import { CountryAdminController } from './country-admin.controller';
import { CountryEntity } from '../persistence/entities/reference.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CountryEntity])],
  providers: [CountryAdminService],
  controllers: [CountryAdminController],
  exports: [CountryAdminService],
})
export class CountryModule {}

