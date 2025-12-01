# 目的地实用信息 API 文档

## 接口概述

目的地实用信息功能为旅行者提供目的地的关键实用信息，包括语言、汇率、时区、插座类型和紧急电话。内容由 AI 生成，并使用 Redis 缓存 30 天以提升性能。

---

## 获取目的地实用信息

### 基本信息

- **接口路径**: `GET /v1/journeys/:journeyId/local-essentials`
- **请求方法**: `GET`
- **认证方式**: Bearer Token (JWT)
- **权限要求**: 必须是行程的所有者

### 路径参数

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| journeyId | string | 是 | 行程ID | `"550e8400-e29b-41d4-a716-446655440000"` |

### 请求头

```
Authorization: Bearer {your_jwt_token}
Content-Type: application/json
```

### 响应格式

#### 成功响应 (200 OK)

```json
{
  "success": true,
  "destination": "冰岛",
  "localEssentials": {
    "language": "冰岛语（Íslenska）。常用问候：你好 - Halló / Góðan daginn，谢谢 - Takk / Þakka þér",
    "currencyRate": "1 ISK ≈ 0.05 CNY（约20冰岛克朗 = 1人民币）",
    "timeZone": "GMT+0 或 UTC+0",
    "powerOutlet": "Type C, 220V（欧式两圆插）",
    "emergencyNumber": "112（紧急电话，报警、消防、急救通用）"
  },
  "fromCache": false,
  "generatedAt": "2025-12-01T13:00:00.000Z"
}
```

#### 响应字段说明

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| success | boolean | 请求是否成功 | `true` |
| destination | string | 目的地名称 | `"冰岛"` |
| localEssentials | object | 实用信息对象 | 见下方详细说明 |
| localEssentials.language | string | 官方语言及常用问候语 | `"冰岛语（Íslenska）。常用问候：你好 - Halló..."` |
| localEssentials.currencyRate | string | 汇率估算 | `"1 ISK ≈ 0.05 CNY（约20冰岛克朗 = 1人民币）"` |
| localEssentials.timeZone | string | 时区（GMT/UTC格式） | `"GMT+0 或 UTC+0"` |
| localEssentials.powerOutlet | string | 插座类型 | `"Type C, 220V（欧式两圆插）"` |
| localEssentials.emergencyNumber | string | 报警/急救电话 | `"112（紧急电话，报警、消防、急救通用）"` |
| fromCache | boolean | 是否来自缓存 | `false` 或 `true` |
| generatedAt | string | 生成时间（ISO 8601格式） | `"2025-12-01T13:00:00.000Z"` |

### 错误响应

#### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**原因**: 未提供有效的 JWT Token 或 Token 已过期

#### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "行程不存在: {journeyId}"
}
```

或

```json
{
  "statusCode": 404,
  "message": "无权访问此行程"
}
```

**原因**: 
- 行程不存在
- 用户不是该行程的所有者

#### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "AI服务调用失败: {error_message}"
}
```

**原因**: AI 服务调用失败（网络错误、超时等）

### 请求示例

#### cURL

```bash
curl -X GET \
  'https://api.example.com/v1/journeys/550e8400-e29b-41d4-a716-446655440000/local-essentials' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json'
```

#### JavaScript (Fetch)

```javascript
const response = await fetch(
  'https://api.example.com/v1/journeys/550e8400-e29b-41d4-a716-446655440000/local-essentials',
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  }
);

const data = await response.json();
console.log(data.localEssentials);
```

#### TypeScript (Axios)

```typescript
import axios from 'axios';

const response = await axios.get<LocalEssentialsResponseDto>(
  `/v1/journeys/${journeyId}/local-essentials`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

console.log(response.data.localEssentials);
```

### 字段详细说明

#### language（语言及问候语）

- **格式要求**: 不仅要写官方语言，还要包含常用问候语
- **示例**: `"冰岛语（Íslenska）。常用问候：你好 - Halló / Góðan daginn，谢谢 - Takk / Þakka þér"`
- **内容**: 官方语言名称、常用问候语（你好、谢谢等）

#### currencyRate（汇率估算）

- **格式要求**: 提供大概的兑换比例
- **示例**: `"1 ISK ≈ 0.05 CNY（约20冰岛克朗 = 1人民币）"`
- **内容**: 当地货币与人民币的兑换比例

#### timeZone（时区）

- **格式要求**: 提供 GMT/UTC 格式
- **示例**: `"GMT+0 或 UTC+0"`
- **内容**: 时区信息，使用标准时区格式

#### powerOutlet（插座类型）

- **格式要求**: 说明是 Type A/B/C 等
- **示例**: `"Type C, 220V（欧式两圆插）"`
- **内容**: 插座类型和电压信息

#### emergencyNumber（紧急电话）

- **格式要求**: 提供当地的具体号码
- **示例**: `"112（紧急电话，报警、消防、急救通用）"`
- **内容**: 报警、急救等紧急联系电话

### 缓存机制

- **缓存键**: `local-essentials:{destination}` (小写)
- **缓存时间**: 30 天
- **缓存策略**: 
  - 首次请求：调用 AI 生成内容，存入 Redis
  - 后续请求：直接从 Redis 读取，`fromCache: true`
  - Redis 不可用时：自动回退，不影响功能

### 性能优化

- **首次生成**: 约 3-5 秒（取决于 AI 响应时间）
- **缓存命中**: < 100ms（从 Redis 读取）
- **性能提升**: 缓存命中时性能提升 30-50 倍

### 注意事项

1. **权限要求**: 只有行程的所有者才能访问该行程的实用信息
2. **缓存策略**: 相同目的地的所有行程共享同一个缓存（基于目的地名称）
3. **数据准确性**: 信息由 AI 生成，建议作为参考，重要信息请以官方渠道为准
4. **字段完整性**: 所有字段都是必填的，如果 AI 返回缺少字段会报错

### 业务逻辑

1. 验证行程是否存在
2. 检查用户权限（必须是行程所有者）
3. 从 Redis 缓存读取（如果存在）
4. 如果缓存未命中，调用 AI 生成内容
5. 将生成的内容存入 Redis（30天）
6. 返回结果

### 相关接口

- `GET /v1/journeys/:journeyId` - 获取行程详情
- `GET /v1/journeys/:journeyId/cultural-guide` - 获取文化红黑榜
- `GET /v1/journeys/:journeyId/safety-notice` - 获取安全提示

### 数据迁移说明

**重要变更**：
- 从 `practicalInfo` 中移除了 `plugType` 和 `currency` 字段
- 这些信息现在由 `local-essentials` 接口提供
- `practicalInfo` 现在只包含：`weather`、`safety`、`culturalTaboos`、`packingList`

**迁移建议**：
- 前端应调用新的 `local-essentials` 接口获取这些信息
- 不再从 `practicalInfo` 中读取 `plugType` 和 `currency`

---

## 更新日志

- **2025-12-01**: 初始版本发布
  - 支持获取目的地实用信息
  - 实现 Redis 缓存机制
  - 支持权限验证
  - 从 practicalInfo 中移除相关字段

