#!/usr/bin/env ts-node
/**
 * Redis 连接和功能测试脚本
 * 
 * 使用方法:
 *   npm run test:redis
 *   或
 *   ts-node scripts/test-redis.ts
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
  console.log('请在 .env 文件中设置 REDIS_URL，例如:');
  console.log('  REDIS_URL=redis://localhost:6379');
  console.log('  REDIS_URL=redis://default:password@localhost:6379');
  process.exit(1);
}

console.log('🔍 Redis 配置信息:');
console.log(`   REDIS_URL: ${redisUrl.replace(/:[^:@]+@/, ':****@')}`); // 隐藏密码

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
        return null; // 停止重试
      }
      return Math.min(times * 200, 2000);
    },
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
    lazyConnect: true,
  };

  console.log(`   解析结果: ${host}:${port}`);
} catch (error) {
  console.error('❌ Redis URL 解析失败:', error);
  process.exit(1);
}

// 创建 Redis 客户端
const redis = new Redis(redisConfig);

// 测试结果
const testResults: Array<{ name: string; success: boolean; message: string; duration?: number }> = [];

// 辅助函数：运行测试
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

// 测试 1: 连接测试
async function testConnection() {
  await redis.connect();
  const pong = await redis.ping();
  if (pong !== 'PONG') {
    throw new Error(`PING 返回异常: ${pong}`);
  }
}

// 测试 2: 基本 SET/GET
async function testBasicOperations() {
  const key = 'test:basic';
  const value = 'Hello Redis!';
  
  await redis.set(key, value);
  const result = await redis.get(key);
  
  if (result !== value) {
    throw new Error(`GET 返回值与预期不符: ${result} !== ${value}`);
  }
  
  // 清理
  await redis.del(key);
}

// 测试 3: SETEX (带过期时间)
async function testSetex() {
  const key = 'test:setex';
  const value = 'This will expire';
  const ttl = 5; // 5秒
  
  await redis.setex(key, ttl, value);
  const result = await redis.get(key);
  
  if (result !== value) {
    throw new Error(`SETEX 后立即 GET 失败`);
  }
  
  // 检查 TTL
  const remainingTtl = await redis.ttl(key);
  if (remainingTtl <= 0 || remainingTtl > ttl) {
    throw new Error(`TTL 异常: ${remainingTtl}`);
  }
  
  // 清理
  await redis.del(key);
}

// 测试 4: JSON 存储和读取（模拟 LocationService）
async function testJsonStorage() {
  const key = 'test:location:铁力士峰云端漫步:瑞士琉森:attraction';
  const locationInfo = {
    chineseName: '铁力士峰云端漫步',
    localName: 'Titlis Cliff Walk',
    chineseAddress: 'Titlis Bergstation, 6390 Engelberg, Switzerland',
    transportInfo: '从琉森乘火车约45分钟至Engelberg站',
    openingHours: '全年开放，夏季8:30-17:30',
    ticketPrice: 'Cliff Walk约CHF 15',
    category: '景点',
    rating: 4.8,
    visitDuration: '2-3小时',
  };
  
  // 存储 JSON
  await redis.setex(key, 30 * 24 * 60 * 60, JSON.stringify(locationInfo));
  
  // 读取 JSON
  const cached = await redis.get(key);
  if (!cached) {
    throw new Error('缓存读取失败');
  }
  
  const parsed = JSON.parse(cached);
  if (parsed.chineseName !== locationInfo.chineseName) {
    throw new Error('JSON 解析后数据不匹配');
  }
  
  // 清理
  await redis.del(key);
}

// 测试 5: 批量操作
async function testBatchOperations() {
  const keys = ['test:batch:1', 'test:batch:2', 'test:batch:3'];
  const values = ['value1', 'value2', 'value3'];
  
  // 批量 SET
  const pipeline = redis.pipeline();
  keys.forEach((key, index) => {
    pipeline.set(key, values[index]);
  });
  await pipeline.exec();
  
  // 批量 GET
  const results = await redis.mget(...keys);
  for (let i = 0; i < keys.length; i++) {
    if (results[i] !== values[i]) {
      throw new Error(`批量 GET 失败: ${results[i]} !== ${values[i]}`);
    }
  }
  
  // 清理
  await redis.del(...keys);
}

// 测试 6: 键存在性检查
async function testKeyExists() {
  const key = 'test:exists';
  
  // 键不存在
  const exists1 = await redis.exists(key);
  if (exists1 !== 0) {
    throw new Error('不存在的键应该返回 0');
  }
  
  // 设置键
  await redis.set(key, 'value');
  
  // 键存在
  const exists2 = await redis.exists(key);
  if (exists2 !== 1) {
    throw new Error('存在的键应该返回 1');
  }
  
  // 清理
  await redis.del(key);
}

// 测试 7: 键删除
async function testKeyDeletion() {
  const key = 'test:delete';
  
  await redis.set(key, 'value');
  const deleted = await redis.del(key);
  
  if (deleted !== 1) {
    throw new Error(`删除键失败，返回: ${deleted}`);
  }
  
  const exists = await redis.exists(key);
  if (exists !== 0) {
    throw new Error('删除后键仍存在');
  }
}

// 测试 8: 信息获取
async function testInfo() {
  const info = await redis.info('server');
  if (!info || !info.includes('redis_version')) {
    throw new Error('INFO 命令返回异常');
  }
  
  // 提取 Redis 版本
  const versionMatch = info.match(/redis_version:([\d.]+)/);
  if (versionMatch) {
    console.log(`   Redis 版本: ${versionMatch[1]}`);
  }
}

// 主测试函数
async function main() {
  console.log('\n🧪 开始 Redis 测试...\n');
  
  // 注册错误处理
  redis.on('error', (error) => {
    console.error('❌ Redis 连接错误:', error.message);
  });
  
  redis.on('connect', () => {
    console.log('✅ Redis 连接成功\n');
  });
  
  // 运行所有测试
  await runTest('1. 连接测试', testConnection);
  await runTest('2. 基本 SET/GET 操作', testBasicOperations);
  await runTest('3. SETEX (带过期时间)', testSetex);
  await runTest('4. JSON 存储和读取 (LocationService 模拟)', testJsonStorage);
  await runTest('5. 批量操作', testBatchOperations);
  await runTest('6. 键存在性检查', testKeyExists);
  await runTest('7. 键删除', testKeyDeletion);
  await runTest('8. 信息获取', testInfo);
  
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
    console.log('\n🎉 所有测试通过！');
  } else {
    console.log('\n⚠️  部分测试失败，请检查 Redis 配置和连接。');
    process.exit(1);
  }
  
  // 关闭连接
  await redis.quit();
  console.log('\n👋 Redis 连接已关闭');
}

// 运行测试
main().catch((error) => {
  console.error('❌ 测试执行失败:', error);
  process.exit(1);
});

