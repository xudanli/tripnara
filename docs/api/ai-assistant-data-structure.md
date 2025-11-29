# AI 助手行程数据结构说明

本文档说明 AI 助手获取的行程数据结构的完整性和字段说明。

## 数据获取流程

1. **获取行程实体**：从数据库获取 `ItineraryEntity`
2. **数据转换**：通过 `entityToDetailWithTimeSlotsDto` 转换为前端格式
3. **JSON 序列化**：将完整数据序列化为 JSON 字符串传递给 AI

## 完整数据结构

### 顶层结构 (`ItineraryDetailWithTimeSlotsDto`)

```typescript
{
  id: string;                    // 行程ID
  destination: string;           // 目的地名称
  startDate: string;             // 开始日期 (YYYY-MM-DD)
  daysCount: number;             // 总天数
  summary: string;               // 行程摘要
  totalCost: number;             // 总费用
  currency?: string;             // 货币代码 (如: "CHF", "USD")
  currencyInfo?: {               // 货币详细信息
    code: string;                // 货币代码
    symbol: string;              // 货币符号
    name: string;               // 货币名称
  };
  preferences?: {                // 用户偏好
    budget?: string;
    interests?: string[];
    travelStyle?: string;
    // ... 其他偏好字段
  };
  status: 'draft' | 'published' | 'archived';
  createdAt: string;             // 创建时间 (ISO 8601)
  updatedAt: string;             // 更新时间 (ISO 8601)
  days: ItineraryDayWithTimeSlotsDto[];  // 天数详情数组
  hasDays: boolean;             // 是否有天数数据
}
```

### 天数结构 (`ItineraryDayWithTimeSlotsDto`)

```typescript
{
  day: number;                   // 天数序号 (从1开始)
  date: string;                  // 日期 (YYYY-MM-DD)
  title?: string;                // 天数标题 (可选)
  summary?: string;              // 天数摘要 (可选)
  detailsJson?: object;         // 天数详情 JSON (可选)
  timeSlots: ItineraryTimeSlotDto[];  // 时间段列表
}
```

### 时间段结构 (`ItineraryTimeSlotDto`) - **关键字段**

```typescript
{
  time: string;                  // 时间 (HH:mm 格式，如 "09:00")
  title: string;                 // 活动标题
  activity: string;              // 活动名称 (与 title 相同)
  type: 'attraction' | 'meal' | 'hotel' | 'shopping' | 'transport' | 'ocean';
  coordinates?: {                // **地理位置坐标** (对路线优化至关重要)
    lat: number;                 // 纬度
    lng: number;                 // 经度
  };
  notes?: string;               // 备注/描述
  duration?: number;            // 持续时间 (分钟)
  cost?: number;               // 费用
  details?: {                   // 详细信息对象
    notes?: string;
    description?: string;
    // ... 其他详细信息
  };
}
```

## 关键数据字段说明

### 1. 地理位置信息 (`coordinates`)

**重要性**：⭐⭐⭐⭐⭐ (对路线优化至关重要)

- **字段路径**：`days[].timeSlots[].coordinates`
- **格式**：`{ lat: number, lng: number }`
- **用途**：
  - 路线优化分析
  - 计算活动之间的距离
  - 判断是否存在"折返跑"
  - 提供交通方式建议

**数据来源**：
- 从数据库实体中的 `activities[].location` 字段转换而来
- 通过 `convertActivitiesToTimeSlots` 方法转换为 `coordinates`

### 2. 时间信息 (`time`)

**重要性**：⭐⭐⭐⭐

- **字段路径**：`days[].timeSlots[].time`
- **格式**：`HH:mm` (如 "09:00", "14:30")
- **用途**：
  - 分析时间安排是否合理
  - 判断活动之间的时间间隔
  - 提供最佳游览时间建议

### 3. 活动类型 (`type`)

**重要性**：⭐⭐⭐⭐

- **字段路径**：`days[].timeSlots[].type`
- **可选值**：`attraction` | `meal` | `hotel` | `shopping` | `transport` | `ocean`
- **用途**：
  - 识别不同类型的活动
  - 提供针对性的建议（如餐厅预约要求）
  - 优化路线时考虑活动类型

### 4. 费用信息 (`cost`, `totalCost`)

**重要性**：⭐⭐⭐⭐

- **字段路径**：
  - 单个活动：`days[].timeSlots[].cost`
  - 总费用：`totalCost`
- **用途**：
  - 预算分析
  - 费用匹配评估
  - 提供预算建议

### 5. 持续时间 (`duration`)

**重要性**：⭐⭐⭐

- **字段路径**：`days[].timeSlots[].duration`
- **单位**：分钟
- **用途**：
  - 评估时间安排是否合理
  - 计算活动之间的时间间隔

### 6. 货币信息 (`currency`, `currencyInfo`)

**重要性**：⭐⭐⭐

- **字段路径**：`currency`, `currencyInfo`
- **用途**：
  - 费用分析时使用正确的货币单位
  - 提供准确的费用建议

### 7. 用户偏好 (`preferences`)

**重要性**：⭐⭐⭐

- **字段路径**：`preferences`
- **用途**：
  - 理解用户的旅行风格
  - 提供个性化的建议
  - 评估行程与偏好的匹配度

## 数据完整性检查

AI 助手在获取数据时会进行以下检查：

1. **坐标数据检查**：
   - 统计有坐标的时间段数量
   - 统计有坐标的天数
   - 记录日志用于调试

2. **数据验证**：
   - 所有字段都通过 `DataValidator` 进行验证和修复
   - 确保时间格式正确
   - 确保坐标格式正确
   - 确保数值字段有效

## 数据传递方式

数据通过以下方式传递给 AI：

```javascript
const systemMessage = `...
完整行程数据：${JSON.stringify(itineraryDetail, null, 2)}
...`;
```

- 使用 `JSON.stringify` 序列化
- 使用 `null, 2` 参数格式化，便于 AI 阅读
- 包含完整的嵌套结构

## 潜在问题与解决方案

### 1. 坐标数据缺失

**问题**：如果某些活动没有坐标信息，路线优化功能可能受限。

**解决方案**：
- 数据转换时会保留 `null` 值
- AI 会基于活动名称和目的地信息进行推断
- 建议在生成行程时确保所有活动都有坐标信息

### 2. 数据过大

**问题**：如果行程数据非常大，可能超出 AI 的上下文限制。

**解决方案**：
- 当前实现传递完整数据
- 如果遇到问题，可以考虑：
  - 只传递当前询问相关的天数数据
  - 压缩数据格式
  - 使用数据摘要

### 3. 数据格式不一致

**问题**：不同来源的数据格式可能不一致。

**解决方案**：
- 统一使用 `entityToDetailWithTimeSlotsDto` 转换
- 所有字段都通过 `DataValidator` 验证和修复
- 确保输出格式一致

## 调试建议

如果 AI 助手无法正确分析路线，可以：

1. **检查日志**：查看数据完整性检查日志
   ```
   [AI Assistant] 行程数据完整性检查: 目的地=..., 天数=..., 总时间段=..., 有坐标的时间段=...
   ```

2. **验证坐标数据**：确认 `days[].timeSlots[].coordinates` 字段存在且格式正确

3. **检查数据大小**：确认 JSON 数据不会过大

4. **测试数据**：使用 Swagger 或 Postman 测试接口，查看返回的数据结构

## 总结

✅ **数据完整性**：AI 助手可以获取完整的行程数据结构

✅ **关键字段**：包含所有必要的字段，特别是：
- 地理位置坐标 (`coordinates`)
- 时间信息 (`time`)
- 活动类型 (`type`)
- 费用信息 (`cost`, `totalCost`)
- 持续时间 (`duration`)

✅ **数据格式**：统一使用前端格式 (`timeSlots`)，便于 AI 理解

✅ **数据验证**：所有字段都经过验证和修复，确保格式正确

AI 助手可以基于这些完整的数据进行：
- 路线优化分析
- 预算匹配评估
- 时间安排分析
- 风险识别
- 深度本地洞察

