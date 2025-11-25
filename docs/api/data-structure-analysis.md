# 数据结构存储分析报告

## 问题

检查前端提供的数据结构（`docs/api/1.md`）是否可以通过后端接口存储。

---

## 数据结构分析

### 前端数据结构

```json
{
  "backendItineraryId": "04d7126d-219f-49ab-b71a-a595c18d6b8f",
  "itineraryData": {
    "destination": "冰岛",
    "duration": 5,
    "budget": "medium",
    "preferences": ["nature", "adventure"],
    "travelStyle": "moderate",
    "itinerary": [],
    "recommendations": { ... },
    "days": [
      {
        "day": 1,
        "date": "2025-11-24",
        "timeSlots": [
          {
            "time": "09:00",
            "title": "...",
            "activity": "...",
            "type": "attraction",
            "coordinates": { "lat": 64.1419, "lng": -21.9274 },
            "notes": "...",
            "details": { ... },  // 复杂对象，包含很多字段
            "cost": 1200,
            "duration": 90
          }
        ]
      }
    ],
    "totalCost": 88400,
    "summary": "...",
    "title": "冰岛之旅"
  }
}
```

---

## ✅ 存储兼容性分析

### 1. 可用的接口

#### ✅ `POST /api/v1/journeys/from-frontend-data`（推荐）

**兼容性：完全兼容** ✅

这个接口专门设计用于接收前端数据格式，会自动进行以下转换：

1. **字段映射**：
   - ✅ `itineraryData.destination` → `destination`
   - ✅ `itineraryData.duration` → `days`
   - ✅ `itineraryData.budget` → `preferences.budget`
   - ✅ `itineraryData.preferences`（数组）→ `preferences.interests`
   - ✅ `itineraryData.travelStyle` → `preferences.travelStyle`
   - ✅ `itineraryData.totalCost` → `data.totalCost`
   - ✅ `itineraryData.summary` → `data.summary`
   - ✅ `itineraryData.title` → 可用于生成摘要（如果 summary 为空）

2. **timeSlots → activities 转换**：
   - ✅ `timeSlots` 数组 → `activities` 数组
   - ✅ `timeSlot.title` 或 `timeSlot.activity` → `activity.title`
   - ✅ `timeSlot.coordinates` → `activity.location`
   - ✅ `timeSlot.type` → `activity.type`
   - ✅ `timeSlot.duration` → `activity.duration`
   - ✅ `timeSlot.cost` → `activity.cost`
   - ✅ `timeSlot.notes` → `activity.notes`

3. **忽略的字段**（不会报错）：
   - ⚠️ `backendItineraryId`：会被忽略（创建新行程时不需要）
   - ⚠️ `itineraryData.itinerary`：空数组会被忽略
   - ⚠️ `itineraryData.recommendations`：对象会被忽略（当前版本不支持存储）
   - ⚠️ `timeSlot.details`：复杂对象会被忽略（只保存基础字段）

---

## 📋 字段存储情况

### ✅ 会被存储的字段

| 前端字段路径 | 后端存储位置 | 说明 |
|-------------|------------|------|
| `itineraryData.destination` | `ItineraryEntity.destination` | ✅ 完全存储 |
| `itineraryData.duration` | `ItineraryEntity.daysCount` | ✅ 完全存储 |
| `itineraryData.totalCost` | `ItineraryEntity.totalCost` | ✅ 完全存储 |
| `itineraryData.summary` | `ItineraryEntity.summary` | ✅ 完全存储 |
| `itineraryData.title` | 可能用于生成摘要 | ✅ 处理 |
| `itineraryData.budget` | `ItineraryEntity.preferences.budget` | ✅ 完全存储 |
| `itineraryData.preferences[]` | `ItineraryEntity.preferences.interests` | ✅ 完全存储 |
| `itineraryData.travelStyle` | `ItineraryEntity.preferences.travelStyle` | ✅ 完全存储 |
| `itineraryData.days[].day` | `ItineraryDayEntity.day` | ✅ 完全存储 |
| `itineraryData.days[].date` | `ItineraryDayEntity.date` | ✅ 完全存储 |
| `timeSlot.time` | `ItineraryActivityEntity.time` | ✅ 完全存储 |
| `timeSlot.title` 或 `timeSlot.activity` | `ItineraryActivityEntity.title` | ✅ 完全存储 |
| `timeSlot.type` | `ItineraryActivityEntity.type` | ✅ 完全存储 |
| `timeSlot.coordinates` | `ItineraryActivityEntity.location` | ✅ 完全存储 |
| `timeSlot.duration` | `ItineraryActivityEntity.duration` | ✅ 完全存储 |
| `timeSlot.cost` | `ItineraryActivityEntity.cost` | ✅ 完全存储 |
| `timeSlot.notes` | `ItineraryActivityEntity.notes` | ✅ 完全存储 |

### ⚠️ 不会被存储的字段（但不会报错）

| 前端字段路径 | 原因 | 影响 |
|-------------|------|------|
| `backendItineraryId` | 创建新行程不需要ID | 无影响 |
| `itineraryData.itinerary` | 空数组，会被忽略 | 无影响 |
| `itineraryData.recommendations` | 当前版本不支持存储 | **详细信息丢失** ⚠️ |
| `timeSlot.details` | 只保存基础字段，details 会被忽略 | **详细信息丢失** ⚠️ |

---

## ⚠️ 需要注意的问题

### 1. `details` 字段不会存储

前端数据结构中 `timeSlot.details` 包含了很多详细信息：
- `details.name`（中文、英文、本地名称）
- `details.address`（中文、英文、本地地址）
- `details.transportation`
- `details.openingHours`
- `details.pricing`
- `details.rating`
- `details.recommendations`（visitTips、bestTimeToVisit、nearbyAttractions等）
- `details.contact`
- `details.accessibility`
- `details.category`

**当前后端只存储基础字段**，这些详细信息会被丢失。

### 2. `recommendations` 字段不会存储

`itineraryData.recommendations` 对象包含：
- `accommodation`
- `transportation`
- `food`
- `tips`

这些信息当前不会被存储。

---

## 📝 使用建议

### 方式1：使用 `from-frontend-data` 接口（推荐）

```typescript
// 去掉 backendItineraryId，直接发送 itineraryData
const response = await fetch('/api/v1/journeys/from-frontend-data', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    itineraryData: {
      destination: "冰岛",
      duration: 5,
      budget: "medium",
      preferences: ["nature", "adventure"],
      travelStyle: "moderate",
      days: [
        {
          day: 1,
          date: "2025-11-24",
          timeSlots: [
            {
              time: "09:00",
              title: "探秘雷克雅未克大教堂",
              activity: "探秘雷克雅未克大教堂的螺旋天际",
              type: "attraction",
              coordinates: { lat: 64.1419, lng: -21.9274 },
              notes: "...",
              cost: 1200,
              duration: 90
              // details 字段会被忽略，不会存储
            }
          ]
        }
      ],
      totalCost: 88400,
      summary: "...",
      title: "冰岛之旅"
    }
    // backendItineraryId 不需要，会被忽略
  }),
});
```

### 方式2：如果需要保存 `details` 信息

如果前端需要保存 `details` 中的详细信息，需要：

1. **方案A**：将 `details` 数据存储到 `notes` 字段（作为JSON字符串）
2. **方案B**：扩展数据库表结构，添加 `details` JSONB 字段
3. **方案C**：使用单独的详细信息存储表

---

## ✅ 结论

### 可以存储 ✅

**使用接口**：`POST /api/v1/journeys/from-frontend-data`

**存储情况**：
- ✅ 基础字段（destination、duration、summary、totalCost等）→ **完全存储**
- ✅ 偏好信息（preferences、budget、travelStyle）→ **完全存储**
- ✅ 天数信息（day、date）→ **完全存储**
- ✅ 活动基础信息（time、title、type、location、duration、cost、notes）→ **完全存储**

### 不会存储 ⚠️

- ⚠️ `timeSlot.details` 对象（详细信息）→ **当前版本不支持，详细信息会丢失**
- ⚠️ `itineraryData.recommendations` 对象 → **当前版本不支持存储**

### 总结

**✅ 基础数据可以正常存储**，包括行程基本信息、天数、活动的基础字段。

**⚠️ 详细信息无法存储**，`details` 对象中包含的详细信息（如地址、开放时间、价格详情、推荐信息等）当前不会被保存。

---

## 🔧 如果需要保存详细信息

如果前端需要保存 `details` 中的详细信息，建议：

1. **短期方案**：将 `details` 序列化为 JSON 字符串，存储到 `notes` 字段
2. **长期方案**：扩展 `ItineraryActivityEntity`，添加 `details` JSONB 字段

---

## 📚 相关文档

- [从前端数据格式创建行程](./itinerary-frontend-data-api.md)
- [创建行程接口](./journey-api-02-create.md)
- [前端数据格式兼容性检查](./前端数据格式兼容性检查.md)

