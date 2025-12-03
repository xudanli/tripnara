import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bullmq';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { LocationService } from '../../location/location.service';
import { BatchActivityDto } from '../../location/dto/location.dto';

@Processor('location-generation')
export class LocationGenerationProcessor {
  private readonly logger = new Logger(LocationGenerationProcessor.name);

  constructor(
    @Inject(forwardRef(() => LocationService))
    private readonly locationService: LocationService,
  ) {}

  @Process('generate-batch')
  async handleBatchGeneration(job: Job<{ activities: BatchActivityDto[] }>) {
    const { activities } = job.data;

    this.logger.log(
      `Processing location generation job ${job.id}: ${activities.length} activities`,
    );

    try {
      // 更新任务进度（如果方法存在）
      if (typeof job.updateProgress === 'function') {
        try {
          await job.updateProgress(10);
        } catch (progressError) {
          this.logger.warn(
            `Failed to update job progress: ${progressError instanceof Error ? progressError.message : progressError}`,
          );
        }
      }

      // 调用 LocationService 生成位置信息（已优化为并发处理）
      const results = await this.locationService.generateLocationBatch(
        activities,
      );

      // 更新任务进度（如果方法存在）
      if (typeof job.updateProgress === 'function') {
        try {
          await job.updateProgress(100);
        } catch (progressError) {
          this.logger.warn(
            `Failed to update job progress: ${progressError instanceof Error ? progressError.message : progressError}`,
          );
        }
      }

      this.logger.log(
        `Location generation job ${job.id} completed: ${results.length} results`,
      );

      return results;
    } catch (error) {
      this.logger.error(
        `Location generation job ${job.id} failed:`,
        error instanceof Error ? error.message : error,
      );
      throw error;
    }
  }
}

