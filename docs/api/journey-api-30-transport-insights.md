# 行程接口文档 - 30. 交通规划

## 接口信息

**接口路径：** `POST /api/v1/transport/insights`

**接口描述：** 根据起点、终点和交通方式获取交通规划信息（origin/destination/mode）

**认证：** 不需要认证（公开接口）

**Content-Type：** `application/json`

---

## 请求参数

### 请求体结构

```json
{
  "origin": {
    "latitude": 46.7704,
    "longitude": 8.4050
  },
  "destination": {
    "latitude": 46.5197,
    "longitude": 6.6323
  },
  "mode": "driving"
}
```

### 字段说明

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `origin` | object | 是 | 起点坐标 |
| `origin.latitude` | number | 是 | 起点纬度（-90 到 90） |
| `origin.longitude` | number | 是 | 起点经度（-180 到 180） |
| `destination` | object | 是 | 终点坐标 |
| `destination.latitude` | number | 是 | 终点纬度（-90 到 90） |
| `destination.longitude` | number | 是 | 终点经度（-180 到 180） |
| `mode` | string | 否 | 交通方式：`driving`、`driving-traffic`、`walking`、`cycling`、`transit`（默认：`driving`） |

---

## 请求示例

### cURL

```bash
curl -X POST "http://localhost:3000/api/v1/transport/insights" \
  -H "Content-Type: application/json" \
  -d '{
    "origin": {
      "latitude": 46.7704,
      "longitude": 8.4050
    },
    "destination": {
      "latitude": 46.5197,
      "longitude": 6.6323
    },
    "mode": "driving"
  }'
```

---

## 响应数据

### 成功响应（200 OK）

```json
{
  "options": [
    {
      "mode": "driving",
      "durationMinutes": 45,
      "distanceKm": 62.5
    },
    {
      "mode": "driving-traffic",
      "durationMinutes": 52,
      "distanceKm": 62.5
    }
  ]
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `options` | array | 交通方案列表（最多3个） |
| `options[].mode` | string | 交通方式 |
| `options[].durationMinutes` | number | 预计时长（分钟） |
| `options[].distanceKm` | number | 距离（公里） |

---

## 错误响应

### 400 Bad Request - 参数验证失败

```json
{
  "statusCode": 400,
  "message": [
    "origin.latitude must be a number",
    "origin.longitude must be a number"
  ],
  "error": "Bad Request"
}
```

### 500 Internal Server Error - Mapbox Token 未配置

```json
{
  "statusCode": 500,
  "message": "MAPBOX_ACCESS_TOKEN 未配置，无法计算交通方案",
  "error": "Internal Server Error"
}
```

---

## 使用示例

### JavaScript/TypeScript

```typescript
const transportRequest = {
  origin: {
    latitude: 46.7704,
    longitude: 8.4050,
  },
  destination: {
    latitude: 46.5197,
    longitude: 6.6323,
  },
  mode: 'driving',
};

const response = await fetch('/api/v1/transport/insights', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(transportRequest),
});

const result = await response.json();
console.log('交通方案:', result.options);

// 遍历方案
result.options.forEach((option) => {
  console.log(`${option.mode}: ${option.durationMinutes} 分钟, ${option.distanceKm} 公里`);
});
```

---

## 注意事项

1. **数据来源**：
   - 交通数据来自 Mapbox Directions API
   - 需要配置 `MAPBOX_ACCESS_TOKEN` 环境变量

2. **交通方式**：
   - `driving`：驾车（默认）
   - `driving-traffic`：驾车（考虑实时交通）
   - `walking`：步行
   - `cycling`：骑行
   - `transit`：公共交通

3. **返回结果**：
   - 最多返回 3 个交通方案
   - 按时长排序（最短的在前）

4. **坐标格式**：
   - 使用 WGS84 坐标系（GPS 坐标）
   - 纬度范围：-90 到 90
   - 经度范围：-180 到 180

5. **用途**：
   - 在行程规划中计算两点之间的交通时间和距离
   - 帮助用户选择最佳的交通方式
   - 用于优化行程安排

