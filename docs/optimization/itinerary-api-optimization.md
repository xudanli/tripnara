# 行程接口优化建议

## 📋 概述

本文档列出了行程相关接口的优化建议，包括性能优化、代码重构、数据库优化等方面。

---

## 🔴 高优先级优化

### 1. 货币信息存储优化 ⚠️ **性能问题**

**问题：**
- 每次调用 `entityToDetailWithTimeSlotsDto` 都会异步推断货币
- 货币推断可能调用外部 API（地理编码服务），增加响应时间
- 相同目的地的行程每次都要重新推断货币

**影响：**
- 增加接口响应时间（可能增加 100-500ms）
- 增加外部 API 调用成本
- 用户体验下降

**解决方案：**

#### 方案 A：在数据库中存储货币信息（推荐）

1. **添加数据库字段：**
```typescript
// src/modules/persistence/entities/itinerary.entity.ts
@Column({ type: 'varchar', length: 10, nullable: true })
currency?: string;  // 货币代码，如 'CHF'

@Column({ type: 'jsonb', nullable: true })
currencyInfo?: {     // 货币详细信息
  code: string;
  symbol: string;
  name: string;
};
```

2. **在创建/更新行程时推断并存储货币：**
```typescript
// 在 createItinerary 和 updateItinerary 中
const currency = await this.currencyService.inferCurrency({
  destination: dto.destination,
  coordinates: firstActivity?.coordinates,
});
// 存储到数据库
updateData.currency = currency.code;
updateData.currencyInfo = currency;
```

3. **在查询时直接使用存储的货币信息：**
```typescript
// entityToDetailWithTimeSlotsDto 中
const currency = entity.currencyInfo || await this.currencyService.inferCurrency(...);
```

**收益：**
- 减少响应时间 100-500ms
- 减少外部 API 调用
- 提高用户体验

---

### 2. 代码重复：实体转换方法 🔄

**问题：**
- `entityToDetailDto` 和 `entityToDetailWithTimeSlotsDto` 有大量重复代码
- 数据验证逻辑重复
- 维护成本高

**当前代码：**
```typescript
// 两个方法中有大量重复的数据验证和转换逻辑
private async entityToDetailWithTimeSlotsDto(...) { ... }
private entityToDetailDto(...) { ... }
```

**解决方案：**

提取公共方法，减少重复：

```typescript
// 提取公共的数据验证和基础转换逻辑
private validateAndTransformEntity(entity: ItineraryEntity) {
  const daysArray = Array.isArray(entity.days) ? entity.days : [];
  const totalCost = DataValidator.fixNumber(entity.totalCost, 0, 0);
  const summary = DataValidator.fixString(entity.summary, '');
  const startDate = DataValidator.fixDate(entity.startDate as Date | string);
  
  return { daysArray, totalCost, summary, startDate };
}

// 简化两个转换方法
private async entityToDetailWithTimeSlotsDto(entity: ItineraryEntity) {
  const base = this.validateAndTransformEntity(entity);
  // ... 只处理 timeSlots 转换
}

private entityToDetailDto(entity: ItineraryEntity) {
  const base = this.validateAndTransformEntity(entity);
  // ... 只处理 activities 转换
}
```

**收益：**
- 减少代码重复 50%+
- 降低维护成本
- 提高代码可读性

---

### 3. 权限检查代码重复 🔐

**问题：**
- 权限检查逻辑分散在多个方法中
- 有 40+ 处调用 `checkOwnership`
- 错误消息不一致

**当前代码：**
```typescript
// 在多个方法中重复
const isOwner = await this.itineraryRepository.checkOwnership(journeyId, userId);
if (!isOwner) {
  throw new ForbiddenException('无权修改此行程');
}
```

**解决方案：**

创建统一的权限检查装饰器或方法：

```typescript
// 方法 1：使用装饰器（推荐）
@RequireOwnership('journeyId')
async updateItinerary(...) { ... }

// 方法 2：创建辅助方法
private async ensureOwnership(journeyId: string, userId: string, action: string = '访问') {
  const isOwner = await this.itineraryRepository.checkOwnership(journeyId, userId);
  if (!isOwner) {
    throw new ForbiddenException(`无权${action}此行程`);
  }
}

// 使用
await this.ensureOwnership(journeyId, userId, '修改');
```

**收益：**
- 统一权限检查逻辑
- 减少代码重复
- 提高可维护性

---

### 4. 数据库批量操作优化 💾

**问题：**
- 创建行程时，活动是逐个保存的（循环中）
- 每个活动都执行一次数据库 INSERT
- 性能较差，特别是行程天数多时

**当前代码：**
```typescript
// src/modules/persistence/repositories/itinerary/itinerary.repository.ts
for (const activityData of dayData.activities) {
  const activity = this.activityRepository.create({...});
  await this.activityRepository.save(activity);  // 逐个保存
}
```

**解决方案：**

使用批量插入：

```typescript
// 收集所有活动
const allActivities = [];
for (const dayData of daysData) {
  const savedDay = await this.dayRepository.save(day);
  for (const activityData of dayData.activities) {
    allActivities.push(
      this.activityRepository.create({
        dayId: savedDay.id,
        ...activityData,
      })
    );
  }
}

// 批量保存
if (allActivities.length > 0) {
  await this.activityRepository.save(allActivities);
}
```

**收益：**
- 减少数据库往返次数
- 提高创建行程性能（特别是多天行程）
- 减少数据库负载

---

## 🟡 中优先级优化

### 5. 查询优化：减少不必要的 findById 调用

**问题：**
- 多个方法中重复调用 `findById`
- 某些场景下可以复用已查询的数据

**优化建议：**
- 在更新操作中，如果已经查询了实体，可以复用
- 考虑使用事务，减少查询次数

---

### 6. 错误处理统一化

**问题：**
- 错误消息格式不一致
- 某些错误处理可以更友好

**优化建议：**
- 创建统一的错误处理工具类
- 提供更详细的错误信息（包含上下文）

---

### 7. 日志优化

**问题：**
- 某些关键操作缺少日志
- 日志级别使用不当

**优化建议：**
- 为关键操作添加结构化日志
- 使用适当的日志级别（debug/info/warn/error）

---

## 🟢 低优先级优化

### 8. DTO 验证增强

**建议：**
- 添加更多的业务规则验证
- 提供更详细的验证错误信息

---

### 9. 缓存策略

**建议：**
- 考虑对频繁查询的行程数据进行缓存
- 使用 Redis 缓存热门行程

---

### 10. 分页优化

**建议：**
- 优化列表查询的分页性能
- 考虑使用游标分页替代偏移分页

---

## 📊 优化优先级总结

| 优先级 | 优化项 | 影响 | 工作量 | 推荐实施 |
|--------|--------|------|--------|----------|
| 🔴 高 | 货币信息存储 | 性能 | 中 | ✅ 立即 |
| 🔴 高 | 代码重复消除 | 维护性 | 中 | ✅ 立即 |
| 🔴 高 | 权限检查统一 | 维护性 | 低 | ✅ 立即 |
| 🔴 高 | 批量操作优化 | 性能 | 低 | ✅ 立即 |
| 🟡 中 | 查询优化 | 性能 | 中 | 近期 |
| 🟡 中 | 错误处理统一 | 维护性 | 中 | 近期 |
| 🟡 中 | 日志优化 | 可观测性 | 低 | 近期 |
| 🟢 低 | DTO 验证增强 | 质量 | 低 | 后续 |
| 🟢 低 | 缓存策略 | 性能 | 高 | 后续 |
| 🟢 低 | 分页优化 | 性能 | 中 | 后续 |

---

## 🚀 实施建议

### 第一阶段（立即实施）
1. ✅ 货币信息存储优化
2. ✅ 批量操作优化
3. ✅ 权限检查统一

### 第二阶段（近期实施）
4. 代码重复消除
5. 查询优化
6. 错误处理统一

### 第三阶段（后续实施）
7. 日志优化
8. DTO 验证增强
9. 缓存策略
10. 分页优化

---

## 📝 注意事项

1. **向后兼容性**：所有优化需要保持 API 向后兼容
2. **测试覆盖**：优化后需要确保测试覆盖
3. **性能监控**：优化后需要监控性能指标
4. **渐进式实施**：建议分阶段实施，避免大规模改动

---

## 🔗 相关文档

- [后端迁移实施指南](./backend-migration-guide.md)
- [API 接口文档](../api/README.md)
- [数据库设计文档](../database-tables-analysis.md)

