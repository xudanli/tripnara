# timeSlots 多语言字段更新说明

## 概述

所有返回 `timeSlots`（时间段）数据的接口现在都包含多语言名称字段，方便前端根据用户语言偏好显示活动信息。

## 新增字段

所有 `timeSlots` 数组中的对象现在都包含以下可选字段：

| 字段名 | 类型 | 说明 | 数据来源 |
|--------|------|------|---------|
| `chineseName` | string | 中文名称 | 从 `details.name.chinese` 或 `locationDetails.chineseName` 提取，如果都没有则从 `title` 自动推导（如果是中文） |
| `englishName` | string | 英文名称 | 从 `details.name.english` 或 `locationDetails.englishName` 提取，如果都没有则从 `title` 或 `aliases[0]` 自动推导（如果是英文） |
| `destinationLanguageName` | string | 目的地语言名称（当地语言） | 从 `details.name.local` 或 `locationDetails.localName` 提取 |
| `locationName` | string | 位置名称（完整地址或位置描述） | 从 `details.address.chinese`、`details.address.local` 或 `locationDetails.locationName` 提取，如果都没有则自动构建 |

## 数据提取逻辑

系统会按以下优先级自动提取多语言字段：

1. **chineseName**:
   - `details.name.chinese` → `locationDetails.chineseName` → 从 `title` 推导（如果包含中文字符）

2. **englishName**:
   - `details.name.english` → `locationDetails.englishName` → 从 `title` 或 `aliases[0]` 推导（如果是英文）

3. **destinationLanguageName**:
   - `details.name.local` → `locationDetails.localName` → `locationDetails.destinationLanguageName`

4. **locationName**:
   - `details.address.chinese` → `details.address.local` → `locationDetails.locationName` → `locationName` → `locationAddress` → 自动构建（地区+城市+国家）

## 受影响的接口列表

以下接口的响应数据现在都包含多语言字段：

### 1. 获取时间段列表
- **接口**: `GET /api/v1/journeys/{journeyId}/days/{dayId}/slots`
- **文档**: [journey-api-12-get-slots.md](./journey-api-12-get-slots.md)
- **返回**: `ItineraryTimeSlotDto[]` 数组，每个对象包含多语言字段

### 2. 创建时间段
- **接口**: `POST /api/v1/journeys/{journeyId}/days/{dayId}/slots`
- **文档**: [journey-api-13-create-slot.md](./journey-api-13-create-slot.md)
- **返回**: `ItineraryTimeSlotDto` 对象，包含多语言字段

### 3. 更新时间段
- **接口**: `PATCH /api/v1/journeys/{journeyId}/days/{dayId}/slots/{slotId}`
- **文档**: [journey-api-14-update-slot.md](./journey-api-14-update-slot.md)
- **返回**: `ItineraryTimeSlotDto` 对象，包含多语言字段

### 4. 从前端数据更新行程
- **接口**: `PATCH /api/v1/journeys/{journeyId}/from-frontend-data`
- **文档**: [journey-api-06-update-from-frontend-data.md](./journey-api-06-update-from-frontend-data.md)
- **请求**: `timeSlots` 数组可以包含多语言字段
- **返回**: `days[].activities[]` 数组，每个对象包含多语言字段

### 5. 批量获取活动详情
- **接口**: `POST /api/v1/journeys/{journeyId}/activities/batch`
- **文档**: [journey-api-37-batch-get-activities.md](./journey-api-37-batch-get-activities.md)
- **返回**: `activities[dayId][]` 数组，每个对象包含多语言字段

### 6. 获取行程详情
- **接口**: `GET /api/v1/journeys/{journeyId}`
- **文档**: [journey-api.md](./journey-api.md)
- **返回**: `days[].timeSlots[]` 数组，每个对象包含多语言字段

### 7. 从前端数据创建行程
- **接口**: `POST /api/itinerary/from-frontend-data`
- **文档**: [itinerary-frontend-data-api.md](./itinerary-frontend-data-api.md)
- **请求**: `timeSlots` 数组可以包含多语言字段
- **返回**: `days[].activities[]` 数组，每个对象包含多语言字段

## 使用示例

### 前端接收数据

```typescript
interface TimeSlot {
  id?: string;
  time: string;
  title: string;
  type: string;
  coordinates?: { lat: number; lng: number };
  // ... 其他字段
  chineseName?: string;
  englishName?: string;
  destinationLanguageName?: string;
  locationName?: string;
}

// 根据用户语言偏好显示名称
function getDisplayName(slot: TimeSlot, userLang: 'zh' | 'en' | 'local'): string {
  switch (userLang) {
    case 'zh':
      return slot.chineseName || slot.title;
    case 'en':
      return slot.englishName || slot.title;
    case 'local':
      return slot.destinationLanguageName || slot.englishName || slot.title;
    default:
      return slot.title;
  }
}
```

### 前端发送数据

```typescript
const timeSlot = {
  time: '09:00',
  title: '蓝湖温泉',
  type: 'attraction',
  coordinates: { lat: 64.1419, lng: -21.9274 },
  // 可以直接提供多语言字段
  chineseName: '蓝湖温泉',
  englishName: 'Blue Lagoon',
  destinationLanguageName: 'Bláa lónið',
  locationName: 'Nordurljosavegur 9, 240 Grindavík, Iceland',
  // 或者通过 details 提供
  details: {
    name: {
      chinese: '蓝湖温泉',
      english: 'Blue Lagoon',
      local: 'Bláa lónið'
    },
    address: {
      chinese: '冰岛雷克雅未克',
      local: 'Nordurljosavegur 9, 240 Grindavík, Iceland'
    }
  }
};
```

## 向后兼容性

- ✅ 所有新字段都是**可选的**（`@IsOptional()`）
- ✅ 如果数据源中没有这些字段，系统会尝试从现有字段自动推导
- ✅ 不影响现有功能，现有代码无需修改即可继续工作
- ✅ 前端可以选择性地使用这些字段，也可以继续使用 `title` 字段

## 实现细节

### 代码变更

1. **DTO 定义** (`src/modules/itinerary/dto/itinerary.dto.ts`)
   - `ItineraryTimeSlotDto` 添加了 4 个多语言字段

2. **服务层转换** (`src/modules/itinerary/itinerary.service.ts`)
   - `convertActivitiesToTimeSlots()` 方法添加了多语言字段提取逻辑
   - 添加了 `isChinese()` 和 `isEnglish()` 辅助方法

3. **映射器** (`src/modules/itinerary/services/itinerary.mapper.ts`)
   - `convertActivitiesToTimeSlots()` 方法同步更新

4. **Inspiration 模块** (`src/modules/inspiration/dto/inspiration.dto.ts`)
   - `TimeSlotDto` 也添加了多语言字段

## 注意事项

1. **数据来源优先级**：系统会按照优先级从多个数据源提取字段，确保尽可能提供完整的多语言信息

2. **自动推导**：如果数据源中没有明确指定，系统会尝试从 `title` 字段自动推导中文或英文名称

3. **位置名称构建**：如果所有数据源都没有位置名称，系统会自动构建为"地区+城市+国家"的格式

4. **性能影响**：多语言字段的提取和推导逻辑非常轻量，不会对接口性能造成明显影响

5. **数据一致性**：建议在创建或更新活动时，通过 `locationDetails` 或 `details` 字段提供完整的多语言信息，以确保数据一致性

## 相关文档

- [高海拔地区 API 文档](./altitude-api.md) - 同样包含多语言字段
- [Details 字段实现文档](./details-field-implementation.md) - 了解 details 字段结构
- [前端数据格式兼容性检查](./前端数据格式兼容性检查.md) - 了解数据转换规则

