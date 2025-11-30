import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QueueService } from './queue.service';

@ApiTags('Queue Admin')
@Controller('admin/queue')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class QueueAdminController {
  constructor(private readonly queueService: QueueService) {}

  @Get('location-generation/jobs')
  @ApiOperation({
    summary: '获取位置信息生成队列中的所有任务',
    description: '获取队列中所有任务的状态，包括等待、进行中、已完成、失败的任务',
  })
  async getLocationGenerationJobs(
    @Query('status') status?: string,
    @Query('limit') limit?: number,
  ) {
    return this.queueService.getJobs('location-generation', {
      status: status as any,
      limit: limit ? parseInt(String(limit), 10) : 50,
    });
  }

  @Get('location-generation/jobs/:jobId')
  @ApiOperation({
    summary: '获取指定任务的详细信息',
  })
  async getJobDetails(@Param('jobId') jobId: string) {
    return this.queueService.getJobDetails('location-generation', jobId);
  }

  @Get('location-generation/stats')
  @ApiOperation({
    summary: '获取队列统计信息',
    description: '获取队列中各种状态的任务数量统计',
  })
  async getQueueStats() {
    return this.queueService.getQueueStats('location-generation');
  }
}

