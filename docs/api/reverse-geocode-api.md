# Mapbox 反向地理编码 API 文档

## 概述

Mapbox 反向地理编码接口用于根据经纬度获取国家/省州/城市标签，优先用于灵感详情页的地点展示。

**基础路径**: `/api/destination` (注意：应用已设置全局前缀 `api`，控制器路径为 `destination`)

**认证**: 不需要（公开接口）

**后端调用**: `GET https://api.mapbox.com/geocoding/v5/mapbox.places/{lng},{lat}.json`

---

## 反向地理编码接口

### 接口信息

- **URL**: `GET /api/destination/reverse-geocode`
- **认证**: 不需要
- **Content-Type**: `application/json`

### 请求参数

#### 查询参数 (Query Parameters)

| 参数 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `lng` | number | 是 | 经度（-180 到 180） | `8.4050` |
| `lat` | number | 是 | 纬度（-90 到 90） | `46.7704` |
| `language` | string | 否 | 首选语言代码（默认 `zh-CN`） | `zh-CN` |
| `limit` | number | 否 | 返回结果的数量限制（默认 1，最大 5） | `1` |

### 响应格式

#### 成功响应 (200 OK)

```json
{
  "data": {
    "name": "Engelberg, Switzerland",
    "fullAddress": "Engelberg, Obwalden, Switzerland",
    "country": "Switzerland",
    "countryCode": "CH",
    "region": "Obwalden",
    "regionCode": "OW",
    "city": "Engelberg",
    "placeType": "place",
    "latitude": 46.7704,
    "longitude": 8.4050
  }
}
```

#### 响应字段说明

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `data.name` | string | 地点名称 | `"Engelberg, Switzerland"` |
| `data.fullAddress` | string | 完整地址 | `"Engelberg, Obwalden, Switzerland"` |
| `data.country` | string | 国家名称（可选） | `"Switzerland"` |
| `data.countryCode` | string | 国家代码（可选） | `"CH"` |
| `data.region` | string | 省/州名称（可选） | `"Obwalden"` |
| `data.regionCode` | string | 省/州代码（可选） | `"OW"` |
| `data.city` | string | 城市名称（可选） | `"Engelberg"` |
| `data.placeType` | string | 地区类型 | `"place"` |
| `data.latitude` | number | 纬度 | `46.7704` |
| `data.longitude` | number | 经度 | `8.4050` |

### 请求示例

#### cURL

```bash
curl -X GET "http://localhost:3000/api/destination/reverse-geocode?lng=8.4050&lat=46.7704&language=zh-CN" \
  -H "Content-Type: application/json"
```

#### JavaScript (Fetch)

```javascript
async function reverseGeocode(lng, lat, language = 'zh-CN') {
  const params = new URLSearchParams({
    lng: lng.toString(),
    lat: lat.toString(),
    language,
  });

  const response = await fetch(
    `http://localhost:3000/api/destination/reverse-geocode?${params}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('反向地理编码失败');
  }

  const result = await response.json();
  return result.data;
}

// 使用示例
try {
  const location = await reverseGeocode(8.4050, 46.7704, 'zh-CN');
  console.log('国家:', location.country); // Switzerland
  console.log('省州:', location.region); // Obwalden
  console.log('城市:', location.city); // Engelberg
  console.log('完整地址:', location.fullAddress); // Engelberg, Obwalden, Switzerland
} catch (error) {
  console.error('错误:', error.message);
}
```

#### TypeScript (Axios)

```typescript
import axios from 'axios';

interface ReverseGeocodeLocation {
  name: string;
  fullAddress: string;
  country?: string;
  countryCode?: string;
  region?: string;
  regionCode?: string;
  city?: string;
  placeType?: string;
  latitude: number;
  longitude: number;
}

interface ReverseGeocodeResponse {
  data: ReverseGeocodeLocation;
}

async function reverseGeocode(
  lng: number,
  lat: number,
  language: string = 'zh-CN'
): Promise<ReverseGeocodeLocation> {
  const response = await axios.get<ReverseGeocodeResponse>(
    'http://localhost:3000/api/destination/reverse-geocode',
    {
      params: {
        lng,
        lat,
        language,
      },
    }
  );

  return response.data.data;
}

// 使用示例
const location = await reverseGeocode(8.4050, 46.7704, 'zh-CN');
console.log('地点信息:', location);
```

### 错误处理

#### 错误响应格式

```json
{
  "statusCode": 400,
  "message": "MAPBOX_ACCESS_TOKEN 未配置，无法调用地理编码服务",
  "error": "Bad Request"
}
```

#### 常见错误

| 状态码 | 错误信息 | 说明 |
|--------|---------|------|
| 400 | `MAPBOX_ACCESS_TOKEN 未配置` | 后端未配置 Mapbox Access Token |
| 404 | `未找到匹配的地点信息` | Mapbox API 返回空结果 |
| 502 | `调用反向地理编码服务失败` | Mapbox API 调用失败 |

### 使用场景

1. **灵感详情页地点展示**：根据行程活动的经纬度坐标，显示国家/省州/城市标签
2. **地图标记标签**：在地图上显示地点时，显示层级化的地址信息
3. **地点信息补全**：当只有经纬度坐标时，获取完整的地点层级信息

### 前端对接建议

1. **错误处理**：当获取失败时，可以使用默认值或降级显示（例如只显示经纬度）
2. **缓存**：相同经纬度的请求可以本地缓存，避免重复请求
3. **精度**：对于相同地点，可以适当降低精度（例如只保留2位小数）来减少缓存键的数量
4. **语言**：根据用户语言偏好设置 `language` 参数

### 示例：在灵感详情页使用

```typescript
// 根据活动坐标获取地点标签
async function getLocationLabel(activity: { lat: number; lng: number }) {
  try {
    const location = await reverseGeocode(activity.lng, activity.lat, 'zh-CN');
    
    // 构建显示标签
    const labels: string[] = [];
    if (location.city) labels.push(location.city);
    if (location.region) labels.push(location.region);
    if (location.country) labels.push(location.country);
    
    return labels.join(', ') || location.fullAddress;
  } catch (error) {
    // 降级显示
    return `${activity.lat.toFixed(4)}, ${activity.lng.toFixed(4)}`;
  }
}
```

