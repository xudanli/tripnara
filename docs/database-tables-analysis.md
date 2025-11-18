# 新接口数据库表分析

## 当前状态

### ❌ 这些接口**没有创建对应的数据库表**

新创建的三个接口都是**无状态的纯计算服务**：

1. **POST /api/itinerary/generate** (ItineraryService)
   - 只使用：`LlmService` + `PreferencesService`
   - 生成后直接返回，不存储

2. **POST /api/location/generate** (LocationService)
   - 只使用：`LlmService` + 内存缓存（Map）
   - 缓存仅在内存中，服务重启后丢失

3. **POST /api/travel/summary** (TravelSummaryService)
   - 只使用：`LlmService`
   - 生成后直接返回，不存储

## 现有数据库表

虽然新接口没有创建表，但系统中已有相关表可以存储数据：

### 行程相关表

| 表名 | 用途 | 是否可用于新接口 |
|------|------|----------------|
| `journeys` | 行程主表 | ✅ 可以存储生成的行程 |
| `journey_days` | 行程天数 | ✅ 可以存储行程的每一天 |
| `journey_time_slots` | 活动时段 | ✅ 可以存储活动详情 |

### AI 日志表

| 表名 | 用途 | 是否可用于新接口 |
|------|------|----------------|
| `ai_request_logs` | AI 调用日志 | ✅ 可以记录 AI 生成请求 |
| `ai_generation_jobs` | 生成任务状态 | ✅ 可以记录生成任务 |

## 如果需要持久化存储

### 方案 1: 使用现有 journeys 表（推荐）

修改 `ItineraryService` 保存生成的行程：

```typescript
// 在 ItineraryService 中注入 JourneyRepository
constructor(
  private readonly llmService: LlmService,
  private readonly preferencesService: PreferencesService,
  private readonly journeyRepository: JourneyRepository, // 新增
) {}

async generateItinerary(dto, userId) {
  // 生成行程...
  const itineraryData = await this.generateWithAI(...);
  
  // 保存到数据库
  if (userId) {
    const journey = await this.journeyRepository.createJourney({
      userId,
      destination: dto.destination,
      startDate: dto.startDate,
      durationDays: dto.days,
      summary: itineraryData.summary,
      status: 'draft',
      days: itineraryData.days.map(day => ({
        dayNumber: day.day,
        date: day.date,
        timeSlots: day.activities.map(act => ({
          startTime: act.time,
          title: act.title,
          type: act.type,
          notes: act.notes,
          cost: act.cost,
          locationJson: act.location,
        })),
      })),
    });
    
    return { ...itineraryData, journeyId: journey.id };
  }
  
  return itineraryData;
}
```

### 方案 2: 创建位置信息缓存表

如果需要持久化位置信息缓存：

```sql
CREATE TABLE location_info_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key varchar(255) UNIQUE NOT NULL,
  activity_name varchar(255) NOT NULL,
  destination varchar(255) NOT NULL,
  activity_type varchar(50) NOT NULL,
  location_info jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_location_cache_key ON location_info_cache(cache_key);
CREATE INDEX idx_location_cache_expires ON location_info_cache(expires_at);
```

### 方案 3: 创建摘要历史表

如果需要保存生成的摘要：

```sql
CREATE TABLE travel_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  destination varchar(255) NOT NULL,
  itinerary_data jsonb NOT NULL,
  summary text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_summary_user ON travel_summaries(user_id);
CREATE INDEX idx_summary_destination ON travel_summaries(destination);
```

## 当前架构优势

✅ **无状态设计**：
- 服务可水平扩展
- 无需数据库连接即可工作
- 响应速度快

✅ **内存缓存**：
- LocationService 使用内存缓存，性能好
- 适合高频访问的数据

## 建议

### 短期（当前实现）
- ✅ 保持无状态设计
- ✅ 使用内存缓存（LocationService）
- ✅ 生成后直接返回给前端

### 长期（如果需要）
1. **行程持久化**：使用现有 `journeys` 表
2. **位置信息缓存**：迁移到 Redis 或数据库
3. **摘要历史**：创建 `travel_summaries` 表（如果需要历史记录）

## 检查命令

```bash
# 查看所有表
npm run db:test

# 查看特定表结构
psql $DATABASE_URL -c "\d journeys"
psql $DATABASE_URL -c "\d journey_days"
psql $DATABASE_URL -c "\d journey_time_slots"
```

## 总结

| 接口 | 当前存储 | 建议存储方案 |
|------|---------|------------|
| `/api/itinerary/generate` | ❌ 无 | ✅ 使用 `journeys` 表 |
| `/api/location/generate` | ⚠️ 内存缓存 | ✅ Redis 或数据库缓存表 |
| `/api/travel/summary` | ❌ 无 | ⚠️ 可选：创建摘要历史表 |

**结论**：当前实现**不需要**创建新的数据库表，但如果需要持久化，可以使用现有表或创建专门的缓存/历史表。

