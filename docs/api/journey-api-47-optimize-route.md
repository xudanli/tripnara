# 路线优化 API 接口文档

## 接口信息

- **路径**: `POST /api/v1/journeys/optimize-route`
- **功能**: 使用 TSP（旅行商问题）算法优化活动顺序，计算最短路径
- **说明**:
  - 使用 Mapbox Optimization API 进行路线优化
  - 支持驾车、步行、骑行三种交通方式
  - 支持固定起点和终点
  - 支持往返路线（回到起点）
  - 最多支持 12 个活动点（超过将只优化前 12 个）
- **认证方式**: Bearer Token (JWT)
- **Content-Type**: `application/json`

---

## 路径参数

无

---

## 请求体 (Request Body)

```json
{
  "activities": [
    {
      "id": "activity-1",
      "title": "琉森湖游船",
      "location": {
        "lat": 47.0502,
        "lng": 8.3093
      },
      "type": "attraction",
      "time": "09:00",
      "duration": 120
    },
    {
      "id": "activity-2",
      "title": "铁力士峰",
      "location": {
        "lat": 46.7704,
        "lng": 8.4050
      },
      "type": "attraction",
      "time": "14:00",
      "duration": 180
    }
  ],
  "profile": "driving",
  "roundtrip": false,
  "source": "first",
  "destination": "any"
}
```

### 请求字段说明

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `activities` | array | 是 | 活动列表（必须包含 location 坐标） | 见上方示例 |
| `activities[].id` | string | 否 | 活动ID | `"activity-1"` |
| `activities[].title` | string | 是 | 活动标题 | `"琉森湖游船"` |
| `activities[].location` | object | 是 | 活动坐标（必须包含 lat 和 lng） | `{ "lat": 47.0502, "lng": 8.3093 }` |
| `activities[].location.lat` | number | 是 | 纬度（-90 到 90） | `47.0502` |
| `activities[].location.lng` | number | 是 | 经度（-180 到 180） | `8.3093` |
| `activities[].type` | string | 否 | 活动类型 | `"attraction"` |
| `activities[].time` | string | 否 | 活动时间 | `"09:00"` |
| `activities[].duration` | number | 否 | 活动时长（分钟） | `120` |
| `profile` | string | 否 | 交通方式，默认 `driving` | `"driving"` / `"walking"` / `"cycling"` |
| `roundtrip` | boolean | 否 | 是否回到起点（往返路线），默认 `false` | `false` |
| `source` | string | 否 | 固定起点，默认 `first` | `"first"`（第一个活动）/ `"any"`（任意起点） |
| `destination` | string | 否 | 固定终点，默认 `any` | `"last"`（最后一个活动）/ `"any"`（任意终点） |

### 交通方式说明

| 值 | 说明 |
|----|------|
| `driving` | 驾车（默认） |
| `walking` | 步行 |
| `cycling` | 骑行 |

---

## 响应格式

### 成功响应 (200 OK)

```json
{
  "success": true,
  "activities": [
    {
      "id": "activity-2",
      "title": "铁力士峰",
      "location": {
        "lat": 46.7704,
        "lng": 8.4050
      },
      "type": "attraction",
      "time": "14:00",
      "duration": 180
    },
    {
      "id": "activity-1",
      "title": "琉森湖游船",
      "location": {
        "lat": 47.0502,
        "lng": 8.3093
      },
      "type": "attraction",
      "time": "09:00",
      "duration": 120
    }
  ],
  "totalDistance": 12500,
  "totalDuration": 1800,
  "routeGeometry": {
    "type": "LineString",
    "coordinates": [
      [8.3093, 47.0502],
      [8.4050, 46.7704]
    ]
  },
  "legs": [
    {
      "distance": 12500,
      "duration": 1800,
      "from": 0,
      "to": 1
    }
  ]
}
```

### 响应字段说明

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `success` | boolean | 是否成功 |
| `activities` | array | 优化后的活动列表（按最优路线排序） |
| `activities[].id` | string | 活动ID |
| `activities[].title` | string | 活动标题 |
| `activities[].location` | object | 活动坐标 |
| `activities[].location.lat` | number | 纬度 |
| `activities[].location.lng` | number | 经度 |
| `totalDistance` | number | 总距离（米） |
| `totalDuration` | number | 总时长（秒） |
| `routeGeometry` | object | 路线几何形状（GeoJSON LineString），可选 |
| `routeGeometry.type` | string | 几何类型，通常为 `"LineString"` |
| `routeGeometry.coordinates` | array | 路线坐标点数组 `[[lng, lat], ...]` |
| `legs` | array | 路线分段信息，可选 |
| `legs[].distance` | number | 分段距离（米） |
| `legs[].duration` | number | 分段时长（秒） |
| `legs[].from` | number | 起点索引（原始活动数组中的索引） |
| `legs[].to` | number | 终点索引（原始活动数组中的索引） |

---

## 错误响应

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 400 Bad Request - 参数验证失败

```json
{
  "statusCode": 400,
  "message": [
    "activities must be an array",
    "activities[0].location.lat must be a number"
  ],
  "error": "Bad Request"
}
```

### 400 Bad Request - 活动列表为空

```json
{
  "statusCode": 400,
  "message": "活动列表不能为空",
  "error": "Bad Request"
}
```

### 400 Bad Request - 缺少坐标

```json
{
  "statusCode": 400,
  "message": "以下活动缺少坐标：琉森湖游船, 铁力士峰",
  "error": "Bad Request"
}
```

### 400 Bad Request - Mapbox Token 未配置

```json
{
  "statusCode": 400,
  "message": "MAPBOX_ACCESS_TOKEN 未配置，无法进行路线优化",
  "error": "Bad Request"
}
```

### 400 Bad Request - 路线优化失败

```json
{
  "statusCode": 400,
  "message": "路线优化失败: NoRoute",
  "error": "Bad Request"
}
```

---

## 请求示例

### JavaScript (fetch)

```javascript
const activities = [
  {
    id: 'activity-1',
    title: '琉森湖游船',
    location: { lat: 47.0502, lng: 8.3093 },
    type: 'attraction',
    time: '09:00',
    duration: 120,
  },
  {
    id: 'activity-2',
    title: '铁力士峰',
    location: { lat: 46.7704, lng: 8.4050 },
    type: 'attraction',
    time: '14:00',
    duration: 180,
  },
];

async function optimizeRoute() {
  try {
    const response = await fetch('/api/v1/journeys/optimize-route', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer YOUR_JWT_TOKEN',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        activities,
        profile: 'driving',
        roundtrip: false,
        source: 'first',
        destination: 'any',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error optimizing route:', errorData);
      return;
    }

    const result = await response.json();
    console.log('Optimized activities:', result.activities);
    console.log('Total distance:', result.totalDistance, 'meters');
    console.log('Total duration:', result.totalDuration, 'seconds');
  } catch (error) {
    console.error('Network or unexpected error:', error);
  }
}

optimizeRoute();
```

### cURL

```bash
curl -X POST 'https://api.example.com/api/v1/journeys/optimize-route' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "activities": [
      {
        "id": "activity-1",
        "title": "琉森湖游船",
        "location": {
          "lat": 47.0502,
          "lng": 8.3093
        },
        "type": "attraction",
        "time": "09:00",
        "duration": 120
      },
      {
        "id": "activity-2",
        "title": "铁力士峰",
        "location": {
          "lat": 46.7704,
          "lng": 8.4050
        },
        "type": "attraction",
        "time": "14:00",
        "duration": 180
      }
    ],
    "profile": "driving",
    "roundtrip": false,
    "source": "first",
    "destination": "any"
  }'
```

---

## 注意事项

1. **认证**: 此接口需要有效的 JWT Bearer Token 进行认证。

2. **活动数量限制**:
   - Mapbox Optimization API 最多支持 **12 个活动点**
   - 如果超过 12 个，系统会自动只优化前 12 个，并记录警告日志

3. **坐标要求**:
   - 所有活动必须包含有效的 `location` 坐标（`lat` 和 `lng`）
   - 坐标使用 WGS84 坐标系（GPS 坐标）
   - 纬度范围：-90 到 90
   - 经度范围：-180 到 180

4. **降级策略**:
   - 如果路线优化失败（API 错误、网络问题等），系统会返回原始顺序的活动列表
   - 总距离和总时长会返回 0

5. **交通方式**:
   - `driving`: 考虑道路和交通状况
   - `walking`: 步行路线
   - `cycling`: 骑行路线（考虑自行车道）

6. **起点和终点**:
   - `source: "first"`: 固定第一个活动为起点（通常用于酒店出发）
   - `source: "any"`: 任意起点，算法自动选择最优起点
   - `destination: "last"`: 固定最后一个活动为终点
   - `destination: "any"`: 任意终点，算法自动选择最优终点

7. **往返路线**:
   - `roundtrip: true`: 路线会回到起点（形成闭环）
   - `roundtrip: false`: 路线不回到起点（默认）

8. **Mapbox 配置**:
   - 需要配置 `MAPBOX_ACCESS_TOKEN` 环境变量
   - 需要配置 `MAPBOX_BASE_URL` 环境变量（可选，默认为 `https://api.mapbox.com`）

---

## 使用场景

1. **行程优化**: 在生成行程后，优化一天内多个景点的游览顺序
2. **路线规划**: 计算多个地点之间的最短路径
3. **时间估算**: 获取总距离和总时长，用于行程时间安排
4. **地图展示**: 使用 `routeGeometry` 在地图上绘制优化后的路线

---

## 相关接口

- [生成旅行行程](./journey-api-00-generate.md) - `POST /api/v1/journeys/generate`
- [创建行程](./journey-api-02-create.md) - `POST /api/v1/journeys`
- [交通路线查询](./journey-api-30-transport-insights.md) - `POST /api/v1/transport/insights`

---

## 技术实现

- **算法**: TSP（旅行商问题）求解
- **API**: Mapbox Optimization API
- **优化目标**: 最短路径（考虑交通方式和实时交通状况）
- **时间复杂度**: O(n²) 到 O(n!)（取决于活动数量）

