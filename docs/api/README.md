# API 接口文档索引

本文档目录包含所有新接口的详细文档，供前端开发人员对接使用。

## 接口列表

### 1. 行程生成 API
**文档**: [itinerary-api.md](./itinerary-api.md)

- `POST /api/itinerary/generate` - 生成旅行行程

**功能**: 根据目的地、天数、偏好等信息，通过 AI 生成详细的旅行行程，包含每天的活动安排、时间、地点、费用等。

---

### 2. 位置信息生成 API
**文档**: [location-api.md](./location-api.md)

- `POST /api/location/generate` - 生成单个活动位置信息
- `POST /api/location/generate-batch` - 批量生成活动位置信息

**功能**: 获取活动的详细位置信息，包括地址、交通、开放时间、门票价格、游览建议等。支持单个和批量生成。

---

### 3. 旅行摘要生成 API
**文档**: [travel-summary-api.md](./travel-summary-api.md)

- `POST /api/travel/summary` - 生成旅行摘要

**功能**: 根据已生成的行程数据，生成生动有趣的旅行摘要（100-150字），用于行程展示和分享。

---

## 快速开始

### 1. 认证

所有接口都需要 JWT Bearer Token 认证：

```javascript
const token = 'your-jwt-token';
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};
```

### 2. 基础 URL

开发环境: `http://localhost:3000`  
生产环境: 根据实际部署地址

### 3. 错误处理

所有接口遵循统一的错误响应格式：

```typescript
interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
}
```

### 4. 类型定义

所有接口都提供了完整的 TypeScript 类型定义，建议前端使用这些类型：

- `GenerateItineraryRequest` / `GenerateItineraryResponse`
- `GenerateLocationRequest` / `GenerateLocationResponse`
- `GenerateLocationBatchRequest` / `GenerateLocationBatchResponse`
- `GenerateTravelSummaryRequest` / `GenerateTravelSummaryResponse`

---

## 典型使用流程

### 场景 1: 生成完整行程

```javascript
// 1. 生成行程
const itinerary = await generateItinerary({
  destination: '瑞士琉森',
  days: 5,
  preferences: { interests: ['自然风光'] },
  startDate: '2024-06-01'
}, token);

// 2. 为每个活动生成位置信息
const locationPromises = itinerary.data.days.flatMap(day =>
  day.activities.map(activity =>
    generateLocation({
      activityName: activity.title,
      destination: '瑞士琉森',
      activityType: activity.type,
      coordinates: activity.location
    }, token)
  )
);
const locations = await Promise.all(locationPromises);

// 3. 生成行程摘要
const summary = await generateTravelSummary({
  destination: '瑞士琉森',
  itinerary: itinerary.data
}, token);
```

### 场景 2: 批量获取位置信息

```javascript
// 收集所有活动
const activities = itinerary.data.days.flatMap(day =>
  day.activities.map(activity => ({
    activityName: activity.title,
    destination: '瑞士琉森',
    activityType: activity.type,
    coordinates: activity.location
  }))
);

// 批量生成位置信息
const locations = await generateLocationBatch({ activities }, token);
```

---

## 常见问题

### Q: 接口响应时间多久？

- **行程生成**: 5-30 秒（AI 生成）
- **位置信息**: 2-5 秒（首次）或 < 10ms（缓存命中）
- **旅行摘要**: 2-5 秒（AI 生成）或 < 100ms（模板生成）

### Q: 如何处理长时间等待？

建议前端：
1. 显示加载动画
2. 提供取消功能
3. 使用进度提示（批量请求时）

### Q: 缓存机制如何工作？

- **位置信息**: 服务器内存缓存 24 小时，相同活动+目的地+类型会直接返回缓存
- **行程和摘要**: 不缓存，每次都是新生成

### Q: 错误时如何处理？

- 所有接口都有错误回退机制
- 位置信息：AI 失败时使用默认模板
- 摘要：AI 失败时使用模板生成
- 行程：失败时抛出错误，需要前端处理

---

## 技术支持

如有问题，请参考：
- [API 测试指南](../api-testing-guide.md)
- [数据库连接测试](../database-connection-test.md)
- Swagger 文档: `http://localhost:3000/api/docs`

