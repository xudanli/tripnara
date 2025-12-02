# Redis 连接问题排查指南

## 常见错误

### MaxRetriesPerRequestError

**错误信息：**
```
MaxRetriesPerRequestError: Reached the max retries per request limit (which is 20).
```

**原因：**
- Redis 服务未运行或无法连接
- 网络连接问题
- Redis 配置错误

## 快速诊断

### 1. 检查 Redis 服务状态

#### Docker 环境
```bash
# 检查 Redis 容器是否运行
docker ps | grep redis

# 如果容器未运行，启动它
docker start <redis-container-name>

# 或者重启容器
docker restart <redis-container-name>
```

#### 本地环境 (Linux/Mac)
```bash
# 检查 Redis 进程
ps aux | grep redis

# 检查 Redis 服务状态 (systemd)
sudo systemctl status redis

# 手动测试连接
redis-cli ping
# 如果返回 "PONG" 说明服务正常
# 如果连接被拒绝，说明服务未运行
```

#### 启动 Redis 服务
```bash
# Docker
docker run -d --name redis -p 6379:6379 redis:latest

# Linux (systemd)
sudo systemctl start redis

# Mac (Homebrew)
brew services start redis
```

### 2. 检查环境变量

确认 `REDIS_URL` 环境变量已正确设置：

```bash
# 检查环境变量
echo $REDIS_URL

# 格式应该是：
# redis://default:password@host:port
# 或
# redis://host:port
```

### 3. 测试 Redis 连接

```bash
# 使用 redis-cli 测试
redis-cli -h <host> -p <port> ping

# 如果需要密码
redis-cli -h <host> -p <port> -a <password> ping
```

## 代码层面的修复

### BullMQ 配置

我们已经将 `maxRetriesPerRequest` 设置为 `null`，这样：
- 队列在 Redis 断开时会保持等待状态
- 不会立即抛出错误
- 会在 Redis 恢复后自动重连

### 配置位置

`src/modules/queue/queue.module.ts`

```typescript
connection: {
  maxRetriesPerRequest: null, // 允许无限重试
  // ... 其他配置
}
```

## 预防措施

### 1. 监控 Redis 健康状态

建议添加健康检查端点，定期检查 Redis 连接：

```typescript
// 在 QueueService 中添加
async checkHealth(): Promise<boolean> {
  try {
    await this.locationQueue.client.ping();
    return true;
  } catch (error) {
    return false;
  }
}
```

### 2. 优雅降级

当 Redis 不可用时，可以考虑：
- 使用同步接口作为备选方案
- 将任务暂存到数据库，等待 Redis 恢复后处理
- 显示友好的错误提示给用户

### 3. 日志监控

关注以下日志：
- `MaxRetriesPerRequestError` - Redis 连接失败
- `ECONNREFUSED` - Redis 服务未运行
- `ETIMEDOUT` - 网络超时

## 常见场景

### 场景 1：Redis 服务突然停止

**症状：**
- 之前能正常工作
- 突然出现连接错误
- 日志显示 `ECONNREFUSED`

**解决：**
1. 检查 Redis 服务状态
2. 重启 Redis 服务
3. 检查系统资源（内存、磁盘）

### 场景 2：网络问题

**症状：**
- 间歇性连接失败
- 日志显示 `ETIMEDOUT` 或 `ENOTFOUND`

**解决：**
1. 检查网络连接
2. 检查防火墙设置
3. 检查 Redis 服务器是否可访问

### 场景 3：配置错误

**症状：**
- 启动时无法连接
- 日志显示认证失败

**解决：**
1. 检查 `REDIS_URL` 环境变量
2. 验证用户名和密码
3. 检查端口是否正确

## 相关文件

- `src/modules/queue/queue.module.ts` - BullMQ 配置
- `src/modules/queue/queue.service.ts` - 队列服务实现
- `.env` - 环境变量配置

## 参考文档

- [BullMQ 官方文档](https://docs.bullmq.io/)
- [ioredis 配置选项](https://github.com/redis/ioredis/blob/master/API.md#new-redisport-host-options)
