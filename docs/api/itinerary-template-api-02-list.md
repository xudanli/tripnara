# 行程模版接口文档 - 2. 获取行程模版列表

## 接口信息

**接口路径：** `GET /api/v1/itineraries`

**接口描述：** 获取行程模版列表，支持多种筛选条件（状态、关键字、目的地、预算、旅行风格等）

**认证：** 需要 JWT Token（Bearer Token）

---

## 查询参数

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `page` | number | 否 | 页码，默认 1 | `1` |
| `limit` | number | 否 | 每页数量，默认 10，最大 100 | `10` |
| `status` | string | 否 | 状态筛选：`draft`、`published`、`archived`，传 `all` 表示全部 | `"all"` |
| `keyword` | string | 否 | 关键字搜索（标题或摘要） | `"冰岛"` |
| `language` | string | 否 | 语言代码：`zh-CN`、`en-US` | `"zh-CN"` |
| `destination` | string | 否 | 目的地 | `"冰岛"` |
| `budget` | string | 否 | 预算：`low`、`medium`、`high`，传 `all` 表示全部 | `"medium"` |
| `travelStyle` | string | 否 | 旅行风格：`relaxed`、`moderate`、`active`、`adventurous`，传 `all` 表示全部 | `"moderate"` |

---

## 请求示例

```
GET /api/v1/itineraries?page=1&limit=10&status=all&keyword=冰岛&language=zh-CN
```

### cURL

```bash
curl -X GET "http://localhost:3000/api/v1/itineraries?page=1&limit=10&status=all&keyword=冰岛&language=zh-CN" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 响应数据

### 成功响应（200 OK）

```json
{
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "status": "draft",
      "language": "zh-CN",
      "itineraryData": {
        "title": "冰岛之旅",
        "destination": "冰岛",
        "duration": 5,
        "budget": "medium",
        "totalCost": 2000,
        "summary": "这个5天冰岛行程覆盖雷克雅未克、黄金圈、南岸黑沙滩和蓝湖温泉..."
      },
      "createdAt": "2025-01-15T10:30:00Z",
      "updatedAt": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `data` | array | 行程模版列表数组 |
| `data[].id` | string | 行程模版ID |
| `data[].status` | string | 状态：`draft`、`published`、`archived` |
| `data[].language` | string | 语言代码 |
| `data[].itineraryData` | object | 行程数据摘要 |
| `data[].itineraryData.title` | string | 行程标题 |
| `data[].itineraryData.destination` | string | 目的地 |
| `data[].itineraryData.duration` | number | 行程天数 |
| `data[].itineraryData.budget` | string | 预算等级 |
| `data[].itineraryData.totalCost` | number | 总费用 |
| `data[].itineraryData.summary` | string | 行程摘要 |
| `data[].createdAt` | string | 创建时间（ISO 8601格式） |
| `data[].updatedAt` | string | 更新时间（ISO 8601格式） |
| `total` | number | 总记录数 |
| `page` | number | 当前页码 |
| `limit` | number | 每页数量 |

---

## 错误响应

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "未授权",
  "error": "Unauthorized"
}
```

---

## 使用示例

### JavaScript/TypeScript

```typescript
// 获取所有行程模版（第一页）
const response = await fetch('/api/v1/itineraries?page=1&limit=10', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const result = await response.json();
console.log(`共 ${result.total} 条记录，当前第 ${result.page} 页`);

// 筛选已发布的行程模版
const publishedResponse = await fetch('/api/v1/itineraries?status=published', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

// 关键字搜索
const searchResponse = await fetch('/api/v1/itineraries?keyword=冰岛&page=1&limit=20', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});
```

---

## 注意事项

1. **分页参数**：
   - `page` 从 1 开始，默认为 1
   - `limit` 默认为 10，最大值为 100
   - 如果不提供分页参数，将返回第一页的10条记录

2. **状态筛选**：
   - 如果不提供 `status` 参数，将返回所有状态的行程模版
   - 传入 `all` 也会返回所有状态的行程模版

3. **关键字搜索**：
   - 会在标题（title）和摘要（summary）中搜索
   - 搜索不区分大小写

4. **数据隔离**：
   - 只能获取当前登录用户自己的行程模版
   - 列表按创建时间倒序排列（最新的在前）

5. **筛选组合**：
   - 所有筛选条件可以组合使用
   - 筛选条件之间是"且"的关系（AND）

