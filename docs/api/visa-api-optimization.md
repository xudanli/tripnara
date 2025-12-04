# 签证信息接口优化说明

## 概述

本文档详细说明了签证信息接口（`GET /api/visa/info`）的缓存策略和业务逻辑优化。

## 优化内容

### 1. 主动缓存失效 (Cache Invalidation)

#### 问题
当管理员通过管理接口更新政策时，用户端仍然会读取旧的 Redis 缓存，直到 24 小时后过期。

#### 解决方案
- **通配符删除**：使用 `visa:JP:*` 模式删除该目的地的所有相关缓存
- **自动清理**：在 `createPolicy`、`updatePolicy`、`deletePolicy` 方法中自动清除相关缓存
- **批量删除**：使用 Redis pipeline 批量删除，提高性能

#### 实现细节
```typescript
// 使用通配符删除所有相关缓存
const pattern1 = `visa:${destUpper}:*`;
const keys1 = await this.redisClient.keys(pattern1);

// 使用 pipeline 批量删除
const pipeline = this.redisClient.pipeline();
allKeys.forEach((key) => pipeline.del(key));
await pipeline.exec();
```

---

### 2. 缓存穿透保护 (Cache Penetration Protection)

#### 问题
如果用户查询一个不存在的组合（例如"火星人"去"南极"），数据库查不到数据，Redis 也不存，导致每次请求都打到数据库。

#### 解决方案
- **缓存空结果**：如果数据库查询为空，在 Redis 中存入特殊标记 `__EMPTY__`
- **较短TTL**：空结果使用较短的过期时间（5分钟），防止恶意攻击
- **快速响应**：后续相同查询直接从缓存返回，避免数据库压力

#### 实现细节
```typescript
// 缓存穿透保护：如果结果为空，缓存特殊标记
if (results.length === 0) {
  await this.redisClient.setex(
    cacheKey,
    this.emptyCacheTtlSeconds, // 5分钟
    '__EMPTY__',
  );
}

// 读取时检查空结果标记
if (cached === '__EMPTY__') {
  return [];
}
```

---

### 3. 动态 TTL (Dynamic TTL)

#### 问题
如果政策的 `expiryDate`（过期时间）距离现在只有 1 小时，而缓存 TTL 是 24 小时，会导致缓存中存留过期数据。

#### 解决方案
- **动态计算**：根据政策的过期时间动态设置缓存 TTL
- **公式**：`TTL = Min(24小时, policy.expiryDate - now)`
- **最小TTL**：确保 TTL 不会太短（至少 5 分钟）

#### 实现细节
```typescript
private calculateDynamicTtl(policies: VisaPolicyEntity[], now: Date): number {
  let minTtl = this.maxCacheTtlSeconds; // 24小时

  for (const policy of policies) {
    if (policy.expiryDate) {
      const secondsUntilExpiry = Math.floor(
        (expiry.getTime() - now.getTime()) / 1000,
      );
      if (secondsUntilExpiry > 0 && secondsUntilExpiry < minTtl) {
        minTtl = secondsUntilExpiry;
      }
    }
  }

  // 确保TTL不会太短也不会超过最大值
  return Math.max(
    this.emptyCacheTtlSeconds, // 5分钟
    Math.min(minTtl, this.maxCacheTtlSeconds), // 24小时
  );
}
```

---

### 4. 数据库查询优化 (Single Round-trip Query)

#### 问题
原来的逻辑是"优先查询永久居民...然后查询国籍信息"，这是两次独立的 DB 查询，会有性能损耗。

#### 解决方案
- **合并查询**：构建一个 OR 查询，一次性取出该目的地针对"国籍"和"永久居民"的所有有效策略
- **内存筛选**：在代码层面进行优先级排序和筛选
- **减少I/O**：减少一次数据库网络 I/O

#### 实现细节
```typescript
// 构建 OR 查询
const queryBuilder = this.visaPolicyRepository
  .createQueryBuilder('policy')
  .where('policy.destinationCountryCode = :destCode', { destCode })
  .andWhere('policy.isActive = :isActive', { isActive: true })
  .andWhere('(policy.effectiveDate IS NULL OR policy.effectiveDate <= :now)', { now })
  .andWhere('(policy.expiryDate IS NULL OR policy.expiryDate >= :now)', { now });

// 构建 OR 条件
if (natUpper) {
  orConditions.push(
    "(policy.applicantType = 'nationality' AND policy.applicantCountryCode = :natCode)",
  );
  queryBuilder.setParameter('natCode', natUpper);
}

if (prUpper) {
  orConditions.push(
    "(policy.applicantType = 'permanent_resident' AND policy.applicantCountryCode = :prCode)",
  );
  queryBuilder.setParameter('prCode', prUpper);
}

queryBuilder.andWhere(`(${orConditions.join(' OR ')})`);
const policies = await queryBuilder.getMany();
```

---

### 5. 最优策略选择 (Best Policy Selection)

#### 问题
如果用户持有 A 国护照（免签）和 B 国绿卡（需电子签），按照现有逻辑，如果提供了绿卡，可能会返回电子签，而忽略了更优的免签护照。

#### 解决方案
- **同时查询**：同时查询出国籍和 PR 的政策
- **权重对比**：对比 VisaType 的权重（免签 > 落地签 > 电子签 > 需要签证）
- **返回最优**：返回对用户最有利的那一个，或者在响应中返回列表让前端展示

#### 签证类型权重
```typescript
private readonly visaTypeWeights: Record<VisaType, number> = {
  'visa-free': 1,              // 最优
  'visa-on-arrival': 2,
  'e-visa': 3,
  'permanent-resident-benefit': 4,
  'visa-required': 5,          // 最差
};
```

#### 实现细节
```typescript
private selectBestPolicies(
  allResults: VisaInfo[],
  nationalityCode?: string,
  permanentResidencyCode?: string,
  policies?: VisaPolicyEntity[],
): VisaInfo[] {
  // 分离国籍和PR政策
  const nationalityResults: VisaInfo[] = [];
  const prResults: VisaInfo[] = [];

  policies.forEach((policy, index) => {
    const visaInfo = allResults[index];
    if (policy.applicantType === 'nationality') {
      nationalityResults.push(visaInfo);
    } else if (policy.applicantType === 'permanent_resident') {
      prResults.push(visaInfo);
    }
  });

  // 对比两种政策，选择最优的
  const bestNationality = this.getBestPolicy(nationalityResults);
  const bestPR = this.getBestPolicy(prResults);

  // 返回最优策略（如果权重相同，返回两个）
  const bestWeight = Math.min(
    this.visaTypeWeights[bestNationality.visaType],
    this.visaTypeWeights[bestPR.visaType],
  );

  // ... 返回最优策略列表
}
```

---

### 6. Redis 熔断机制 (Circuit Breaker)

#### 问题
如果 Redis 彻底挂了，每个请求都去尝试连 Redis 然后超时，导致响应延迟过高。

#### 解决方案
- **熔断器**：如果 Redis 连接失败，打开熔断器，直接切断 Redis 链路
- **自动恢复**：60秒后自动尝试恢复
- **降级策略**：熔断期间直接走数据库，避免响应延迟

#### 实现细节
```typescript
// Redis 熔断状态
private redisCircuitBreakerOpen = false;
private redisCircuitBreakerOpenTime?: Date;
private readonly circuitBreakerTimeout = 60 * 1000; // 60秒

// 打开熔断器
private openCircuitBreaker(): void {
  if (!this.redisCircuitBreakerOpen) {
    this.redisCircuitBreakerOpen = true;
    this.redisCircuitBreakerOpenTime = new Date();
    this.logger.warn('Redis circuit breaker opened due to connection errors');
  }
}

// 检查并尝试关闭熔断器
private checkCircuitBreaker(): void {
  if (this.redisCircuitBreakerOpen && this.redisCircuitBreakerOpenTime) {
    const elapsed = Date.now() - this.redisCircuitBreakerOpenTime.getTime();
    if (elapsed >= this.circuitBreakerTimeout) {
      this.redisCircuitBreakerOpen = false;
      this.redisCircuitBreakerOpenTime = undefined;
      this.logger.log('Redis circuit breaker closed, attempting to reconnect');
    }
  }
}
```

---

## 性能提升

### 查询性能
- **数据库I/O**：从 2 次减少到 1 次（合并查询）
- **缓存命中率**：通过空结果缓存，提高缓存命中率
- **响应时间**：减少数据库查询，提高响应速度

### 缓存效率
- **缓存失效**：管理接口更新后立即生效，无需等待24小时
- **缓存穿透**：空结果缓存，防止恶意攻击
- **动态TTL**：根据政策过期时间动态调整，避免过期数据

### 业务逻辑
- **最优策略**：自动选择对用户最有利的签证政策
- **用户体验**：如果两种身份都有最优策略，返回两个让用户选择

---

## 注意事项

### 时区处理
- 确保 `effectiveDate` 和 `expiryDate` 在数据库存储和代码比较时，时区标准一致（建议统一使用 UTC）
- 在跨时区查询时（例如用户在纽约查东京的签证）可能会出现生效时间偏差

### Redis 性能
- 使用 `KEYS` 命令查找缓存键可能在生产环境中影响性能（如果键数量很大）
- 建议使用 Redis SCAN 命令替代（未来优化）

### 缓存键设计
- 当前格式：`visa:{destination}:{nationality}:{permanentResidency}`
- 如果添加新的查询参数，需要更新缓存键格式

---

## 未来优化建议

1. **国际化支持**：根据 Request Header 中的 `Accept-Language` 返回对应的语言文本
2. **富文本字段**：增加 `requirements` 数组字段，列出具体要求（如：护照有效期需6个月以上、需返程机票等）
3. **Redis SCAN**：使用 `SCAN` 命令替代 `KEYS`，避免阻塞 Redis
4. **监控告警**：添加 Redis 连接状态和熔断器状态的监控告警
5. **缓存预热**：在系统启动时预热常用目的地的签证信息

---

## 相关文档

- [签证管理 API 接口文档](./visa-api.md)
- [签证 API 快速参考](./visa-api-quick-reference.md)

