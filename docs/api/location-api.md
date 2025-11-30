# 位置信息生成 API 文档

## 概述

位置信息生成接口用于获取活动的详细位置信息，包括地址、交通、开放时间、门票价格等。支持单个和批量生成。

**基础路径**: `/api/location` (注意：应用已设置全局前缀 `api`，控制器路径为 `location`)

**认证**: 需要 JWT Bearer Token

**缓存**: 位置信息会缓存 24 小时，相同活动+目的地+类型的请求会直接返回缓存结果

**AI生成策略**: 系统使用专业的旅行助手AI，根据活动名称、坐标与目的地生成高度匹配的地点详情。所有信息必须与【活动名称 + 目的地 + 坐标】完全一致，内容以"行动导向"为主，清晰说明"如何到达、怎么进入、怎么使用、需要注意什么"。

---

## 1. 生成单个活动位置信息

### 接口信息

- **URL**: `POST /api/location/generate`
- **认证**: 需要登录（JWT Bearer Token）
- **Content-Type**: `application/json`

### 请求参数

#### 请求体 (Request Body)

```typescript
interface GenerateLocationRequest {
  activityName: string;       // 活动名称，如 "铁力士峰云端漫步"
  destination: string;         // 目的地，如 "瑞士琉森"
  activityType: "attraction" | "meal" | "hotel" | "shopping" | "transport" | "ocean";
  coordinates: {
    lat: number;              // 纬度 (-90 到 90)
    lng: number;              // 经度 (-180 到 180)
    region?: string;          // 区域（可选），如 "市中心区域"
  };
}
```

#### 参数说明

| 参数 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `activityName` | string | 是 | 活动名称 | `"铁力士峰云端漫步"` |
| `destination` | string | 是 | 目的地 | `"瑞士琉森"` |
| `activityType` | string | 是 | 活动类型 | `"attraction"` |
| `coordinates.lat` | number | 是 | 纬度 (-90 到 90) | `46.7704` |
| `coordinates.lng` | number | 是 | 经度 (-180 到 180) | `8.4050` |
| `coordinates.region` | string | 否 | 区域描述 | `"市中心区域"` |

### 响应格式

#### 成功响应 (200 OK)

```typescript
interface GenerateLocationResponse {
  success: boolean;
  data: LocationInfo;
}

interface LocationInfo {
  chineseName: string;        // 中文名称（与活动内容精确匹配，不能泛泛）
  localName: string;          // 当地语言名称（如有官方多语言译名请全部补充）
  chineseAddress: string;      // 中文地址（包含门牌号、街道、行政区、邮编，若无门牌用最近公共建筑或官方入口）
  localAddress: string;       // 当地语言详细地址（格式同上）
  transportInfo: string;       // 详细交通信息（必须可执行）：地铁/轻轨（具体站名+出口+步行时间）、公交（线路号+下车站名）、自驾（停车场名称+费用+入口导航点）、步行路线（从最近地标/车站出发的具体指引）
  openingHours: string;       // 开放时间（按季节/节假日区分，包含最不拥挤时段、避暑/避雨建议）
  ticketPrice: string;         // 门票价格（详细说明：成人/儿童/老人价格，是否需预约、是否有免费时段、是否接受电子票）
  visitTips: string;          // 游览建议（以行动为主：怎么走、怎么拍、怎么体验，体力需求、携带物品、避坑提示）
  nearbyAttractions?: string; // 周边推荐（可选）：临近景点、服务点、便利店、洗手间、补给点
  contactInfo?: string;        // 联系方式（可选）：官方电话、邮箱、官网
  category: string;            // 景点类型（必须与活动类型匹配）
  rating: number;              // 评分 (1-5)
  visitDuration: string;      // 建议游览时长（分钟）
  bestTimeToVisit: string;     // 最佳游览时间（结合季节、天气、人群情况）
  accessibility?: string;      // 无障碍设施信息（可选）
  dressingTips?: string;       // 穿搭建议（可选）：温度范围、风雨情况、鞋子类型、保暖层级，室内/宗教场所的着装礼仪
  culturalTips?: string;       // 当地文化提示（可选）：小费习惯、排队礼仪、宗教禁忌、拍照限制，与该目的地相关的高频误区提醒
  bookingInfo?: string;        // 预订信息（可选，强执行性）：是否需要提前预约、推荐预订渠道（官网/APP/电话）、建议提前多久预订、是否有快速通道/免费取消等政策
}
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "chineseName": "铁力士峰云端漫步",
    "localName": "Titlis Cliff Walk",
    "chineseAddress": "Titlis Bergstation, 6390 Engelberg, Switzerland",
    "localAddress": "Titlis Bergstation, 6390 Engelberg, Switzerland",
    "transportInfo": "从琉森乘火车约45分钟至Engelberg站，然后乘坐缆车：Engelberg站→Trübsee站→Stand站→Titlis峰站，约30分钟。公共交通：Engelberg, Titlisbahn",
    "openingHours": "全年开放，夏季8:30-17:30，冬季8:30-16:30。恶劣天气可能临时关闭",
    "ticketPrice": "Cliff Walk约CHF 15（约¥120）。往返缆车票：成人CHF 89，儿童（6-15岁）CHF 44.5，家庭套餐（2成人+1儿童）CHF 178。持Swiss Travel Pass可享受50%折扣",
    "visitTips": "最佳游览时间：上午10点前避开人群，晴朗天气最佳。注意事项：海拔3020米需注意高原反应，穿防滑登山鞋和保暖衣物，恐高者谨慎。建议游览时长：2-3小时",
    "nearbyAttractions": "冰川公园、Ice Flyer缆车、旋转缆车体验",
    "contactInfo": "请查询官网或当地信息中心",
    "category": "景点",
    "rating": 4.8,
    "visitDuration": "2-3小时",
    "bestTimeToVisit": "上午10点前，晴朗天气",
    "accessibility": "请确认无障碍设施",
    "dressingTips": "建议穿着舒适的步行鞋和轻便外套，山区天气变化快，建议携带雨具。海拔3020米，需注意保暖，建议穿多层衣物便于调节",
    "culturalTips": "瑞士人注重准时，建议提前到达。进入缆车站需保持安静，不要大声喧哗。当地习惯给小费，建议准备零钱。注意当地禁忌和习俗",
    "bookingInfo": "建议提前预订，可通过官网或电话预约，旺季需提前1-2周预订。持Swiss Travel Pass可享受50%折扣，建议提前查询优惠政策"
  }
}
```

#### 错误响应

##### 400 Bad Request - 参数验证失败

```json
{
  "statusCode": 400,
  "message": [
    "activityName must be a string",
    "coordinates.lat must be a number",
    "coordinates.lat must not be less than -90"
  ],
  "error": "Bad Request"
}
```

##### 401 Unauthorized - 未认证

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

##### 500 Internal Server Error - 生成失败（会使用默认信息）

```json
{
  "statusCode": 500,
  "message": "位置信息生成失败，已使用默认信息"
}
```

### 请求示例

#### cURL

```bash
curl -X POST http://localhost:3000/api/location/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "activityName": "铁力士峰云端漫步",
    "destination": "瑞士琉森",
    "activityType": "attraction",
    "coordinates": {
      "lat": 46.7704,
      "lng": 8.4050,
      "region": "市中心区域"
    }
  }'
```

#### JavaScript (Fetch)

```javascript
const response = await fetch('http://localhost:3000/api/location/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    activityName: '铁力士峰云端漫步',
    destination: '瑞士琉森',
    activityType: 'attraction',
    coordinates: {
      lat: 46.7704,
      lng: 8.4050,
      region: '市中心区域'
    }
  })
});

const data = await response.json();
if (data.success) {
  console.log('位置信息:', data.data);
}
```

---

## 2. 批量生成活动位置信息（同步）

### 接口信息

- **URL**: `POST /api/location/generate-batch`
- **认证**: 需要登录（JWT Bearer Token）
- **Content-Type**: `application/json`
- **说明**: 同步接口，等待所有活动生成完成后返回结果。适用于少量活动（< 5个）的场景。

### 请求参数

#### 请求体 (Request Body)

```typescript
interface GenerateLocationBatchRequest {
  activities: BatchActivity[];
}

interface BatchActivity {
  activityName: string;
  destination: string;
  activityType: "attraction" | "meal" | "hotel" | "shopping" | "transport" | "ocean";
  coordinates: {
    lat: number;
    lng: number;
    region?: string;
  };
}
```

#### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `activities` | BatchActivity[] | 是 | 活动列表，最多建议 10 个 |

### 响应格式

#### 成功响应 (200 OK)

```typescript
interface GenerateLocationBatchResponse {
  success: boolean;
  data: BatchLocationResult[];
}

interface BatchLocationResult {
  activityName: string;       // 活动名称
  locationInfo: LocationInfo;  // 位置信息（同单个接口）
}
```

#### 响应示例

```json
{
  "success": true,
  "data": [
    {
      "activityName": "铁力士峰云端漫步",
      "locationInfo": {
        "chineseName": "铁力士峰云端漫步",
        "localName": "Titlis Cliff Walk",
        "chineseAddress": "Titlis Bergstation, 6390 Engelberg, Switzerland",
        "localAddress": "Titlis Bergstation, 6390 Engelberg, Switzerland",
        "transportInfo": "从琉森乘火车约45分钟至Engelberg站...",
        "openingHours": "全年开放，夏季8:30-17:30...",
        "ticketPrice": "Cliff Walk约CHF 15...",
        "visitTips": "最佳游览时间：上午10点前...",
        "category": "景点",
        "rating": 4.8,
        "visitDuration": "2-3小时",
        "bestTimeToVisit": "上午10点前，晴朗天气"
      }
    },
    {
      "activityName": "琉森湖游船",
      "locationInfo": {
        "chineseName": "琉森湖游船",
        "localName": "Lake Lucerne Cruise",
        "chineseAddress": "Luzern Bahnhofquai, 6002 Luzern, Switzerland",
        "localAddress": "Luzern Bahnhofquai, 6002 Luzern, Switzerland",
        "transportInfo": "位于琉森火车站附近，步行即可到达...",
        "openingHours": "全年运营，夏季班次更密集...",
        "ticketPrice": "成人票 CHF 45，儿童票 CHF 22.5...",
        "visitTips": "建议选择下午时段，光线柔和适合拍照...",
        "category": "景点",
        "rating": 4.6,
        "visitDuration": "1-2小时",
        "bestTimeToVisit": "下午时段"
      }
    }
  ]
}
```

### 请求示例

#### cURL

```bash
curl -X POST http://localhost:3000/api/location/generate-batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "activities": [
      {
        "activityName": "铁力士峰云端漫步",
        "destination": "瑞士琉森",
        "activityType": "attraction",
        "coordinates": {
          "lat": 46.7704,
          "lng": 8.4050
        }
      },
      {
        "activityName": "琉森湖游船",
        "destination": "瑞士琉森",
        "activityType": "attraction",
        "coordinates": {
          "lat": 47.0502,
          "lng": 8.3093
        }
      }
    ]
  }'
```

#### TypeScript (Axios)

```typescript
import axios from 'axios';

interface BatchActivity {
  activityName: string;
  destination: string;
  activityType: 'attraction' | 'meal' | 'hotel' | 'shopping' | 'transport' | 'ocean';
  coordinates: {
    lat: number;
    lng: number;
    region?: string;
  };
}

interface LocationInfo {
  chineseName: string;        // 中文名称（与活动内容精确匹配）
  localName: string;          // 当地语言名称
  chineseAddress: string;      // 中文地址（包含门牌号、街道、行政区、邮编）
  localAddress: string;       // 当地语言详细地址
  transportInfo: string;       // 详细交通信息（必须可执行）
  openingHours: string;       // 开放时间（按季节/节假日区分）
  ticketPrice: string;         // 门票价格（详细说明）
  visitTips: string;          // 游览建议（以行动为主）
  nearbyAttractions?: string; // 周边推荐
  contactInfo?: string;        // 联系方式
  category: string;            // 景点类型
  rating: number;              // 评分 (1-5)
  visitDuration: string;      // 建议游览时长
  bestTimeToVisit: string;     // 最佳游览时间
  accessibility?: string;      // 无障碍设施信息
  dressingTips?: string;       // 穿搭建议
  culturalTips?: string;       // 当地文化提示
  bookingInfo?: string;        // 预订信息（强执行性）
}

interface BatchLocationResult {
  activityName: string;
  locationInfo: LocationInfo;
}

async function generateLocationBatch(
  activities: BatchActivity[],
  token: string
): Promise<BatchLocationResult[]> {
  const response = await axios.post<{
    success: boolean;
    data: BatchLocationResult[];
  }>(
    'http://localhost:3000/api/location/generate-batch',
    { activities },
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  return response.data.data;
}

// 使用示例
const results = await generateLocationBatch([
  {
    activityName: '铁力士峰云端漫步',
    destination: '瑞士琉森',
    activityType: 'attraction',
    coordinates: { lat: 46.7704, lng: 8.4050 }
  },
  {
    activityName: '琉森湖游船',
    destination: '瑞士琉森',
    activityType: 'attraction',
    coordinates: { lat: 47.0502, lng: 8.3093 }
  }
], 'your-jwt-token');
```

### 活动类型说明

| 类型 | 说明 | 示例 |
|------|------|------|
| `attraction` | 景点/观光 | 博物馆、公园、古迹、地标 |
| `meal` | 餐饮 | 餐厅、咖啡厅、美食体验、小吃街 |
| `hotel` | 住宿 | 酒店、民宿、度假村、旅馆 |
| `shopping` | 购物 | 商场、市场、商店、商业街 |
| `transport` | 交通 | 车站、机场、港口、地铁站 |
| `ocean` | 海洋活动 | 浮潜、潜水、观鲸、海滩活动 |

### 缓存机制

- **缓存键**: `${activityName}-${destination}-${activityType}` (不区分大小写)
- **缓存时长**: 24 小时
- **缓存位置**: 服务器内存（服务重启后失效）
- **缓存命中**: 相同参数的请求会直接返回缓存结果，响应时间 < 10ms

### 默认信息回退

如果 AI 生成失败，系统会自动使用默认模板生成基础信息：

- 根据 `activityType` 使用对应的默认模板
- 确保始终返回有效的位置信息
- 默认信息包含基本的分类、开放时间、交通建议等

### 注意事项

1. **认证要求**: 所有请求必须携带有效的 JWT Token
2. **生成时间**: 
   - 单个请求: 2-5 秒（首次）或 < 10ms（缓存命中）
   - 批量请求: 每个活动 2-5 秒，建议前端显示进度
3. **批量限制**: 建议每次批量请求不超过 10 个活动
4. **坐标精度**: 坐标用于 AI 生成更准确的位置信息
5. **语言支持**: 根据目的地自动识别主要语言（如瑞士→德语+法语）

### AI生成要求

系统使用专业的旅行助手AI生成位置信息，遵循以下核心要求：

1. **信息一致性**: 所有地点信息（名称、地址、交通、开放时间等）必须与【活动名称 + 目的地 + 坐标】完全一致
2. **地址处理**: 若坐标在偏移区或无官方门牌号，会根据附近地标、建筑或官方登记点提供最接近的可识别地址
3. **行动导向**: 内容以"行动导向"为主，清晰说明"如何到达、怎么进入、怎么使用、需要注意什么"
4. **信息完整性**: 包含10个维度的详细信息：
   - 基本信息：中文名称、当地语言名称、具体街道地址
   - 交通信息：地铁/轻轨（具体站名+出口+步行时间）、公交（线路号+下车站名）、自驾（停车场名称+费用+入口导航点）、步行路线
   - 开放时间：按季节/节假日区分，包含最不拥挤时段、避暑/避雨建议
   - 价格信息：成人/儿童/老人价格，是否需预约、是否有免费时段、是否接受电子票
   - 游览建议：以行动为主，说明怎么走、怎么拍、怎么体验，体力需求、携带物品、避坑提示
   - 周边推荐：临近景点、服务点、便利店、洗手间、补给点
   - 联系方式：官方电话、邮箱、官网
   - **穿搭建议**：温度范围、风雨情况、鞋子类型、保暖层级，室内/宗教场所的着装礼仪
   - **文化提示**：小费习惯、排队礼仪、宗教禁忌、拍照限制，与该目的地相关的高频误区提醒
   - **预订信息**：是否需要提前预约、推荐预订渠道（官网/APP/电话）、建议提前多久预订、是否有快速通道/免费取消等政策
5. **真实性**: 所有信息必须真实、具体、无虚构感，拒绝泛泛而谈的描述

### 错误处理建议

```typescript
try {
  const response = await generateLocation(request, token);
  if (response.success) {
    // 处理成功响应
    displayLocationInfo(response.data);
  }
} catch (error) {
  if (error.response) {
    switch (error.response.status) {
      case 400:
        console.error('参数错误:', error.response.data.message);
        break;
      case 401:
        console.error('未认证，请重新登录');
        redirectToLogin();
        break;
      case 500:
        // 即使 AI 失败，也会返回默认信息
        console.warn('使用默认位置信息');
        break;
    }
  }
}
```

### 性能优化建议

1. **批量请求**: 多个活动时使用批量接口，减少请求次数
2. **缓存利用**: 相同活动的位置信息会被缓存，无需重复请求
3. **预加载**: 在用户浏览行程时，提前加载位置信息
4. **错误重试**: 网络错误时提供重试机制

---

## 3. 异步批量生成活动位置信息（推荐）

### 接口信息

- **URL**: `POST /api/location/generate-batch-async`
- **认证**: 需要登录（JWT Bearer Token）
- **Content-Type**: `application/json`
- **说明**: 异步接口，立即返回 `jobId`，不等待任务完成。适用于大量活动（> 5个）的场景，提供更好的用户体验。

### 请求参数

与同步批量接口相同：

```typescript
interface GenerateLocationBatchRequest {
  activities: BatchActivity[];
}
```

### 响应格式

#### 成功响应 (200 OK)

```typescript
interface EnqueueLocationGenerationResponse {
  success: boolean;
  jobId: string;  // 任务ID，用于查询状态和获取结果
}
```

#### 响应示例

```json
{
  "success": true,
  "jobId": "job-1234567890"
}
```

### 使用流程

1. **发起异步任务**：调用 `POST /api/location/generate-batch-async`，获取 `jobId`
2. **轮询任务状态**：定期调用 `GET /api/location/job/:jobId` 查询状态
3. **获取结果**：当状态为 `completed` 时，调用 `GET /api/location/job/:jobId/result` 获取结果

---

## 4. 查询任务状态

### 接口信息

- **URL**: `GET /api/location/job/:jobId`
- **认证**: 需要登录（JWT Bearer Token）

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `jobId` | string | 是 | 任务ID（从异步接口获取） |

### 响应格式

#### 成功响应 (200 OK)

```typescript
interface JobStatusResponse {
  success: boolean;
  data: {
    id: string;
    status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused' | 'not_found';
    progress?: number;  // 0-100
    result?: BatchLocationResult[];  // 仅在 completed 时存在
    error?: string;  // 仅在 failed 时存在
    data?: {
      activities: BatchActivity[];
    };
  };
}
```

#### 响应示例

**任务进行中**：

```json
{
  "success": true,
  "data": {
    "id": "job-1234567890",
    "status": "active",
    "progress": 45,
    "data": {
      "activities": [...]
    }
  }
}
```

**任务完成**：

```json
{
  "success": true,
  "data": {
    "id": "job-1234567890",
    "status": "completed",
    "progress": 100,
    "result": [
      {
        "activityName": "铁力士峰云端漫步",
        "locationInfo": { ... }
      }
    ]
  }
}
```

**任务失败**：

```json
{
  "success": true,
  "data": {
    "id": "job-1234567890",
    "status": "failed",
    "error": "任务执行失败：网络错误"
  }
}
```

---

## 5. 获取任务结果

### 接口信息

- **URL**: `GET /api/location/job/:jobId/result`
- **认证**: 需要登录（JWT Bearer Token）
- **说明**: 仅当任务状态为 `completed` 时可用

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `jobId` | string | 是 | 任务ID |

### 响应格式

#### 成功响应 (200 OK)

```typescript
interface GetJobResultResponse {
  success: boolean;
  data: BatchLocationResult[];
}
```

#### 响应示例

```json
{
  "success": true,
  "data": [
    {
      "activityName": "铁力士峰云端漫步",
      "locationInfo": {
        "chineseName": "铁力士峰云端漫步",
        "localName": "Titlis Cliff Walk",
        ...
      }
    }
  ]
}
```

#### 错误响应

**任务未完成** (400 Bad Request)：

```json
{
  "statusCode": 400,
  "message": "Job job-1234567890 is not completed (status: active)"
}
```

**任务不存在** (404 Not Found)：

```json
{
  "statusCode": 404,
  "message": "Job job-1234567890 not found"
}
```

### 前端集成示例

详细的前端集成指南请参考：[异步位置信息生成前端集成指南](../frontend/async-location-generation-integration.md)

**简单示例**：

```typescript
// 1. 发起异步任务
const { jobId } = await apiClient.post('/api/location/generate-batch-async', {
  activities: [...]
});

// 2. 轮询任务状态
const pollStatus = async () => {
  const response = await apiClient.get(`/api/location/job/${jobId}`);
  const { status, progress, result } = response.data.data;
  
  if (status === 'completed') {
    // 3. 获取结果（或直接使用 result）
    return result || await apiClient.get(`/api/location/job/${jobId}/result`);
  } else if (status === 'failed') {
    throw new Error(response.data.data.error);
  } else {
    // 继续轮询
    setTimeout(pollStatus, 2000);
  }
};
```

---

## 接口选择建议

| 场景 | 推荐接口 | 原因 |
|------|---------|------|
| 单个活动 | `POST /api/location/generate` | 快速响应，无需异步 |
| 少量活动（< 5个） | `POST /api/location/generate-batch` | 同步接口，简单直接 |
| 大量活动（> 5个） | `POST /api/location/generate-batch-async` | 异步接口，更好的用户体验 |
| 需要显示进度 | `POST /api/location/generate-batch-async` | 支持进度查询 |

---

## 缓存机制（已优化）

### Redis 持久化缓存

- **缓存键**: `location:${activityName}:${destination}:${activityType}` (不区分大小写)
- **缓存时长**: 
  - Redis 缓存：30 天（持久化）
  - 内存缓存：24 小时（快速访问）
- **缓存位置**: 
  - Redis（主要）：服务重启后仍然有效
  - 内存（辅助）：快速访问，服务重启后失效
- **缓存命中**: 相同参数的请求会直接返回缓存结果，响应时间 < 10ms

### 性能提升

- **首次生成**: 2-5 秒（调用 AI）
- **缓存命中**: < 10ms（从 Redis 或内存读取）
- **批量生成（20个活动）**: 
  - 优化前：~10 分钟（串行）
  - 优化后：~30 秒（并发 + 缓存）

---

## 相关接口

- [行程生成 API](./itinerary-api.md) - 生成包含位置坐标的行程
- [旅行摘要生成 API](./travel-summary-api.md) - 生成行程摘要
- [异步位置信息生成前端集成指南](../frontend/async-location-generation-integration.md) - 详细的前端集成指南

