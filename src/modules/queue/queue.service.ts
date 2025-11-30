import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bullmq';
import { BatchActivityDto } from '../location/dto/location.dto';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('location-generation')
    private readonly locationQueue: Queue,
  ) {}

  /**
   * 将位置信息生成任务加入队列
   * @param activities 活动列表
   * @returns jobId 任务ID
   */
  async enqueueLocationGeneration(
    activities: BatchActivityDto[],
  ): Promise<string> {
    const job = await this.locationQueue.add('generate-batch', {
      activities,
    });

    this.logger.log(
      `Location generation job enqueued: ${job.id} (${activities.length} activities)`,
    );

    return job.id!;
  }

  /**
   * 获取任务状态
   * @param jobId 任务ID
   * @returns 任务状态信息
   */
  async getJobStatus(jobId: string): Promise<{
    id: string;
    status: string;
    progress?: number;
    result?: any;
    error?: string;
    data?: any;
  }> {
    const job = await this.locationQueue.getJob(jobId);

    if (!job) {
      return {
        id: jobId,
        status: 'not_found',
      };
    }

    const state = await job.getState();

    return {
      id: job.id!,
      status: state,
      progress: job.progress as number | undefined,
      result: job.returnvalue,
      error: job.failedReason,
      data: job.data,
    };
  }

  /**
   * 获取任务结果（如果已完成）
   * @param jobId 任务ID
   * @returns 任务结果
   */
  async getJobResult(jobId: string): Promise<any> {
    const job = await this.locationQueue.getJob(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const state = await job.getState();

    if (state === 'completed') {
      return job.returnvalue;
    }

    if (state === 'failed') {
      throw new Error(job.failedReason || 'Job failed');
    }

    throw new Error(`Job ${jobId} is not completed (status: ${state})`);
  }
}

