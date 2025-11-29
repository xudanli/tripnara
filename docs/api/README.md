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

### 4. 媒体服务 API
**文档**: [media-api.md](./media-api.md)

- `POST /api/v1/media/search-image` - 搜索图片（代理 Unsplash/Pexels）
- `POST /api/v1/media/search-video` - 搜索视频
- `POST /api/v1/media/upload` - 上传媒体（保存URL到数据库）
- `GET /api/v1/media/:mediaId` - 获取媒体详情

**功能**: 搜索高质量图片和视频资源，支持从 Unsplash 和 Pexels 获取媒体内容。同时支持保存用户上传的媒体URL到数据库。

---

### 5. 旅伴管理 API
**文档**: 
- [journey-api-34-members.md](./journey-api-34-members.md) - 成员管理
- [journey-api-37-verify-invitation.md](./journey-api-37-verify-invitation.md) - 验证邀请

- `GET /api/v1/journeys/{journeyId}/members` - 获取成员列表
- `POST /api/v1/journeys/{journeyId}/members/invite` - 邀请成员
- `POST /api/v1/journeys/{journeyId}/members` - 添加成员
- `PATCH /api/v1/journeys/{journeyId}/members/{memberId}` - 更新成员信息
- `DELETE /api/v1/journeys/{journeyId}/members/{memberId}` - 移除成员
- `GET /api/v1/journeys/invitations/{invitationId}` - 验证邀请（公开接口，无需认证）

**功能**: 实现行程成员（旅伴）的完整管理功能，包括成员的增删改查、邀请成员、权限控制等。支持 owner、admin、member 三种角色，每个角色拥有不同的权限。验证邀请接口用于验证邀请链接的有效性，无需认证。

---

### 6. 货币服务 API
**文档**: [backend-migration-guide.md](./backend-migration-guide.md)

- `GET /api/v1/currency/infer` - 推断货币信息
- `GET /api/v1/currency/:countryCode` - 根据国家代码获取货币信息
- `POST /api/v1/journeys/:journeyId/recalculate-cost` - 重新计算行程总费用

**功能**: 自动推断货币信息，支持根据国家代码、国家名称、坐标等推断。所有行程接口现在自动包含货币信息。

---

### 7. 预算管理 API
**文档**: 
- [journey-api-33-get-expenses.md](./journey-api-33-get-expenses.md) - 获取支出列表
- [journey-api-34-create-expense.md](./journey-api-34-create-expense.md) - 创建支出
- [journey-api-35-update-expense.md](./journey-api-35-update-expense.md) - 更新支出
- [journey-api-36-delete-expense.md](./journey-api-36-delete-expense.md) - 删除支出

- `GET /api/v1/journeys/{journeyId}/expenses` - 获取支出列表
- `POST /api/v1/journeys/{journeyId}/expenses` - 创建支出
- `PATCH /api/v1/journeys/{journeyId}/expenses/{expenseId}` - 更新支出
- `DELETE /api/v1/journeys/{journeyId}/expenses/{expenseId}` - 删除支出

**功能**: 完整的预算管理功能，支持记录的增删改查、按分类/日期/付款人筛选、分摊管理（不分摊/平均分摊/自定义分摊）等。

---

### 8. 货币和国家代码管理 API（后台管理）
**文档**: [journey-api-42-currency-admin.md](./journey-api-42-currency-admin.md)

- `POST /api/v1/admin/currency/currencies` - 创建货币
- `GET /api/v1/admin/currency/currencies` - 获取货币列表
- `GET /api/v1/admin/currency/currencies/:id` - 获取货币详情
- `PUT /api/v1/admin/currency/currencies/:id` - 更新货币
- `PATCH /api/v1/admin/currency/currencies/:id` - 更新货币（部分更新）
- `DELETE /api/v1/admin/currency/currencies/:id` - 删除货币
- `POST /api/v1/admin/currency/country-mappings` - 创建国家货币映射
- `POST /api/v1/admin/currency/country-mappings/batch` - 批量创建国家货币映射（推荐）
- `GET /api/v1/admin/currency/country-mappings` - 获取国家货币映射列表
- `GET /api/v1/admin/currency/country-mappings/:id` - 获取国家货币映射详情
- `PUT /api/v1/admin/currency/country-mappings/:id` - 更新国家货币映射
- `PATCH /api/v1/admin/currency/country-mappings/:id` - 更新国家货币映射（部分更新）
- `DELETE /api/v1/admin/currency/country-mappings/:id` - 删除国家货币映射

**功能**: 完整的货币和国家代码管理功能，包括货币信息的增删改查、国家代码与货币的映射管理等。所有数据存储在数据库中，支持动态管理。

---

### 9. 通用安全提示 API（公开接口）
**文档**: 
- [journey-api-28-create-alert.md](./journey-api-28-create-alert.md) - 创建安全提示
- [journey-api-39-get-alert.md](./journey-api-39-get-alert.md) - 获取单个安全提示详情
- [journey-api-40-update-alert.md](./journey-api-40-update-alert.md) - 更新安全提示
- [journey-api-41-delete-alert.md](./journey-api-41-delete-alert.md) - 删除安全提示

---

### 13. 每日概要生成 API
**文档**: [journey-api-43-daily-summaries.md](./journey-api-43-daily-summaries.md)

- `POST /api/v1/journeys/{journeyId}/daily-summaries` - 生成每日概要

**功能**: 使用 AI 为行程的每一天生成生动有趣的概要（80-120字），突出当天的亮点和特色活动。支持生成所有天的概要或指定天的概要。
- [journey-api-38-public-safety-notice.md](./journey-api-38-public-safety-notice.md) - 生成通用安全提示

- `GET /api/v1/alerts` - 获取安全提示列表（支持筛选和分页）
- `POST /api/v1/alerts` - 创建安全提示（无需认证）
- `GET /api/v1/alerts/:id` - 获取单个安全提示详情（无需认证）
- `PUT /api/v1/alerts/:id` - 更新安全提示（无需认证）
- `PATCH /api/v1/alerts/:id` - 更新安全提示（部分更新，无需认证）
- `DELETE /api/v1/alerts/:id` - 删除安全提示（无需认证）
- `POST /api/v1/journeys/safety-notice/public` - 生成通用安全提示（无需认证）

**功能**: 完整的旅行安全提示管理功能，包括创建、查询、更新、删除等操作。所有接口都是公开接口，无需认证。支持按目的地、国家代码、严重程度、状态等条件筛选。生成通用安全提示接口支持缓存机制，相同目的地和语言的请求会返回缓存结果。

---

### 7. 后端迁移指南 ⚠️ **重要**
**文档**: [backend-migration-guide.md](./backend-migration-guide.md)

**功能**: 说明后端已完成的数据格式验证、总费用计算、数据转换统一和货币推断功能，以及前端需要做的相应调整。

**关键变更：**
- ✅ 后端自动验证和修复数据格式
- ✅ 后端自动计算总费用
- ✅ 后端返回统一的前端格式（timeSlots, coordinates）
- ✅ 后端自动推断货币信息

**前端影响：**
- 可以移除数据验证和修复代码
- 可以移除费用计算逻辑
- 可以移除数据转换代码
- 可以移除货币推断逻辑

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
- `SearchImageRequest` / `SearchImageResponse`
- `SearchVideoRequest` / `SearchVideoResponse`
- `UploadMediaRequest` / `UploadMediaResponse`

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

