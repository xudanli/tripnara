# 行程接口文档 - 27. 获取通用旅行安全通知列表

## 接口信息

**接口路径：** `GET /api/v1/alerts`

**接口描述：** 根据目的地、时间段等条件查询通用旅行安全通知

**认证：** 不需要认证（公开接口）

---

## 查询参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `destination` | string | 否 | 目的地（精确匹配） |
| `countryCode` | string | 否 | 国家代码（ISO 3166-1 alpha-3） |
| `severity` | string | 否 | 严重程度：`low`、`medium`、`high`、`critical` |
| `status` | string | 否 | 状态：`active`、`expired`、`archived`（默认：`active`） |
| `startDate` | string | 否 | 开始日期（查询在此日期之后生效的通知） |
| `endDate` | string | 否 | 结束日期（查询在此日期之前生效的通知） |
| `page` | number | 否 | 页码（默认：1） |
| `limit` | number | 否 | 每页数量（默认：20） |

---

## 请求示例

### cURL

```bash
# 查询冰岛的所有活跃通知
curl -X GET "http://localhost:3000/api/v1/alerts?destination=冰岛&status=active"

# 查询高严重程度的通知
curl -X GET "http://localhost:3000/api/v1/alerts?severity=high&page=1&limit=10"

# 查询指定日期范围内的通知
curl -X GET "http://localhost:3000/api/v1/alerts?startDate=2025-01-15&endDate=2025-02-15"
```

---

## 响应数据

### 成功响应（200 OK）

```json
{
  "data": [
    {
      "id": "alert-id-123",
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
      },
      "createdAt": "2025-01-15T10:00:00.000Z",
      "updatedAt": "2025-01-15T10:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `data` | array | 通知列表 |
| `data[].id` | string | 通知ID |
| `data[].title` | string | 通知标题 |
| `data[].content` | string | 通知内容 |
| `data[].destination` | string | 目的地 |
| `data[].countryCode` | string | 国家代码 |
| `data[].severity` | string | 严重程度：`low`、`medium`、`high`、`critical` |
| `data[].status` | string | 状态：`active`、`expired`、`archived` |
| `data[].startDate` | string | 生效开始日期（ISO 8601格式） |
| `data[].endDate` | string | 生效结束日期（ISO 8601格式，可选） |
| `data[].metadata` | object | 元数据（可选） |
| `data[].createdAt` | string | 创建时间（ISO 8601格式） |
| `data[].updatedAt` | string | 更新时间（ISO 8601格式） |
| `total` | number | 总数量 |
| `page` | number | 当前页码 |
| `limit` | number | 每页数量 |

---

## 错误响应

### 400 Bad Request - 参数验证失败

```json
{
  "statusCode": 400,
  "message": [
    "severity must be one of the following values: low, medium, high, critical"
  ],
  "error": "Bad Request"
}
```

---

## 使用示例

### JavaScript/TypeScript

```typescript
// 查询指定目的地的活跃通知
const response = await fetch('/api/v1/alerts?destination=冰岛&status=active');
const result = await response.json();

console.log('通知列表:', result.data);
console.log('总数量:', result.total);

// 查询高严重程度的通知
const highSeverityResponse = await fetch('/api/v1/alerts?severity=high&page=1&limit=10');
const highSeverityResult = await highSeverityResponse.json();

// 查询指定日期范围内的通知
const dateRangeResponse = await fetch(
  '/api/v1/alerts?startDate=2025-01-15&endDate=2025-02-15'
);
const dateRangeResult = await dateRangeResponse.json();
```

---

## 注意事项

1. **默认行为**：
   - 如果不指定 `status`，默认只返回 `active` 状态的通知
   - 如果不指定 `page` 和 `limit`，默认返回第 1 页，每页 20 条

2. **排序规则**：
   - 通知按严重程度排序（critical > high > medium > low）
   - 相同严重程度按开始日期倒序排列（最新的在前）

3. **日期范围查询**：
   - `startDate` 和 `endDate` 用于查询在指定日期范围内生效的通知
   - 如果通知没有 `endDate`，表示长期有效

4. **公开接口**：
   - 此接口不需要认证，所有用户都可以访问
   - 主要用于前端展示旅行安全通知

5. **用途**：
   - 在行程详情页显示相关目的地的安全通知
   - 在首页或通知中心展示重要安全提醒
   - 帮助用户了解目的地的安全状况

