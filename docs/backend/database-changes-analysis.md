# 数据库变更分析 - AI生成接口修改

## 概述

本次修改涉及两个接口的提示词优化：
1. **AI生成旅程接口** (`POST /api/v1/journeys/generate`)
2. **位置信息生成接口** (`POST /api/location/generate`)

## 数据库表字段分析

### 1. AI生成旅程接口修改

#### 新增字段分析

**`practicalInfo` 字段**：
- **状态**：❌ **未存储到数据库**
- **原因**：`ItineraryEntity` 中没有 `practicalInfo` 字段
- **当前行为**：只在生成时返回，不会持久化
- **影响**：如果用户保存行程后，`practicalInfo` 会丢失

**`details` 字段中的新内容**（highlights, insiderTip, bookingSignal）：
- **状态**：✅ **已支持存储**
- **原因**：`ItineraryActivityEntity.details` 是 JSONB 类型，可以存储任意 JSON 数据
- **当前行为**：会正常存储到数据库
- **存储位置**：`itinerary_activities.details` JSONB 字段

#### 数据库表结构

**`itineraries` 表**：
- 当前没有 `practicalInfo` 字段
- 如果需要持久化 `practicalInfo`，需要添加 JSONB 字段

**`itinerary_activities` 表**：
- ✅ `details` JSONB 字段已存在
- ✅ 可以存储 `highlights`、`insiderTip`、`bookingSignal` 等数据
- ✅ 无需数据库迁移

### 2. 位置信息生成接口修改

#### 数据库影响

- **状态**：✅ **无数据库影响**
- **原因**：只是更新了提示词，返回的数据结构没有变化
- **当前行为**：返回的 `LocationInfoDto` 结构保持不变
- **存储**：位置信息不直接存储到数据库，只在生成时返回

## 需要修复的问题

### 问题1：`practicalInfo` 未在返回结果中包含

**位置**：`itinerary.service.ts` 的 `validateAndTransformResponse` 方法

**当前代码**：
```typescript
return {
  days: validatedDays,
  totalCost: calculatedTotalCost > 0 ? calculatedTotalCost : totalCost,
  summary,
  // ❌ 缺少 practicalInfo
};
```

**需要修复**：返回时包含 `practicalInfo`

### 问题2：`practicalInfo` 未存储到数据库

**选项A：不存储（当前方案）**
- 优点：简单，不需要数据库迁移
- 缺点：保存行程后 `practicalInfo` 会丢失

**选项B：存储到数据库（推荐）**
- 需要添加 `practicalInfo` JSONB 字段到 `itineraries` 表
- 需要数据库迁移
- 优点：可以持久化保存

## 相关接口检查

### 需要检查的接口

1. **`POST /api/v1/journeys/generate`** ✅ 已更新提示词
2. **`POST /api/v1/journeys`** (创建行程) - 需要检查是否支持 `practicalInfo`
3. **`PATCH /api/v1/journeys/:journeyId`** (更新行程) - 需要检查是否支持 `practicalInfo`
4. **`POST /api/v1/journeys/from-frontend-data`** - 需要检查是否支持 `practicalInfo`
5. **`PATCH /api/v1/journeys/:journeyId/from-frontend-data`** - 需要检查是否支持 `practicalInfo`
6. **`GET /api/v1/journeys/:journeyId`** (获取行程详情) - 需要检查是否返回 `practicalInfo`
7. **`POST /api/location/generate`** ✅ 已更新提示词（无数据结构变化）

## 建议的修复方案

### 方案1：仅修复返回逻辑（最小改动）

**修改内容**：
1. 修复 `validateAndTransformResponse` 返回 `practicalInfo`
2. 在 `ItineraryDetailWithTimeSlotsDto` 中添加 `practicalInfo` 字段（如果还没有）

**优点**：不需要数据库迁移
**缺点**：`practicalInfo` 不会持久化

### 方案2：完整支持（推荐）

**修改内容**：
1. 添加数据库字段：在 `itineraries` 表添加 `practical_info` JSONB 字段
2. 创建数据库迁移文件
3. 更新 `ItineraryEntity` 添加 `practicalInfo` 字段
4. 更新 `ItineraryRepository` 支持存储和读取 `practicalInfo`
5. 修复 `validateAndTransformResponse` 返回 `practicalInfo`
6. 更新所有相关接口支持 `practicalInfo`

**优点**：完整支持，数据可持久化
**缺点**：需要数据库迁移

## 当前状态总结

| 字段/功能 | 数据库存储 | 返回给前端 | 需要修复 |
|----------|-----------|-----------|---------|
| `practicalInfo` | ❌ 未存储 | ❌ 未返回 | ✅ 是 |
| `details.highlights` | ✅ 已支持 | ✅ 已支持 | ❌ 否 |
| `details.insiderTip` | ✅ 已支持 | ✅ 已支持 | ❌ 否 |
| `details.bookingSignal` | ✅ 已支持 | ✅ 已支持 | ❌ 否 |
| 位置信息生成 | N/A | ✅ 正常 | ❌ 否 |

## 下一步行动

1. **立即修复**：修复 `validateAndTransformResponse` 返回 `practicalInfo`
2. **评估需求**：决定是否需要持久化 `practicalInfo`
3. **如需持久化**：创建数据库迁移，添加 `practical_info` 字段

