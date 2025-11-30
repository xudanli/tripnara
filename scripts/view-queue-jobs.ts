#!/usr/bin/env ts-node
/**
 * 查看队列任务脚本
 * 
 * 使用方法:
 *   npm run view:queue:jobs [status] [limit]
 *   或
 *   ts-node scripts/view-queue-jobs.ts [status] [limit]
 * 
 * 示例:
 *   npm run view:queue:jobs                    # 查看所有任务
 *   npm run view:queue:jobs active             # 查看进行中的任务
 *   npm run view:queue:jobs completed 10      # 查看最近10个已完成的任务
 */

import Redis from 'ioredis';
import { Queue } from 'bullmq';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载环境变量
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.prod' 
  : process.env.NODE_ENV === 'test'
  ? '.env.test'
  : '.env';

dotenv.config({ path: path.resolve(process.cwd(), envFile) });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.error('❌ REDIS_URL 环境变量未设置');
  process.exit(1);
}

// 解析 Redis URL
let redisConfig: any;
try {
  const url = new URL(redisUrl);
  const password = url.password || undefined;
  const host = url.hostname;
  const port = parseInt(url.port || '6379', 10);

  redisConfig = {
    host,
    port,
    password,
    ...(url.username && url.username !== 'default' ? { username: url.username } : {}),
    retryStrategy: (times: number) => {
      if (times > 3) {
        return null;
      }
      return Math.min(times * 200, 2000);
    },
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
    lazyConnect: true,
  };
} catch (error) {
  console.error('❌ Redis URL 解析失败:', error);
  process.exit(1);
}

// 获取命令行参数
const status = process.argv[2] as
  | 'waiting'
  | 'active'
  | 'completed'
  | 'failed'
  | 'delayed'
  | 'paused'
  | undefined;
const limit = process.argv[3] ? parseInt(process.argv[3], 10) : 20;

async function main() {
  const redis = new Redis(redisConfig);
  const queue = new Queue('location-generation', {
    connection: redisConfig,
  });

  try {
    await redis.connect();
    console.log('✅ Redis 连接成功\n');

    // 获取队列统计
    const [waiting, active, completed, failed, delayed] =
      await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);

    console.log('📊 队列统计信息:');
    console.log('─'.repeat(60));
    console.log(`  等待中 (waiting):  ${waiting}`);
    console.log(`  进行中 (active):   ${active}`);
    console.log(`  已完成 (completed): ${completed}`);
    console.log(`  失败 (failed):     ${failed}`);
    console.log(`  延迟 (delayed):    ${delayed}`);
    console.log(`  总计:              ${waiting + active + completed + failed + delayed}`);
    console.log('─'.repeat(60));
    console.log();

    // 获取任务列表
    let jobs: any[] = [];

    if (status) {
      console.log(`📋 查看 ${status} 状态的任务 (最多 ${limit} 个):\n`);
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
          // BullMQ 不支持 getPaused，返回空数组
          jobs = [];
          break;
      }
    } else {
      console.log(`📋 查看所有任务 (最多 ${limit} 个):\n`);
      // 按优先级获取：先显示进行中的，然后是等待的，最后是已完成的
      const [activeJobs, waitingJobs, completedJobs, failedJobs] = await Promise.all([
        queue.getActive(0, limit - 1),
        queue.getWaiting(0, limit - 1),
        queue.getCompleted(0, Math.floor(limit / 3) - 1),
        queue.getFailed(0, Math.floor(limit / 4) - 1),
      ]);
      jobs = [...activeJobs, ...waitingJobs, ...completedJobs, ...failedJobs].slice(0, limit);
    }

    if (jobs.length === 0) {
      console.log('  没有找到任务\n');
    } else {
      for (const job of jobs) {
        const state = await job.getState();
        const progress = job.progress || 0;
        const timestamp = job.timestamp
          ? new Date(job.timestamp).toLocaleString('zh-CN')
          : 'N/A';
        const processedOn = job.processedOn
          ? new Date(job.processedOn).toLocaleString('zh-CN')
          : 'N/A';
        const finishedOn = job.finishedOn
          ? new Date(job.finishedOn).toLocaleString('zh-CN')
          : 'N/A';

        console.log(`任务 ID: ${job.id}`);
        console.log(`  状态: ${state}`);
        console.log(`  进度: ${progress}%`);
        console.log(`  创建时间: ${timestamp}`);
        if (state === 'active' || state === 'completed') {
          console.log(`  开始处理: ${processedOn}`);
        }
        if (state === 'completed' || state === 'failed') {
          console.log(`  完成时间: ${finishedOn}`);
        }
        if (state === 'failed') {
          console.log(`  失败原因: ${job.failedReason || '未知'}`);
        }
        if (job.data?.activities) {
          console.log(`  活动数量: ${job.data.activities.length}`);
        }
        console.log();
      }
    }

    await queue.close();
    await redis.quit();
    console.log('👋 连接已关闭');
  } catch (error) {
    console.error('❌ 错误:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();

