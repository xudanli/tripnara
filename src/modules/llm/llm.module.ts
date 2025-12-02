import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LlmService } from './llm.service';
import { PreferencesModule } from '../preferences/preferences.module';

@Module({
  imports: [HttpModule, PreferencesModule],
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}
