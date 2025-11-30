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

  /**
   * 获取队列中的所有任务
   * @param queueName 队列名称
   * @param options 查询选项
   * @returns 任务列表
   */
  async getJobs(
    queueName: string,
    options: {
      status?: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused';
      limit?: number;
    } = {},
  ) {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const { status, limit = 50 } = options;
    let jobs: any[] = [];

    if (status) {
      // 根据状态获取任务
      switch (status) {
        case 'waiting':
          jobs = await queue.getWaiting(0, limit - 1);
          break;
        case 'active':
          jobs = await queue.getActive(0, limit - 1);
          break;
        case 'completed':
          jobs = await queue.getCompleted(0, limit - 1);
          break;
        case 'failed':
          jobs = await queue.getFailed(0, limit - 1);
          break;
        case 'delayed':
          jobs = await queue.getDelayed(0, limit - 1);
          break;
        case 'paused':
          // BullMQ 可能不支持 getPaused，使用 getWaiting 代替
          jobs = await queue.getWaiting(0, limit - 1);
          break;
      }
    } else {
      // 获取所有状态的任务（合并）
      const [waiting, active, completed, failed, delayed] =
        await Promise.all([
          queue.getWaiting(0, limit - 1),
          queue.getActive(0, limit - 1),
          queue.getCompleted(0, limit - 1),
          queue.getFailed(0, limit - 1),
          queue.getDelayed(0, limit - 1),
        ]);
      jobs = [
        ...waiting,
        ...active,
        ...completed,
        ...failed,
        ...delayed,
      ].slice(0, limit);
    }

    // 格式化任务信息
    const formattedJobs = await Promise.all(
      jobs.map(async (job) => {
        const state = await job.getState();
        return {
          id: job.id,
          name: job.name,
          status: state,
          progress: job.progress,
          data: job.data,
          returnvalue: job.returnvalue,
          failedReason: job.failedReason,
          timestamp: job.timestamp,
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
        };
      }),
    );

    return {
      success: true,
      data: formattedJobs,
      total: formattedJobs.length,
    };
  }

  /**
   * 获取任务的详细信息
   * @param queueName 队列名称
   * @param jobId 任务ID
   * @returns 任务详细信息
   */
  async getJobDetails(queueName: string, jobId: string) {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const state = await job.getState();
    const logs = await job.getState();

    return {
      success: true,
      data: {
        id: job.id,
        name: job.name,
        status: state,
        progress: job.progress,
        data: job.data,
        returnvalue: job.returnvalue,
        failedReason: job.failedReason,
        stacktrace: job.stacktrace,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        attemptsMade: job.attemptsMade,
        opts: job.opts,
      },
    };
  }

  /**
   * 获取队列统计信息
   * @param queueName 队列名称
   * @returns 队列统计
   */
  async getQueueStats(queueName: string) {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const [waiting, active, completed, failed, delayed] =
      await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);

    return {
      success: true,
      data: {
        queueName,
        counts: {
          waiting,
          active,
          completed,
          failed,
          delayed,
          total: waiting + active + completed + failed + delayed,
        },
      },
    };
  }

  /**
   * 获取队列实例（辅助方法）
   * @param queueName 队列名称
   * @returns 队列实例
   */
  private getQueue(queueName: string) {
    if (queueName === 'location-generation') {
      return this.locationQueue;
    }
    return null;
  }
}


