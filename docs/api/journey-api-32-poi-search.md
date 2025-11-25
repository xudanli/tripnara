# 行程接口文档 - 32. POI 搜索

## 接口信息

**接口路径：** `POST /api/v1/poi/search`

**接口描述：** 搜索兴趣点（前端 ExperienceDay 复用）

**认证：** 不需要认证（公开接口）

**Content-Type：** `application/json`

---

## 请求参数

### 请求体结构

```json
{
  "query": "博物馆",
  "destination": "巴黎",
  "latitude": 48.8566,
  "longitude": 2.3522,
  "type": "attraction",
  "limit": 20
}
```

### 字段说明

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `query` | string | 是 | 搜索关键词 |
| `destination` | string | 否 | 目的地名称 |
| `latitude` | number | 否 | 纬度（-90 到 90） |
| `longitude` | number | 否 | 经度（-180 到 180） |
| `type` | string | 否 | POI 类型：`attraction`、`restaurant`、`hotel`、`shopping`、`all`（默认：`all`） |
| `limit` | number | 否 | 返回数量限制（1-50，默认：20） |

---

## 请求示例

### cURL

```bash
curl -X POST "http://localhost:3000/api/v1/poi/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "博物馆",
    "destination": "巴黎",
    "type": "attraction",
    "limit": 10
  }'
```

---

## 响应数据

### 成功响应（200 OK）

```json
{
  "data": [
    {
      "id": "poi-123",
      "name": "卢浮宫",
      "address": "Rue de Rivoli, 75001 Paris",
      "latitude": 48.8606,
      "longitude": 2.3376,
      "type": "attraction",
      "rating": 4.5,
      "imageUrl": "https://example.com/image.jpg",
      "description": "世界著名的艺术博物馆"
    },
    {
      "id": "poi-124",
      "name": "奥赛博物馆",
      "address": "1 Rue de la Légion d'\''Honneur, 75007 Paris",
      "latitude": 48.8600,
      "longitude": 2.3266,
      "type": "attraction",
      "rating": 4.7,
      "imageUrl": "https://example.com/image2.jpg",
      "description": "印象派艺术收藏"
    }
  ],
  "total": 2
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `data` | array | POI 列表 |
| `data[].id` | string | POI ID |
| `data[].name` | string | POI 名称 |
| `data[].address` | string | 地址（可选） |
| `data[].latitude` | number | 纬度 |
| `data[].longitude` | number | 经度 |
| `data[].type` | string | POI 类型 |
| `data[].rating` | number | 评分（可选） |
| `data[].imageUrl` | string | 图片URL（可选） |
| `data[].description` | string | 描述（可选） |
| `total` | number | 总数量 |

---

## 错误响应

### 400 Bad Request - 参数验证失败

```json
{
  "statusCode": 400,
  "message": [
    "query should not be empty",
    "latitude must be a number"
  ],
  "error": "Bad Request"
}
```

---

## 使用示例

### JavaScript/TypeScript

```typescript
// 搜索景点
const searchRequest = {
  query: '博物馆',
  destination: '巴黎',
  type: 'attraction' as const,
  limit: 10,
};

const response = await fetch('/api/v1/poi/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(searchRequest),
});

const result = await response.json();
console.log('POI 列表:', result.data);
console.log('总数量:', result.total);

// 使用坐标搜索
const coordinateSearch = {
  query: '餐厅',
  latitude: 48.8566,
  longitude: 2.3522,
  type: 'restaurant' as const,
  limit: 20,
};
```

---

## 注意事项

1. **数据来源**：
   - POI 数据来自 Travel Advisor API（通过 ExternalService）
   - 需要配置 `TRAVEL_ADVISOR_API_KEY` 环境变量

2. **搜索策略**：
   - 如果提供了坐标，优先使用坐标搜索
   - 如果提供了目的地名称，使用目的地名称搜索
   - 否则使用查询关键词搜索

3. **类型过滤**：
   - 可以指定 POI 类型进行过滤
   - 支持的类型：`attraction`（景点）、`restaurant`（餐厅）、`hotel`（酒店）、`shopping`（购物）、`all`（全部）

4. **结果处理**：
   - 如果 Travel Advisor API 未配置或返回错误，会返回空结果
   - 不会抛出错误，保证接口的稳定性

5. **用途**：
   - 在行程规划中搜索附近的景点、餐厅等
   - 前端 ExperienceDay 组件可以复用此接口
   - 帮助用户发现目的地的精彩地点

6. **缓存机制**：
   - ExternalService 内部实现了缓存机制
   - 相同查询的缓存时间约为 5 分钟

