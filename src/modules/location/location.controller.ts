import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Query,
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
  QueryLocationRequestDto,
  QueryLocationResponseDto,
  SearchLocationRequestDto,
  SearchLocationResponseDto,
} from './dto/location.dto';

@ApiTags('Location')
@Controller('location')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class LocationController {
  private readonly logger = new Logger(LocationController.name);

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
      '将任务加入队列，立即返回 jobId。前端可以通过轮询或 WebSocket 获取任务状态和结果。如果队列服务不可用，建议使用同步接口。',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async generateLocationBatchAsync(
    @Body() dto: GenerateLocationBatchRequestDto,
  ): Promise<EnqueueLocationGenerationResponseDto> {
    try {
      const jobId = await this.queueService.enqueueLocationGeneration(
        dto.activities,
      );
      return {
        success: true,
        jobId,
      };
    } catch (error) {
      // 🔥 如果队列服务不可用，返回友好的错误信息
      this.logger.error(
        `Failed to enqueue location generation: ${error instanceof Error ? error.message : error}`,
      );
      throw error; // 让 NestJS 的异常过滤器处理
    }
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

  @Get('query')
  @ApiOperation({
    summary: '查询已存储的位置信息（不触发生成）',
    description:
      '根据活动名称、目的地和类型查询已存储的位置信息。如果不存在，返回null，不会触发生成。',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async queryLocation(
    @Query() query: QueryLocationRequestDto,
  ): Promise<QueryLocationResponseDto> {
    const locationInfo = await this.locationService.getLocationInfo(
      query.activityName,
      query.destination,
      query.activityType,
    );
    return {
      success: true,
      data: locationInfo,
    };
  }

  @Get('search')
  @ApiOperation({
    summary: '搜索位置信息',
    description: '根据条件搜索已存储的位置信息，支持分页。',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async searchLocations(
    @Query() query: SearchLocationRequestDto,
  ): Promise<SearchLocationResponseDto> {
    const result = await this.locationService.searchLocations({
      destination: query.destination,
      activityType: query.activityType,
      activityName: query.activityName,
      limit: query.limit || 20,
      offset: query.offset || 0,
    });
    return {
      success: true,
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: '根据ID查询位置信息',
    description: '根据位置信息的唯一ID查询详细信息。',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getLocationById(
    @Param('id') id: string,
  ): Promise<QueryLocationResponseDto> {
    const locationInfo = await this.locationService.getLocationById(id);
    return {
      success: true,
      data: locationInfo,
    };
  }
}

