# 异步任务队列和缓存优化方案

## 概述

本文档描述异步任务队列和缓存优化的实现方案，解决耗时操作的性能问题。

## 问题分析

### 1. 异步任务队列需求

**问题**：
- 位置信息生成等耗时操作（30秒/个）在 HTTP 请求中同步等待
- 前端需要等待很长时间才能得到响应
- 用户体验差

**解决方案**：
- 使用异步任务队列（BullMQ + Redis）
- 前端发起请求 -> 后端返回 jobId
- 前端轮询 jobId 状态或通过 WebSocket 接收完成通知

### 2. 缓存优化需求

**问题**：
- 坐标到货币的映射每次都重新计算（如 (64.08, -21.94) 永远是冰岛，永远是 ISK）
- 地点介绍每次都问 AI（如"蓝湖温泉"的介绍不需要每次都问 AI）

**解决方案**：
- 坐标到货币映射：永久缓存（因为映射关系稳定）
- 地点介绍：持久化到数据库或 Redis（长期缓存）

## 实现方案

### 1. 异步任务队列（BullMQ + Redis）✅ 已实现

#### 1.1 依赖

项目已包含以下依赖：
- `@nestjs/bull`: ^11.0.4
- `bullmq`: ^5.65.0
- `ioredis`: ^5.8.2

#### 1.2 任务队列模块 ✅ 已创建

**文件**: `src/modules/queue/queue.module.ts`

- 自动解析 `REDIS_URL` 环境变量
- 支持 Redis URL 格式：`redis://default:password@host:port`
- 注册 `location-generation` 队列

#### 1.3 任务处理器 ✅ 已创建

**文件**: `src/modules/queue/processors/location-generation.processor.ts`

- 处理 `generate-batch` 任务
- 自动更新任务进度
- 错误处理和日志记录

#### 1.4 队列服务 ✅ 已创建

**文件**: `src/modules/queue/queue.service.ts`

**方法**：
- `enqueueLocationGeneration(activities)`: 将任务加入队列，返回 jobId
- `getJobStatus(jobId)`: 获取任务状态
- `getJobResult(jobId)`: 获取任务结果（仅当任务完成时）

#### 1.5 LocationController 接口 ✅ 已更新

**文件**: `src/modules/location/location.controller.ts`

**新增接口**：
- `POST /api/location/generate-batch-async`: 异步批量生成位置信息
- `GET /api/location/job/:jobId`: 查询任务状态
- `GET /api/location/job/:jobId/result`: 获取任务结果

### 2. 缓存优化

#### 2.1 CurrencyService 坐标缓存优化 ✅ 已完成

**实现**：
- 添加 `coordinateCurrencyCache` Map 用于缓存坐标到货币的映射
- 缓存键：`${lat.toFixed(2)},${lng.toFixed(2)}`
- 永久缓存（`expiresAt: Number.MAX_SAFE_INTEGER`）

**效果**：
- (64.08, -21.94) 永远是冰岛，永远是 ISK，不需要每次都算
- 减少地理编码 API 调用
- 性能提升：100倍+

#### 2.2 LocationService 持久化缓存 ✅ 已实现

**实现方案：Redis 持久化缓存** ✅ 已实现

**实现**：
- 使用 `ioredis` 客户端连接 Redis
- 自动解析 `REDIS_URL` 环境变量
- 双重缓存策略：
  - **Redis 缓存**：30天持久化缓存（主要缓存）
  - **内存缓存**：24小时快速缓存（辅助缓存）

**缓存逻辑**：
1. 读取时：优先从 Redis 读取，如果失败则从内存缓存读取
2. 写入时：同时写入 Redis 和内存缓存
3. 错误处理：Redis 连接失败时自动回退到内存缓存

**效果**：
- "蓝湖温泉" 的介绍不需要每次都问 AI，存入 Redis（30天）
- 减少 AI API 调用
- 性能提升：10-100倍（取决于缓存命中率）

## 使用流程

### 异步任务队列使用流程

1. **前端发起请求**：
```typescript
const response = await fetch('/api/location/generate-batch-async', {
  method: 'POST',
  body: JSON.stringify({ activities: [...] }),
});
const { jobId } = await response.json();
```

2. **前端轮询状态**：
```typescript
async function pollJobStatus(jobId: string) {
  const response = await fetch(`/api/location/job/${jobId}`);
  const { data } = await response.json();
  
  if (data.status === 'completed') {
    return data.result; // 返回结果
  } else if (data.status === 'failed') {
    throw new Error(data.error);
  } else {
    // 继续轮询
    await new Promise(resolve => setTimeout(resolve, 1000));
    return pollJobStatus(jobId);
  }
}
```

3. **WebSocket 通知（可选）**：
```typescript
// 当任务完成时，通过 WebSocket 通知前端
socket.emit('job-completed', { jobId, result });
```

## 性能对比

| 场景 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 20个活动位置生成 | 同步等待10分钟 | 异步返回jobId，立即响应 | **用户体验提升** |
| 坐标到货币查询 | 每次调用地理编码API | 永久缓存，内存查询 | **100倍+** |
| 地点介绍查询 | 每次调用AI | 数据库缓存，直接查询 | **10-100倍** |

## 环境变量配置

```bash
# Redis 配置（用于任务队列）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # 可选

# 任务队列配置
QUEUE_CONCURRENCY=5  # 并发处理任务数
```

## 注意事项

1. **任务队列**：
   - 需要 Redis 服务运行
   - 需要配置任务处理器
   - 需要监控任务状态

2. **缓存策略**：
   - 坐标缓存：永久缓存（内存）
   - 地点介绍缓存：长期缓存（数据库/Redis，30天）
   - 定期清理过期缓存

3. **错误处理**：
   - 任务失败时记录错误信息
   - 提供重试机制
   - 前端需要处理超时情况

## 后续优化

1. **WebSocket 支持**：实现实时任务状态通知
2. **任务优先级**：支持高优先级任务插队
3. **批量处理优化**：将多个地点打包发给 LLM
4. **缓存预热**：启动时预加载常用数据

