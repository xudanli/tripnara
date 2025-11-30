#!/usr/bin/env ts-node
/**
 * Redis 集成测试脚本
 * 测试 LocationService 和 QueueService 的 Redis 功能
 * 
 * 使用方法:
 *   npm run test:redis:integration
 */

import Redis from 'ioredis';
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

const redis = new Redis(redisConfig);

// 测试结果
const testResults: Array<{ name: string; success: boolean; message: string; duration?: number }> = [];

async function runTest(
  name: string,
  testFn: () => Promise<void>
): Promise<void> {
  const startTime = Date.now();
  try {
    await testFn();
    const duration = Date.now() - startTime;
    testResults.push({ name, success: true, message: '通过', duration });
    console.log(`✅ ${name} (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);
    testResults.push({ name, success: false, message, duration });
    console.log(`❌ ${name}: ${message} (${duration}ms)`);
  }
}

// 测试 1: LocationService 缓存键格式
async function testLocationCacheKeyFormat() {
  const activityName = '铁力士峰云端漫步';
  const destination = '瑞士琉森';
  const activityType = 'attraction';
  
  // 模拟 LocationService 的缓存键生成逻辑
  const cacheKey = `location:${activityName.toLowerCase()}:${destination.toLowerCase()}:${activityType.toLowerCase()}`;
  
  const testData = {
    chineseName: activityName,
    localName: 'Titlis Cliff Walk',
    category: '景点',
    rating: 4.8,
  };
  
  // 存储（30天）
  await redis.setex(cacheKey, 30 * 24 * 60 * 60, JSON.stringify(testData));
  
  // 读取
  const cached = await redis.get(cacheKey);
  if (!cached) {
    throw new Error('缓存读取失败');
  }
  
  const parsed = JSON.parse(cached);
  if (parsed.chineseName !== testData.chineseName) {
    throw new Error('缓存数据不匹配');
  }
  
  // 清理
  await redis.del(cacheKey);
}

// 测试 2: 多个活动缓存
async function testMultipleLocationCache() {
  const activities = [
    { name: '铁力士峰云端漫步', destination: '瑞士琉森', type: 'attraction' },
    { name: '琉森湖游船', destination: '瑞士琉森', type: 'attraction' },
    { name: '琉森老城', destination: '瑞士琉森', type: 'attraction' },
  ];
  
  const pipeline = redis.pipeline();
  
  // 批量存储
  activities.forEach((activity) => {
    const key = `location:${activity.name.toLowerCase()}:${activity.destination.toLowerCase()}:${activity.type.toLowerCase()}`;
    const data = {
      chineseName: activity.name,
      destination: activity.destination,
      category: '景点',
    };
    pipeline.setex(key, 30 * 24 * 60 * 60, JSON.stringify(data));
  });
  
  await pipeline.exec();
  
  // 批量读取
  const keys = activities.map(a => 
    `location:${a.name.toLowerCase()}:${a.destination.toLowerCase()}:${a.type.toLowerCase()}`
  );
  const results = await redis.mget(...keys);
  
  if (results.filter(r => r !== null).length !== activities.length) {
    throw new Error('批量缓存读取失败');
  }
  
  // 清理
  await redis.del(...keys);
}

// 测试 3: 缓存过期时间
async function testCacheExpiration() {
  const key = 'test:expiration';
  const value = 'test value';
  
  // 设置 2 秒过期
  await redis.setex(key, 2, value);
  
  // 立即读取应该成功
  const result1 = await redis.get(key);
  if (result1 !== value) {
    throw new Error('立即读取失败');
  }
  
  // 等待 3 秒后应该过期
  await new Promise(resolve => setTimeout(resolve, 3000));
  const result2 = await redis.get(key);
  if (result2 !== null) {
    throw new Error('缓存未过期');
  }
}

// 测试 4: QueueService 队列操作（模拟）
async function testQueueOperations() {
  const queueName = 'location-generation';
  
  // 测试队列键格式
  const jobKey = `bull:${queueName}:1`;
  const jobData = {
    activities: [
      {
        activityName: '测试活动',
        destination: '测试目的地',
        activityType: 'attraction',
        coordinates: { lat: 0, lng: 0 },
      },
    ],
  };
  
  // 模拟存储任务数据
  await redis.setex(jobKey, 3600, JSON.stringify(jobData));
  
  // 读取任务数据
  const cached = await redis.get(jobKey);
  if (!cached) {
    throw new Error('任务数据读取失败');
  }
  
  const parsed = JSON.parse(cached);
  if (parsed.activities.length !== jobData.activities.length) {
    throw new Error('任务数据不匹配');
  }
  
  // 清理
  await redis.del(jobKey);
}

// 测试 5: 并发读写性能
async function testConcurrentReadWrite() {
  const keyPrefix = 'test:concurrent';
  const count = 10;
  
  // 并发写入
  const writePromises = Array.from({ length: count }, (_, i) => {
    const key = `${keyPrefix}:${i}`;
    const value = JSON.stringify({ index: i, data: `value-${i}` });
    return redis.setex(key, 60, value);
  });
  
  await Promise.all(writePromises);
  
  // 并发读取
  const keys = Array.from({ length: count }, (_, i) => `${keyPrefix}:${i}`);
  const readPromises = keys.map(key => redis.get(key));
  const results = await Promise.all(readPromises);
  
  if (results.filter(r => r !== null).length !== count) {
    throw new Error('并发读取失败');
  }
  
  // 清理
  await redis.del(...keys);
}

// 测试 6: 内存使用情况
async function testMemoryUsage() {
  const info = await redis.info('memory');
  const usedMemoryMatch = info.match(/used_memory:(\d+)/);
  const usedMemoryHumanMatch = info.match(/used_memory_human:([\d.]+[KMGT]?)/);
  
  if (usedMemoryMatch && usedMemoryHumanMatch) {
    const usedMemory = parseInt(usedMemoryMatch[1], 10);
    const usedMemoryHuman = usedMemoryHumanMatch[1];
    console.log(`   当前内存使用: ${usedMemoryHuman} (${usedMemory} bytes)`);
  }
}

// 测试 7: 键空间统计
async function testKeyspaceStats() {
  // 创建一些测试键
  const testKeys = ['test:keyspace:1', 'test:keyspace:2', 'test:keyspace:3'];
  await Promise.all(testKeys.map(key => redis.setex(key, 60, 'value')));
  
  // 获取键空间信息
  const info = await redis.info('keyspace');
  if (!info || info.trim().length === 0) {
    throw new Error('无法获取键空间信息');
  }
  
  // 清理
  await redis.del(...testKeys);
}

async function main() {
  console.log('🔍 Redis 集成测试\n');
  if (redisUrl) {
    console.log(`   配置: ${redisUrl.replace(/:[^:@]+@/, ':****@')}\n`);
  }
  
  redis.on('error', (error) => {
    console.error('❌ Redis 连接错误:', error.message);
  });
  
  await redis.connect();
  console.log('✅ Redis 连接成功\n');
  
  // 运行集成测试
  await runTest('1. LocationService 缓存键格式', testLocationCacheKeyFormat);
  await runTest('2. 多个活动缓存', testMultipleLocationCache);
  await runTest('3. 缓存过期时间', testCacheExpiration);
  await runTest('4. QueueService 队列操作（模拟）', testQueueOperations);
  await runTest('5. 并发读写性能', testConcurrentReadWrite);
  await runTest('6. 内存使用情况', testMemoryUsage);
  await runTest('7. 键空间统计', testKeyspaceStats);
  
  // 输出测试结果摘要
  console.log('\n📊 测试结果摘要:');
  console.log('─'.repeat(60));
  const passed = testResults.filter(r => r.success).length;
  const failed = testResults.filter(r => !r.success).length;
  const totalDuration = testResults.reduce((sum, r) => sum + (r.duration || 0), 0);
  
  testResults.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    const duration = result.duration ? ` (${result.duration}ms)` : '';
    console.log(`${icon} ${result.name}: ${result.message}${duration}`);
  });
  
  console.log('─'.repeat(60));
  console.log(`总计: ${testResults.length} 个测试`);
  console.log(`通过: ${passed} 个`);
  console.log(`失败: ${failed} 个`);
  console.log(`总耗时: ${totalDuration}ms`);
  
  if (failed === 0) {
    console.log('\n🎉 所有集成测试通过！');
  } else {
    console.log('\n⚠️  部分测试失败，请检查 Redis 配置和功能。');
    process.exit(1);
  }
  
  await redis.quit();
  console.log('\n👋 Redis 连接已关闭');
}

main().catch((error) => {
  console.error('❌ 测试执行失败:', error);
  process.exit(1);
});

