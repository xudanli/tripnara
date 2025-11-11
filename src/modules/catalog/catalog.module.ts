import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './services/catalog.service';

@Module({
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
