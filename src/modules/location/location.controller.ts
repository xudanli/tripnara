import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LocationService } from './location.service';
import { QueueService } from '../queue/queue.service';
import {
  EnqueueLocationGenerationResponseDto,
  GetJobStatusResponseDto,
} from '../queue/dto/queue.dto';
import {
  GenerateLocationRequestDto,
  GenerateLocationResponseDto,
  GenerateLocationBatchRequestDto,
  GenerateLocationBatchResponseDto,
} from './dto/location.dto';

@ApiTags('Location')
@Controller('location')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class LocationController {
  constructor(
    private readonly locationService: LocationService,
    private readonly queueService: QueueService,
  ) {}

  @Post('generate')
  @ApiOperation({ summary: '生成单个活动的位置信息' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async generateLocation(
    @Body() dto: GenerateLocationRequestDto,
  ): Promise<GenerateLocationResponseDto> {
    const locationInfo = await this.locationService.generateLocationInfo(dto);
    return {
      success: true,
      data: locationInfo,
    };
  }

  @Post('generate-batch')
  @ApiOperation({ summary: '批量生成活动位置信息（同步）' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async generateLocationBatch(
    @Body() dto: GenerateLocationBatchRequestDto,
  ): Promise<GenerateLocationBatchResponseDto> {
    const results = await this.locationService.generateLocationBatch(
      dto.activities,
    );
    return {
      success: true,
      data: results,
    };
  }

  @Post('generate-batch-async')
  @ApiOperation({
    summary: '异步批量生成活动位置信息',
    description:
      '将任务加入队列，立即返回 jobId。前端可以通过轮询或 WebSocket 获取任务状态和结果。',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async generateLocationBatchAsync(
    @Body() dto: GenerateLocationBatchRequestDto,
  ): Promise<EnqueueLocationGenerationResponseDto> {
    const jobId = await this.queueService.enqueueLocationGeneration(
      dto.activities,
    );
    return {
      success: true,
      jobId,
    };
  }

  @Get('job/:jobId')
  @ApiOperation({ summary: '查询位置信息生成任务状态' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getJobStatus(
    @Param('jobId') jobId: string,
  ): Promise<GetJobStatusResponseDto> {
    const status = await this.queueService.getJobStatus(jobId);
    return {
      success: true,
      data: status,
    };
  }

  @Get('job/:jobId/result')
  @ApiOperation({
    summary: '获取任务结果（仅当任务完成时）',
    description: '如果任务未完成，将返回错误。请先查询任务状态。',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getJobResult(@Param('jobId') jobId: string) {
    const result = await this.queueService.getJobResult(jobId);
    return {
      success: true,
      data: result,
    };
  }
}

