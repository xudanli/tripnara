# 后端迁移实施指南 - 前端对接说明

## 📋 概述

本文档说明后端已完成的数据格式验证、总费用计算、数据转换统一和货币推断功能，以及前端需要做的相应调整。

---

## ✅ 后端已完成的功能

### 1. 数据格式验证和修复 ✅

**功能说明：**
- 后端自动验证和修复所有数据字段格式
- 确保所有数值字段都是数字类型
- 确保所有字符串字段都是字符串类型
- 自动修复时间格式（如 "9:0" → "09:00"）
- 自动修复日期格式（确保 YYYY-MM-DD）
- 验证活动类型，无效值使用默认值

**前端影响：**
- ✅ **可以移除前端的数据验证和修复代码**
- ✅ **可以直接使用后端返回的数据，无需转换**

---

### 2. 总费用计算 ✅

**功能说明：**
- 后端自动计算行程总费用
- 每次创建/更新/删除活动时自动重新计算
- 提供专门的接口用于手动重新计算

**新增接口：**
- `POST /api/v1/journeys/:journeyId/recalculate-cost` - 重新计算总费用

**前端影响：**
- ✅ **可以移除前端的费用计算逻辑**
- ✅ **直接使用后端返回的 `totalCost` 字段**
- ✅ **无需在前端手动计算费用**

---

### 3. 数据转换逻辑统一 ✅

**功能说明：**
- 后端直接返回前端期望的格式
- 统一使用 `timeSlots` 而不是 `activities`
- 统一使用 `coordinates` 而不是 `location`
- 自动处理字段映射（`activity` 与 `title` 相同）

**数据格式变更：**

**之前（后端返回）：**
```json
{
  "days": [
    {
      "day": 1,
      "date": "2024-06-01",
      "activities": [
        {
          "time": "09:00",
          "title": "活动标题",
          "type": "attraction",
          "location": { "lat": 46.7704, "lng": 8.4050 },
          "cost": 400,
          "duration": 120
        }
      ]
    }
  ]
}
```

**现在（后端返回）：**
```json
{
  "days": [
    {
      "day": 1,
      "date": "2024-06-01",
      "timeSlots": [
        {
          "time": "09:00",
          "title": "活动标题",
          "activity": "活动标题",
          "type": "attraction",
          "coordinates": { "lat": 46.7704, "lng": 8.4050 },
          "notes": "",
          "details": {
            "notes": "",
            "description": ""
          },
          "cost": 400,
          "duration": 120
        }
      ]
    }
  ]
}
```

**前端影响：**
- ✅ **可以移除前端的数据转换代码**
- ✅ **直接使用后端返回的 `timeSlots` 和 `coordinates`**
- ✅ **无需将 `activities` 转换为 `timeSlots`**
- ✅ **无需将 `location` 转换为 `coordinates`**

---

### 4. 货币推断和格式化 ✅

**功能说明：**
- 后端自动根据目的地推断货币
- 支持根据国家代码、国家名称、坐标推断
- 返回标准化的货币信息（code, symbol, name）

**新增接口：**
- `GET /api/v1/currency/infer` - 推断货币信息
- `GET /api/v1/currency/:countryCode` - 根据国家代码获取货币信息

**新增字段：**
所有行程相关的响应现在包含：
```json
{
  "currency": "CHF",
  "currencyInfo": {
    "code": "CHF",
    "symbol": "CHF",
    "name": "瑞士法郎"
  }
}
```

**前端影响：**
- ✅ **可以移除前端的货币推断逻辑**
- ✅ **直接使用后端返回的 `currency` 和 `currencyInfo` 字段**
- ✅ **无需维护国家-货币映射表**

---

## 🔄 前端需要做的调整

### 1. 移除数据验证和修复代码

**可以删除的代码：**
- 数据格式验证函数
- 字符串转数字的转换逻辑
- 时间格式修复代码
- 日期格式修复代码
- 活动类型验证代码

**示例：**
```typescript
// ❌ 可以删除
function fixNumber(value: any): number {
  if (typeof value === 'string') {
    return parseFloat(value) || 0;
  }
  return value || 0;
}

// ✅ 直接使用后端返回的数据
const cost = activity.cost; // 已经是数字类型
```

---

### 2. 移除费用计算逻辑

**可以删除的代码：**
- 从活动列表计算总费用的函数
- 费用更新时的重新计算逻辑

**示例：**
```typescript
// ❌ 可以删除
function calculateTotalCost(days: Day[]): number {
  return days.reduce((sum, day) => {
    return sum + day.activities.reduce((daySum, activity) => {
      return daySum + (activity.cost || 0);
    }, 0);
  }, 0);
}

// ✅ 直接使用后端返回的 totalCost
const totalCost = itinerary.totalCost; // 后端已计算好
```

---

### 3. 移除数据转换代码

**可以删除的代码：**
- `activities` → `timeSlots` 的转换
- `location` → `coordinates` 的转换
- 字段映射逻辑

**示例：**
```typescript
// ❌ 可以删除
const timeSlots = day.activities.map(activity => ({
  time: activity.time,
  title: activity.title,
  activity: activity.title,
  coordinates: activity.location,
  // ...
}));

// ✅ 直接使用后端返回的 timeSlots
const timeSlots = day.timeSlots; // 后端已转换好
```

---

### 4. 移除货币推断逻辑

**可以删除的代码：**
- 国家-货币映射表
- 货币推断函数
- 从目的地字符串推断货币的逻辑

**示例：**
```typescript
// ❌ 可以删除
const countryCurrencyMap = {
  'CH': { code: 'CHF', symbol: 'CHF' },
  // ...
};

function getCurrencyForDestination(destination: string) {
  // 推断逻辑...
}

// ✅ 直接使用后端返回的货币信息
const currency = itinerary.currency; // 后端已推断好
const currencyInfo = itinerary.currencyInfo;
```

---

## 📝 数据格式变更详情

### 行程详情响应格式

**所有返回行程详情的接口现在都使用统一格式：**

```typescript
interface ItineraryDetailResponse {
  success: boolean;
  data: {
    id: string;
    destination: string;
    startDate: string;
    daysCount: number;
    summary: string;
    totalCost: number; // ✅ 始终是数字类型
    currency?: string; // ✅ 新增：货币代码
    currencyInfo?: { // ✅ 新增：货币详细信息
      code: string;
      symbol: string;
      name: string;
    };
    days: Array<{
      day: number; // ✅ 始终是数字类型
      date: string; // ✅ 始终是 YYYY-MM-DD 格式
      timeSlots: Array<{ // ✅ 使用 timeSlots 而不是 activities
        time: string; // ✅ 始终是 HH:mm 格式
        title: string; // ✅ 始终是字符串，不为 null
        activity: string; // ✅ 与 title 相同
        type: string; // ✅ 始终是有效类型
        coordinates: { // ✅ 使用 coordinates 而不是 location
          lat: number;
          lng: number;
        } | null;
        notes: string; // ✅ 始终是字符串，不为 null
        details: {
          notes: string;
          description: string;
        };
        cost: number; // ✅ 始终是数字类型
        duration: number; // ✅ 始终是数字类型（分钟）
      }>;
    }>;
  };
}
```

---

## 🚀 迁移步骤

### 步骤 1: 更新类型定义

更新前端的 TypeScript 类型定义，使用后端返回的新格式：

```typescript
// 更新行程类型
interface ItineraryDay {
  day: number;
  date: string;
  timeSlots: TimeSlot[]; // 使用 timeSlots
}

interface TimeSlot {
  time: string;
  title: string;
  activity: string;
  type: string;
  coordinates: { lat: number; lng: number } | null;
  notes: string;
  details: {
    notes: string;
    description: string;
  };
  cost: number;
  duration: number;
}
```

---

### 步骤 2: 移除转换代码

删除所有数据转换相关的代码：

```typescript
// ❌ 删除这些函数
- convertActivitiesToTimeSlots()
- convertLocationToCoordinates()
- fixNumber()
- fixTime()
- fixDate()
- calculateTotalCost()
- getCurrencyForDestination()
```

---

### 步骤 3: 更新组件代码

更新使用行程数据的组件：

```typescript
// ❌ 之前
const timeSlots = day.activities.map(convertActivity);
const totalCost = calculateTotalCost(days);
const currency = getCurrencyForDestination(destination);

// ✅ 现在
const timeSlots = day.timeSlots; // 直接使用
const totalCost = itinerary.totalCost; // 直接使用
const currency = itinerary.currency; // 直接使用
```

---

### 步骤 4: 测试验证

1. **数据格式测试**：验证所有字段类型正确
2. **费用计算测试**：验证总费用自动更新
3. **数据格式测试**：验证 timeSlots 和 coordinates 正确
4. **货币推断测试**：验证货币信息正确返回

---

## 📊 接口变更清单

### 已更新的接口

以下接口现在返回统一的前端格式（包含 timeSlots、货币信息等）：

- ✅ `GET /api/v1/journeys/:journeyId` - 获取行程详情
- ✅ `POST /api/v1/journeys` - 创建行程
- ✅ `POST /api/v1/journeys/generate` - 生成行程
- ✅ `PATCH /api/v1/journeys/:journeyId` - 更新行程
- ✅ `PATCH /api/v1/journeys/:journeyId/from-frontend-data` - 从前端数据更新

### 新增接口

- ✅ `POST /api/v1/journeys/:journeyId/recalculate-cost` - 重新计算总费用
- ✅ `GET /api/v1/currency/infer` - 推断货币信息
- ✅ `GET /api/v1/currency/:countryCode` - 根据国家代码获取货币信息

---

## ⚠️ 注意事项

### 1. 向后兼容性

- 后端仍然支持接收 `activities` 格式的数据（用于创建/更新）
- 但返回时统一使用 `timeSlots` 格式
- 前端可以继续发送 `activities` 格式，但建议逐步迁移到 `timeSlots`

### 2. 性能考虑

- 货币推断是异步操作，可能略微增加响应时间
- 如果性能敏感，可以考虑缓存货币信息

### 3. 数据迁移

- 现有行程数据会自动转换格式
- 无需手动迁移数据库

---

## 📞 技术支持

如有问题，请参考：
- Swagger 文档: `http://localhost:3000/api/docs`
- [API 测试指南](./api-testing-guide.md)
- 后端代码: `src/modules/itinerary/`

---

## ✅ 验证清单

完成前端迁移后，确保：

- [ ] 所有数据字段类型正确（无需转换）
- [ ] 总费用直接使用后端返回的值
- [ ] 使用 `timeSlots` 而不是 `activities`
- [ ] 使用 `coordinates` 而不是 `location`
- [ ] 货币信息直接使用后端返回的值
- [ ] 移除了所有数据转换代码
- [ ] 移除了费用计算代码
- [ ] 移除了货币推断代码

---

## 🎉 迁移完成后的收益

1. **代码简化**：前端代码减少 30-50%
2. **性能提升**：减少前端计算和转换开销
3. **数据一致性**：后端统一处理，避免前后端不一致
4. **维护成本降低**：业务逻辑集中在后端，易于维护和更新

