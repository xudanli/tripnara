# 行程接口文档 - 28. 创建通用旅行安全通知

## 接口信息

**接口路径：** `POST /api/v1/alerts`

**接口描述：** 创建新的通用旅行安全通知（公开接口，无需认证）

**认证：** 不需要（公开接口）

**Content-Type：** `application/json`

---

## 请求参数

### 请求体结构

```json
{
  "title": "冰岛火山活动预警",
  "content": "近期冰岛火山活动频繁，请游客注意安全，避免前往危险区域。",
  "destination": "冰岛",
  "countryCode": "ISL",
  "severity": "high",
  "status": "active",
  "startDate": "2025-01-15T00:00:00.000Z",
  "endDate": "2025-02-15T00:00:00.000Z",
  "metadata": {
    "source": "government",
    "region": "south"
  }
}
```

### 字段说明

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `title` | string | 是 | 通知标题（最大长度 255） |
| `content` | string | 是 | 通知内容 |
| `destination` | string | 是 | 目的地（最大长度 255） |
| `countryCode` | string | 否 | 国家代码（ISO 3166-1 alpha-3，最大长度 3） |
| `severity` | string | 是 | 严重程度：`low`、`medium`、`high`、`critical` |
| `status` | string | 否 | 状态：`active`、`expired`、`archived`（默认：`active`） |
| `startDate` | string | 是 | 生效开始日期（ISO 8601格式） |
| `endDate` | string | 否 | 生效结束日期（ISO 8601格式） |
| `metadata` | object | 否 | 元数据（用于存储额外信息） |

---

## 请求示例

### cURL

```bash
curl -X POST "http://localhost:3000/api/v1/alerts" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "冰岛火山活动预警",
    "content": "近期冰岛火山活动频繁，请游客注意安全，避免前往危险区域。",
    "destination": "冰岛",
    "countryCode": "ISL",
    "severity": "high",
    "status": "active",
    "startDate": "2025-01-15T00:00:00.000Z",
    "endDate": "2025-02-15T00:00:00.000Z"
  }'
```

---

## 响应数据

### 成功响应（200 OK）

```json
{
  "success": true,
  "data": {
    "id": "alert-id-123",
    "title": "冰岛火山活动预警",
    "content": "近期冰岛火山活动频繁，请游客注意安全，避免前往危险区域。",
    "destination": "冰岛",
    "countryCode": "ISL",
    "severity": "high",
    "status": "active",
    "startDate": "2025-01-15T00:00:00.000Z",
    "endDate": "2025-02-15T00:00:00.000Z",
    "metadata": null,
    "createdAt": "2025-01-15T12:00:00.000Z",
    "updatedAt": "2025-01-15T12:00:00.000Z"
  },
  "message": "创建成功"
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 是否成功 |
| `data` | object | 创建的通知数据 |
| `data.id` | string | 通知ID（自动生成） |
| `data.title` | string | 通知标题 |
| `data.content` | string | 通知内容 |
| `data.destination` | string | 目的地 |
| `data.countryCode` | string | 国家代码 |
| `data.severity` | string | 严重程度 |
| `data.status` | string | 状态 |
| `data.startDate` | string | 生效开始日期（ISO 8601格式） |
| `data.endDate` | string | 生效结束日期（ISO 8601格式，可选） |
| `data.metadata` | object | 元数据（可选） |
| `data.createdAt` | string | 创建时间（ISO 8601格式） |
| `data.updatedAt` | string | 更新时间（ISO 8601格式） |
| `message` | string | 响应消息 |

---

## 错误响应

### 400 Bad Request - 参数验证失败

```json
{
  "statusCode": 400,
  "message": [
    "title should not be empty",
    "content should not be empty",
    "severity must be one of the following values: low, medium, high, critical"
  ],
  "error": "Bad Request"
}
```

### 400 Bad Request - 日期验证失败

```json
{
  "statusCode": 400,
  "message": "无效的开始日期",
  "error": "Bad Request"
}
```

```json
{
  "statusCode": 400,
  "message": "结束日期不能早于开始日期",
  "error": "Bad Request"
}
```

---

## 使用示例

### JavaScript/TypeScript

```typescript
const newAlert = {
  title: '冰岛火山活动预警',
  content: '近期冰岛火山活动频繁，请游客注意安全，避免前往危险区域。',
  destination: '冰岛',
  countryCode: 'ISL',
  severity: 'high' as const,
  status: 'active' as const,
  startDate: '2025-01-15T00:00:00.000Z',
  endDate: '2025-02-15T00:00:00.000Z',
  metadata: {
    source: 'government',
    region: 'south',
  },
};

const response = await fetch('/api/v1/alerts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(newAlert),
});

const result = await response.json();
if (result.success) {
  console.log('创建成功:', result.data);
}
```

---

## 注意事项

1. **公开接口**：
   - 此接口是公开接口，无需认证即可调用
   - 任何人都可以创建安全通知
   - 建议在生产环境中添加速率限制或其他保护措施

2. **日期验证**：
   - `startDate` 和 `endDate` 必须是有效的 ISO 8601 格式日期
   - `endDate` 不能早于 `startDate`
   - 如果不提供 `endDate`，通知将长期有效

3. **严重程度**：
   - `low`：低风险，一般提醒
   - `medium`：中等风险，需要注意
   - `high`：高风险，建议谨慎
   - `critical`：严重风险，强烈建议避免

4. **状态管理**：
   - `active`：活跃状态，会显示在查询结果中
   - `expired`：已过期，不会显示在默认查询中
   - `archived`：已归档，不会显示在默认查询中

5. **用途**：
   - 后台管理员创建和管理旅行安全通知
   - 通知会显示在相关目的地的行程中
   - 帮助用户了解最新的安全状况

