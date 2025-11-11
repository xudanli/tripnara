import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GuidesController } from './guides.controller';
import { GuideSourceService } from './services/guide-source.service';
import { GuidesCacheService } from './services/guides-cache.service';

@Module({
  imports: [HttpModule],
  controllers: [GuidesController],
  providers: [GuideSourceService, GuidesCacheService],
  exports: [GuideSourceService, GuidesCacheService],
})
export class GuidesModule {}
