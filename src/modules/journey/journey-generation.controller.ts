import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UsePipes,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JOURNEY_GENERATION_STAGES } from './dto/journey-generation.dto';
import type {
  JourneyGenerationRequestDto,
  JourneyGenerationStage,
  JourneyGenerationStageRequestDto,
} from './dto/journey-generation.dto';
import { JourneyGenerationService } from './journey-generation.service';

@ApiTags('Journey Generation')
@Controller('api/v1/journeys/:journeyId')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class JourneyGenerationController {
  constructor(private readonly generationService: JourneyGenerationService) {}

  @Post('generate')
  @ApiOperation({ summary: '启动行程生成流程' })
  generate(
    @Param('journeyId') journeyId: string,
    @Body() dto: JourneyGenerationRequestDto,
  ) {
    return this.generationService.startGeneration(journeyId, dto);
  }

  @Get('generate/status')
  @ApiOperation({ summary: '查询最新生成任务状态' })
  getStatus(@Param('journeyId') journeyId: string) {
    return this.generationService.getStatus(journeyId);
  }

  @Post('generate/:stage')
  @ApiOperation({ summary: '执行指定生成阶段' })
  generateStage(
    @Param('journeyId') journeyId: string,
    @Param('stage') stage: JourneyGenerationStage,
    @Body() dto: JourneyGenerationStageRequestDto,
  ) {
    this.ensureValidStage(stage);
    return this.generationService.executeSingleStage(journeyId, stage, dto);
  }

  @Get('ai/logs')
  @ApiOperation({ summary: '查看行程 AI 调用日志' })
  listLogs(@Param('journeyId') journeyId: string) {
    return this.generationService.listLogs(journeyId);
  }

  private ensureValidStage(stage: JourneyGenerationStage) {
    if (!JOURNEY_GENERATION_STAGES.includes(stage)) {
      throw new BadRequestException(`不支持的生成阶段: ${stage}`);
    }
  }
}
