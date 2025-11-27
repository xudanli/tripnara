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
| `query` | string | 是 | 搜索关键词。根据选择的类别自动生成：<br>- restaurant: "餐厅"<br>- attraction: "景点"<br>- accommodation: "酒店"<br>- shopping: "购物"<br>- gas_station: "加油站"<br>- ev_charging: "充电桩"<br>- rest_area: "休息站" |
| `destination` | string | 否 | 目的地名称。从行程数据中获取：`travel.destination` 或 `travel.location` |
| `latitude` | number | 否 | 纬度（-90 到 90）。从当前活动的位置坐标获取：`slot.coordinates.lat` |
| `longitude` | number | 否 | 经度（-180 到 180）。从当前活动的位置坐标获取：`slot.coordinates.lng` |
| `type` | string | 否 | POI 类型：<br>- `attraction`（景点）<br>- `restaurant`（餐厅）<br>- `hotel`（酒店）<br>- `shopping`（购物）<br>- `all`（全部，默认）<br><br>**注意**：对于 `gas_station`、`ev_charging`、`rest_area`，前端会发送 `type: "all"`，后端需要根据 `query` 参数（"加油站"、"充电桩"、"休息站"）来过滤结果。 |
| `limit` | number | 否 | 返回数量限制（1-50，默认：20）。前端固定请求 `limit: 20` |

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

| 字段 | 类型 | 必填 | 说明 | 前端用途 |
|------|------|------|------|----------|
| `data` | array | 是 | POI 列表 | 直接使用，转换为前端格式 |
| `data[].id` | string | 是 | POI ID | 用于唯一标识 |
| `data[].name` | string | **是** | POI 名称 | **重要：必须提供，前端会显示在名称区域。如果为空，前端会使用"未知地点"作为默认值** |
| `data[].address` | string | **强烈建议** | 地址 | **重要：如果为空，前端会显示"地址未知"。前端会尝试使用 `description` 作为地址的备用值** |
| `data[].latitude` | number | 是 | 纬度 | 用于地图定位和距离计算 |
| `data[].longitude` | number | 是 | 经度 | 用于地图定位和距离计算 |
| `data[].type` | string | 是 | POI 类型 | 用于分类显示 |
| `data[].rating` | number | 否 | 评分（0-5） | 如果提供，前端会显示评分标签（⭐ 4.5） |
| `data[].imageUrl` | string | 否 | 图片URL | 如果提供，前端会显示POI照片 |
| `data[].description` | string | **强烈建议** | 描述/推荐理由 | **重要：如果 `address` 为空，前端会尝试使用 `description` 作为地址的备用值。如果为空，前端会使用"推荐前往"作为默认值** |
| `total` | number | 是 | 总数量 | 用于显示搜索结果统计 |

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
   - **如果提供了坐标**（`latitude` 和 `longitude`）：
     - 优先使用坐标搜索
     - 同时提供 `destination` 作为上下文
     - 搜索查询格式：`{query} near {destination} {latitude},{longitude}`
   - **如果只提供了目的地**（`destination`）：
     - 使用目的地名称搜索
     - 搜索查询格式：`{query} {destination}`
   - **否则**：
     - 使用查询关键词搜索
     - 搜索查询格式：`{query}`

3. **类型过滤**：
   - 可以指定 POI 类型进行过滤
   - 支持的类型：`attraction`（景点）、`restaurant`（餐厅）、`hotel`（酒店）、`shopping`（购物）、`all`（全部）
   - **特殊类型处理**：
     - 对于 `gas_station`、`ev_charging`、`rest_area`，前端会发送 `type: "all"`
     - 后端需要根据 `query` 参数（"加油站"、"充电桩"、"休息站"）来过滤结果
     - 后端会检查 POI 的 `name`、`type`、`description` 字段是否包含相关关键词

4. **数据完整性要求**：
   - **必须提供的字段**：`id`、`name`、`latitude`、`longitude`、`type`
   - **强烈建议提供的字段**：`address`、`description`
   - **可选但建议提供的字段**：`rating`、`imageUrl`
   - 如果 `name` 为空，后端会使用查询关键词或"未知地点"作为默认值
   - 如果 `address` 为空，前端会显示"地址未知"，并尝试使用 `description` 作为备用值

5. **结果处理**：
   - 如果 Travel Advisor API 未配置或返回错误，会返回空结果（`{ data: [], total: 0 }`）
   - 不会抛出错误，保证接口的稳定性
   - 如果搜索结果为空，前端会自动回退到 AI 搜索

6. **错误处理**：
   - **400 Bad Request**：参数验证失败，返回详细的验证错误信息
   - **其他错误**：返回空结果而不是抛出异常，保证用户体验的连续性

7. **用途**：
   - 在行程规划中搜索附近的景点、餐厅等
   - 前端 ExperienceDay 组件可以复用此接口
   - 帮助用户发现目的地的精彩地点

8. **缓存机制**：
   - ExternalService 内部实现了缓存机制
   - 相同查询的缓存时间约为 5 分钟

9. **前端数据转换**：
   - 前端会将后端返回的数据转换为多语言格式（中文、英文、本地语言）
   - 前端会处理字段缺失的情况，使用默认值保证显示正常

