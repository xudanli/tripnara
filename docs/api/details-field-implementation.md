# Details 字段实现文档

## 概述

已成功实现活动（Activity）的 `details` 字段支持，可以存储活动详细信息（如多语言名称、地址、开放时间、价格详情等）。

---

## ✅ 实现内容

### 1. 数据库层

- **Entity 更新**：`ItineraryActivityEntity` 添加 `details` JSONB 字段
- **Migration**：创建迁移文件 `AddDetailsToActivities1764086741068.ts`
  - 添加 `details` JSONB 列到 `itinerary_activities` 表

### 2. Repository 层

- **`createDays`**：支持保存 activities 的 `details` 字段
- **`createActivity`**：支持保存 `details` 字段
- **`updateActivity`**：支持更新 `details` 字段
- **`createItinerary`**：支持保存 `details` 字段
- **`updateItineraryWithDays`**：支持更新 `details` 字段

### 3. Service 层

- **`convertFrontendDataToCreateRequest`**：将前端 `timeSlot.details` 转换为 `activity.details`
- **`convertActivitiesToTimeSlots`**：将 `activity.details` 转换为 `timeSlot.details`
- 所有返回 activities 的方法都已更新，包含 `details` 字段

### 4. DTO 层

- **`ItineraryActivityDto`**：添加 `details?: Record<string, unknown>` 字段
- **`ItineraryTimeSlotDto`**：已包含 `details` 字段（前端格式）

---

## 📋 字段结构

### Details 字段内容

前端数据结构中的 `timeSlot.details` 包含：

```typescript
{
  name?: {
    chinese?: string;
    english?: string;
    local?: string;
  };
  address?: {
    chinese?: string;
    english?: string;
    local?: string;
  };
  transportation?: string;
  openingHours?: string;
  pricing?: {
    detail?: string;
  };
  rating?: number;
  recommendations?: {
    visitTips?: string;
    bestTimeToVisit?: string;
    nearbyAttractions?: string;
    visitDuration?: number;
    outfitSuggestions?: string;
    culturalTips?: string;
    bookingInfo?: string;
  };
  contact?: {
    info?: string;
  };
  accessibility?: string;
  category?: string;
}
```

---

## 🔄 数据流转

### 前端 → 后端

1. 前端发送 `timeSlots` 数组，每个 `timeSlot` 包含 `details` 对象
2. `convertFrontendDataToCreateRequest` 将 `timeSlot.details` 映射到 `activity.details`
3. Repository 将 `details` 存储到数据库 JSONB 字段

### 后端 → 前端

1. 数据库查询返回包含 `details` 的 activities
2. Service 层返回的 activities 包含 `details` 字段
3. `convertActivitiesToTimeSlots` 将 `activity.details` 映射到 `timeSlot.details`
4. 前端接收完整的 `timeSlots` 数据，包括 `details`

---

## 📝 使用示例

### 创建行程时包含 details

```typescript
POST /api/v1/journeys/from-frontend-data
{
  "itineraryData": {
    "days": [
      {
        "day": 1,
        "date": "2025-11-24",
        "timeSlots": [
          {
            "time": "09:00",
            "title": "探秘雷克雅未克大教堂",
            "type": "attraction",
            "coordinates": { "lat": 64.1419, "lng": -21.9274 },
            "notes": "...",
            "cost": 1200,
            "duration": 90,
            "details": {
              "name": {
                "chinese": "探秘雷克雅未克大教堂的螺旋天际",
                "english": "Hallgrímskirkja Spiral Skyline Tour"
              },
              "address": {
                "chinese": "冰岛雷克雅未克市中心",
                "english": "Hallgrímskirkja, Hallgrímstorg 1, 101 Reykjavík"
              },
              "openingHours": "每日9:00-17:00",
              "pricing": {
                "detail": "成人1000冰岛克朗"
              },
              "rating": 4.7
            }
          }
        ]
      }
    ]
  }
}
```

### 获取行程时返回 details

```typescript
GET /api/v1/journeys/:journeyId

Response:
{
  "data": {
    "days": [
      {
        "day": 1,
        "date": "2025-11-24",
        "activities": [
          {
            "time": "09:00",
            "title": "探秘雷克雅未克大教堂",
            "type": "attraction",
            "location": { "lat": 64.1419, "lng": -21.9274 },
            "notes": "...",
            "cost": 1200,
            "duration": 90,
            "details": {
              "name": { ... },
              "address": { ... },
              ...
            }
          }
        ]
      }
    ]
  }
}
```

---

## ✅ 存储情况更新

### 现在会被存储的字段

| 前端字段路径 | 后端存储位置 | 状态 |
|-------------|------------|------|
| `timeSlot.details` | `ItineraryActivityEntity.details` | ✅ **现在会存储** |
| `itineraryData.recommendations` | 仍不支持 | ⚠️ |

---

## 🔧 数据库迁移

### 运行迁移

```bash
npm run migration:run
```

### 回滚迁移（如果需要）

```bash
npm run migration:revert
```

---

## 📚 相关文件

- **Entity**: `src/modules/persistence/entities/itinerary.entity.ts`
- **Repository**: `src/modules/persistence/repositories/itinerary/itinerary.repository.ts`
- **Service**: `src/modules/itinerary/itinerary.service.ts`
- **DTO**: `src/modules/itinerary/dto/itinerary.dto.ts`
- **Migration**: `src/migrations/1764086741068-AddDetailsToActivities.ts`

---

## ✅ 完成状态

- ✅ Entity 扩展
- ✅ Repository 方法更新
- ✅ Service 转换逻辑更新
- ✅ DTO 定义更新
- ✅ 数据库迁移文件创建
- ✅ 所有返回 activities 的位置已更新

**所有功能已完成，可以开始测试！**

