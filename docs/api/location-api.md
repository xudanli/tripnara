# 位置信息 API 接口文档

## 基础信息

- **Base URL**: `/api/location`
- **认证方式**: Bearer Token (JWT)
- **Content-Type**: `application/json`

---

## 接口列表

1. [生成单个活动的位置信息](#1-生成单个活动的位置信息)
2. [批量生成活动位置信息（同步）](#2-批量生成活动位置信息同步)
3. [异步批量生成活动位置信息](#3-异步批量生成活动位置信息)
4. [查询位置信息生成任务状态](#4-查询位置信息生成任务状态)
5. [获取任务结果](#5-获取任务结果)
6. [查询已存储的位置信息](#6-查询已存储的位置信息)
7. [搜索位置信息](#7-搜索位置信息)
8. [根据ID查询位置信息](#8-根据id查询位置信息)

---

## 1. 生成单个活动的位置信息

### 接口信息

- **路径**: `POST /location/generate`
- **功能**: 生成或获取单个活动的位置详细信息
- **说明**: 
  - 优先从数据库查询已存储的位置信息
  - 如果不存在，则从缓存查询
  - 如果缓存也没有，则调用AI生成新的位置信息
  - 生成后自动保存到数据库和缓存

### 请求参数

**请求体 (JSON)**:

```json
{
  "activityName": "铁力士峰云端漫步",
  "destination": "瑞士琉森",
  "activityType": "attraction",
  "coordinates": {
    "lat": 46.7704,
    "lng": 8.4050,
    "region": "市中心区域"
  }
}
```

**参数说明**:

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| activityName | string | 是 | 活动名称 | "铁力士峰云端漫步" |
| destination | string | 是 | 目的地 | "瑞士琉森" |
| activityType | string | 是 | 活动类型，枚举值：`attraction`、`meal`、`hotel`、`shopping`、`transport`、`ocean` | "attraction" |
| coordinates | object | 是 | 坐标信息 | - |
| coordinates.lat | number | 是 | 纬度，范围：-90 到 90 | 46.7704 |
| coordinates.lng | number | 是 | 经度，范围：-180 到 180 | 8.4050 |
| coordinates.region | string | 否 | 区域名称 | "市中心区域" |

### 响应格式

**成功响应 (200)**:

```json
{
  "success": true,
  "data": {
    "chineseName": "铁力士峰云端漫步",
    "localName": "Titlis Cliff Walk",
    "chineseAddress": "Titlis Bergstation, 6390 Engelberg, Switzerland",
    "localAddress": "Titlis Bergstation, 6390 Engelberg, Switzerland",
    "transportInfo": "从琉森乘火车约45分钟至Engelberg站，然后转乘缆车上山",
    "openingHours": "全年开放，夏季8:30-17:30，冬季8:30-16:30",
    "ticketPrice": "Cliff Walk约CHF 15（约¥120），包含缆车往返",
    "visitTips": "最佳游览时间：上午10点前避开人群；注意保暖，山顶温度较低",
    "nearbyAttractions": "冰川公园、Ice Flyer缆车、旋转缆车体验",
    "contactInfo": "https://www.titlis.ch",
    "category": "景点",
    "rating": 4.8,
    "visitDuration": "2-3小时",
    "bestTimeToVisit": "上午10点前，晴朗天气",
    "accessibility": "缆车和观景台提供无障碍设施",
    "dressingTips": "建议穿着舒适的步行鞋和轻便外套，山区天气变化快，建议携带雨具",
    "culturalTips": "注意当地天气变化，遵守安全规定",
    "bookingInfo": "建议提前预订，可通过官网或电话预约，旺季需提前1-2周预订"
  }
}
```

**响应字段说明**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| success | boolean | 是否成功 |
| data | object | 位置信息对象 |
| data.chineseName | string | 中文名称 |
| data.localName | string | 当地语言名称 |
| data.chineseAddress | string | 中文地址 |
| data.localAddress | string | 当地语言地址 |
| data.transportInfo | string | 交通信息 |
| data.openingHours | string | 开放时间 |
| data.ticketPrice | string | 门票价格 |
| data.visitTips | string | 游览建议 |
| data.nearbyAttractions | string | 周边推荐（可选） |
| data.contactInfo | string | 联系方式（可选） |
| data.category | string | 景点类型 |
| data.rating | number | 评分（1-5） |
| data.visitDuration | string | 建议游览时长 |
| data.bestTimeToVisit | string | 最佳游览时间 |
| data.accessibility | string | 无障碍设施信息（可选） |
| data.dressingTips | string | 穿搭建议（可选） |
| data.culturalTips | string | 当地文化提示（可选） |
| data.bookingInfo | string | 预订信息（可选） |

### 错误响应

**401 Unauthorized**:
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**400 Bad Request** (参数验证失败):
```json
{
  "statusCode": 400,
  "message": ["activityName must be a string", "coordinates.lat must be a number"]
}
```

### 请求示例

**JavaScript (fetch)**:
```javascript
const response = await fetch('/api/location/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
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

const result = await response.json();
console.log(result);
```

**cURL**:
```bash
curl -X POST 'https://api.example.com/api/location/generate' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
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

---

## 2. 批量生成活动位置信息（同步）

### 接口信息

- **路径**: `POST /location/generate-batch`
- **功能**: 批量生成多个活动的位置信息（同步方式）
- **说明**: 
  - 同步处理所有活动，等待所有结果返回
  - 并发处理，性能优于串行处理
  - 单个活动失败不影响其他活动
  - 失败的活动会使用默认信息

### 请求参数

**请求体 (JSON)**:

```json
{
  "activities": [
    {
      "activityName": "铁力士峰云端漫步",
      "destination": "瑞士琉森",
      "activityType": "attraction",
      "coordinates": {
        "lat": 46.7704,
        "lng": 8.4050,
        "region": "市中心区域"
      }
    },
    {
      "activityName": "琉森湖游船",
      "destination": "瑞士琉森",
      "activityType": "attraction",
      "coordinates": {
        "lat": 47.0502,
        "lng": 8.3093,
        "region": "琉森湖"
      }
    }
  ]
}
```

**参数说明**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| activities | array | 是 | 活动列表 |
| activities[].activityName | string | 是 | 活动名称 |
| activities[].destination | string | 是 | 目的地 |
| activities[].activityType | string | 是 | 活动类型 |
| activities[].coordinates | object | 是 | 坐标信息 |

### 响应格式

**成功响应 (200)**:

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
        "openingHours": "全年开放，夏季8:30-17:30，冬季8:30-16:30",
        "ticketPrice": "Cliff Walk约CHF 15（约¥120）...",
        "visitTips": "最佳游览时间：上午10点前避开人群...",
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
        "chineseAddress": "Lucerne Harbor, 6002 Lucerne, Switzerland",
        "localAddress": "Lucerne Harbor, 6002 Lucerne, Switzerland",
        "transportInfo": "位于琉森市中心码头...",
        "openingHours": "全年开放，夏季班次更频繁",
        "ticketPrice": "成人票约CHF 30-50...",
        "visitTips": "建议选择天气晴朗的日子...",
        "category": "景点",
        "rating": 4.5,
        "visitDuration": "1-2小时",
        "bestTimeToVisit": "下午，避开正午强光"
      }
    }
  ]
}
```

**响应字段说明**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| success | boolean | 是否成功 |
| data | array | 结果列表 |
| data[].activityName | string | 活动名称 |
| data[].locationInfo | object | 位置信息对象（结构同接口1） |

### 错误响应

**401 Unauthorized**:
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**400 Bad Request** (参数验证失败):
```json
{
  "statusCode": 400,
  "message": ["activities must be an array"]
}
```

### 请求示例

**JavaScript (fetch)**:
```javascript
const response = await fetch('/api/location/generate-batch', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  },
  body: JSON.stringify({
    activities: [
      {
        activityName: '铁力士峰云端漫步',
        destination: '瑞士琉森',
        activityType: 'attraction',
        coordinates: {
          lat: 46.7704,
          lng: 8.4050,
          region: '市中心区域'
        }
      },
      {
        activityName: '琉森湖游船',
        destination: '瑞士琉森',
        activityType: 'attraction',
        coordinates: {
          lat: 47.0502,
          lng: 8.3093,
          region: '琉森湖'
        }
      }
    ]
  })
});

const result = await response.json();
console.log(result);
```

**cURL**:
```bash
curl -X POST 'https://api.example.com/api/location/generate-batch' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -d '{
    "activities": [
      {
        "activityName": "铁力士峰云端漫步",
        "destination": "瑞士琉森",
        "activityType": "attraction",
        "coordinates": {
          "lat": 46.7704,
          "lng": 8.4050,
          "region": "市中心区域"
        }
      }
    ]
  }'
```

**注意事项**:
- 批量处理可能需要较长时间，建议活动数量不超过20个
- 如果活动数量较多，建议使用异步接口（接口3）
- 单个活动失败不会影响其他活动，失败的活动会返回默认信息

---

## 3. 异步批量生成活动位置信息

### 接口信息

- **路径**: `POST /location/generate-batch-async`
- **功能**: 异步批量生成多个活动的位置信息
- **说明**: 
  - 将任务加入队列，立即返回 jobId
  - 前端可以通过轮询或 WebSocket 获取任务状态和结果
  - 适合处理大量活动（20个以上）
  - 如果队列服务不可用，建议使用同步接口（接口2）

### 请求参数

**请求体 (JSON)**:

```json
{
  "activities": [
      {
        "activityName": "铁力士峰云端漫步",
      "destination": "瑞士琉森",
      "activityType": "attraction",
      "coordinates": {
        "lat": 46.7704,
        "lng": 8.4050,
        "region": "市中心区域"
        }
      },
      {
        "activityName": "琉森湖游船",
        "destination": "瑞士琉森",
        "activityType": "attraction",
        "coordinates": {
          "lat": 47.0502,
        "lng": 8.3093,
        "region": "琉森湖"
      }
    }
  ]
}
```

**参数说明**: 同接口2

### 响应格式

**成功响应 (200)**:

```json
{
  "success": true,
  "jobId": "job-abc123def456"
}
```

**响应字段说明**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| success | boolean | 是否成功 |
| jobId | string | 任务ID，用于查询任务状态和结果 |

### 错误响应

**401 Unauthorized**:
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**500 Internal Server Error** (队列服务不可用):
```json
{
  "statusCode": 500,
  "message": "Queue service unavailable"
}
```

### 请求示例

**JavaScript (fetch)**:
```javascript
// 1. 提交任务
const response = await fetch('/api/location/generate-batch-async', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  },
  body: JSON.stringify({
    activities: [
      {
        activityName: '铁力士峰云端漫步',
        destination: '瑞士琉森',
        activityType: 'attraction',
        coordinates: {
          lat: 46.7704,
          lng: 8.4050,
          region: '市中心区域'
        }
      }
    ]
  })
});

const { jobId } = await response.json();
console.log('Job ID:', jobId);

// 2. 轮询任务状态
const pollJobStatus = async (jobId) => {
  const statusResponse = await fetch(`/api/location/job/${jobId}`, {
      headers: {
      'Authorization': 'Bearer YOUR_JWT_TOKEN'
    }
  });
  const status = await statusResponse.json();
  return status.data;
};

// 3. 等待任务完成
const checkJob = async () => {
  const status = await pollJobStatus(jobId);
  
  if (status.status === 'completed') {
    // 获取结果
    const resultResponse = await fetch(`/api/location/job/${jobId}/result`, {
      headers: {
        'Authorization': 'Bearer YOUR_JWT_TOKEN'
      }
    });
    const result = await resultResponse.json();
    console.log('Result:', result.data);
  } else if (status.status === 'failed') {
    console.error('Job failed:', status.error);
  } else {
    // 继续轮询
    setTimeout(checkJob, 2000); // 每2秒轮询一次
  }
};

checkJob();
```

**cURL**:
```bash
# 提交任务
curl -X POST 'https://api.example.com/api/location/generate-batch-async' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -d '{
    "activities": [
      {
        "activityName": "铁力士峰云端漫步",
        "destination": "瑞士琉森",
        "activityType": "attraction",
        "coordinates": {
          "lat": 46.7704,
          "lng": 8.4050,
          "region": "市中心区域"
        }
      }
    ]
  }'

# 查询任务状态
curl -X GET 'https://api.example.com/api/location/job/job-abc123def456' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'

# 获取任务结果
curl -X GET 'https://api.example.com/api/location/job/job-abc123def456/result' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

**注意事项**:
- 任务状态包括：`waiting`（等待中）、`active`（进行中）、`completed`（已完成）、`failed`（失败）
- 建议轮询间隔为 2-5 秒
- 任务完成后，结果会保留一段时间，建议及时获取
- 如果队列服务不可用，接口会返回错误，建议降级到同步接口

---

## 4. 查询位置信息生成任务状态

### 接口信息

- **路径**: `GET /location/job/:jobId`
- **功能**: 查询异步任务的状态和进度
- **说明**: 用于轮询异步任务的状态，获取任务进度和结果

### 请求参数

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| jobId | string | 是 | 任务ID（从接口3获取） |

### 响应格式

**成功响应 (200)**:

```json
{
  "success": true,
  "data": {
    "id": "job-abc123def456",
    "status": "completed",
    "progress": 100,
    "result": [
      {
        "activityName": "铁力士峰云端漫步",
        "locationInfo": {
          "chineseName": "铁力士峰云端漫步",
          "localName": "Titlis Cliff Walk",
          "chineseAddress": "Titlis Bergstation, 6390 Engelberg, Switzerland",
          "localAddress": "Titlis Bergstation, 6390 Engelberg, Switzerland",
          "transportInfo": "从琉森乘火车约45分钟至Engelberg站...",
          "openingHours": "全年开放，夏季8:30-17:30，冬季8:30-16:30",
          "ticketPrice": "Cliff Walk约CHF 15（约¥120）...",
          "visitTips": "最佳游览时间：上午10点前避开人群...",
          "category": "景点",
          "rating": 4.8,
          "visitDuration": "2-3小时",
          "bestTimeToVisit": "上午10点前，晴朗天气"
        }
      }
    ],
    "error": null,
    "data": {
      "activities": [
        {
          "activityName": "铁力士峰云端漫步",
          "destination": "瑞士琉森",
          "activityType": "attraction",
          "coordinates": {
            "lat": 46.7704,
            "lng": 8.4050,
            "region": "市中心区域"
          }
        }
      ]
    }
  }
}
```

**响应字段说明**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| success | boolean | 是否成功 |
| data | object | 任务状态信息 |
| data.id | string | 任务ID |
| data.status | string | 任务状态：`waiting`（等待中）、`active`（进行中）、`completed`（已完成）、`failed`（失败）、`delayed`（延迟）、`paused`（暂停）、`not_found`（未找到） |
| data.progress | number | 任务进度（0-100），可选 |
| data.result | array | 任务结果（仅当状态为 `completed` 时存在），结构同接口2的响应 |
| data.error | string | 错误信息（仅当状态为 `failed` 时存在） |
| data.data | object | 任务原始数据 |

### 错误响应

**401 Unauthorized**:
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**404 Not Found** (任务不存在):
```json
{
  "success": true,
  "data": {
    "id": "job-abc123def456",
    "status": "not_found"
  }
}
```

### 请求示例

**JavaScript (fetch)**:
```javascript
const response = await fetch('/api/location/job/job-abc123def456', {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
});

const result = await response.json();
console.log('Job status:', result.data.status);
console.log('Progress:', result.data.progress);
```

**cURL**:
```bash
curl -X GET 'https://api.example.com/api/location/job/job-abc123def456' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

**轮询示例**:
```javascript
// 轮询任务状态直到完成
async function pollJobStatus(jobId, maxAttempts = 60, interval = 2000) {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(`/api/location/job/${jobId}`, {
      headers: {
        'Authorization': 'Bearer YOUR_JWT_TOKEN'
      }
    });
    
    const { data } = await response.json();
    
    if (data.status === 'completed') {
      return data;
    } else if (data.status === 'failed') {
      throw new Error(`Job failed: ${data.error}`);
    }
    
    // 等待后继续轮询
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error('Job timeout');
}
```

---

## 5. 获取任务结果

### 接口信息

- **路径**: `GET /location/job/:jobId/result`
- **功能**: 获取已完成任务的结果
- **说明**: 
  - 仅当任务状态为 `completed` 时才能获取结果
  - 如果任务未完成，将返回错误
  - 建议先调用接口4查询任务状态

### 请求参数

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| jobId | string | 是 | 任务ID（从接口3获取） |

### 响应格式

**成功响应 (200)**:

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
        "openingHours": "全年开放，夏季8:30-17:30，冬季8:30-16:30",
        "ticketPrice": "Cliff Walk约CHF 15（约¥120）...",
        "visitTips": "最佳游览时间：上午10点前避开人群...",
        "category": "景点",
        "rating": 4.8,
        "visitDuration": "2-3小时",
        "bestTimeToVisit": "上午10点前，晴朗天气"
      }
    }
  ]
}
```

**响应字段说明**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| success | boolean | 是否成功 |
| data | array | 结果列表，结构同接口2的响应 |

### 错误响应

**401 Unauthorized**:
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**400 Bad Request** (任务未完成):
```json
{
  "statusCode": 400,
  "message": "Job is not completed yet"
}
```

**404 Not Found** (任务不存在):
```json
{
  "statusCode": 404,
  "message": "Job not found"
}
```

### 请求示例

**JavaScript (fetch)**:
```javascript
// 先检查任务状态
const statusResponse = await fetch('/api/location/job/job-abc123def456', {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
});

const status = await statusResponse.json();

if (status.data.status === 'completed') {
  // 获取结果
  const resultResponse = await fetch('/api/location/job/job-abc123def456/result', {
    headers: {
      'Authorization': 'Bearer YOUR_JWT_TOKEN'
    }
  });
  
  const result = await resultResponse.json();
  console.log('Results:', result.data);
} else {
  console.log('Job is not completed yet. Status:', status.data.status);
}
```

**cURL**:
```bash
curl -X GET 'https://api.example.com/api/location/job/job-abc123def456/result' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

**注意事项**:
- 必须先确认任务状态为 `completed`，否则会返回错误
- 任务结果会保留一段时间，建议及时获取
- 如果任务失败，请查看接口4返回的 `error` 字段

---

## 6. 查询已存储的位置信息

### 接口信息

- **路径**: `GET /location/query`
- **功能**: 查询已存储的位置信息（不触发生成）
- **说明**: 
  - 根据活动名称、目的地和类型查询已存储的位置信息
  - 如果不存在，返回 `null`，不会触发生成
  - 适合快速查询已缓存的位置信息

### 请求参数

**查询参数 (Query)**:

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| activityName | string | 是 | 活动名称 | "铁力士峰云端漫步" |
| destination | string | 是 | 目的地 | "瑞士琉森" |
| activityType | string | 是 | 活动类型，枚举值：`attraction`、`meal`、`hotel`、`shopping`、`transport`、`ocean` | "attraction" |

### 响应格式

**成功响应 (200)** - 找到位置信息:

```json
{
  "success": true,
  "data": {
    "chineseName": "铁力士峰云端漫步",
    "localName": "Titlis Cliff Walk",
    "chineseAddress": "Titlis Bergstation, 6390 Engelberg, Switzerland",
    "localAddress": "Titlis Bergstation, 6390 Engelberg, Switzerland",
    "transportInfo": "从琉森乘火车约45分钟至Engelberg站...",
    "openingHours": "全年开放，夏季8:30-17:30，冬季8:30-16:30",
    "ticketPrice": "Cliff Walk约CHF 15（约¥120）...",
    "visitTips": "最佳游览时间：上午10点前避开人群...",
    "category": "景点",
    "rating": 4.8,
    "visitDuration": "2-3小时",
    "bestTimeToVisit": "上午10点前，晴朗天气"
  }
}
```

**成功响应 (200)** - 未找到位置信息:

```json
{
  "success": true,
  "data": null
}
```

**响应字段说明**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| success | boolean | 是否成功 |
| data | object \| null | 位置信息对象（结构同接口1），如果不存在则为 `null` |

### 错误响应

**401 Unauthorized**:
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**400 Bad Request** (参数验证失败):
```json
{
  "statusCode": 400,
  "message": ["activityName must be a string"]
}
```

### 请求示例

**JavaScript (fetch)**:
```javascript
const params = new URLSearchParams({
  activityName: '铁力士峰云端漫步',
  destination: '瑞士琉森',
  activityType: 'attraction'
});

const response = await fetch(`/api/location/query?${params}`, {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
});

const result = await response.json();

if (result.data) {
  console.log('Location found:', result.data);
} else {
  console.log('Location not found, need to generate');
  // 可以调用接口1生成位置信息
}
```

**cURL**:
```bash
curl -X GET 'https://api.example.com/api/location/query?activityName=铁力士峰云端漫步&destination=瑞士琉森&activityType=attraction' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

**使用场景**:
- 在显示活动详情前，先查询是否已有位置信息
- 如果查询结果为 `null`，再调用接口1生成位置信息
- 避免不必要的AI调用，提高响应速度

---

## 7. 搜索位置信息

### 接口信息

- **路径**: `GET /location/search`
- **功能**: 根据条件搜索已存储的位置信息，支持分页
- **说明**: 
  - 支持按目的地、活动类型、活动名称（模糊搜索）筛选
  - 支持分页查询
  - 适合管理后台查看和浏览位置信息

### 请求参数

**查询参数 (Query)**:

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| destination | string | 否 | 目的地（精确匹配） | "瑞士琉森" |
| activityType | string | 否 | 活动类型（精确匹配），枚举值：`attraction`、`meal`、`hotel`、`shopping`、`transport`、`ocean` | "attraction" |
| activityName | string | 否 | 活动名称（模糊搜索） | "铁力士" |
| limit | number | 否 | 每页数量，范围：1-100，默认：20 | 20 |
| offset | number | 否 | 偏移量，默认：0 | 0 |

### 响应格式

**成功响应 (200)**:

```json
{
  "success": true,
  "data": {
    "locations": [
      {
        "chineseName": "铁力士峰云端漫步",
        "localName": "Titlis Cliff Walk",
        "chineseAddress": "Titlis Bergstation, 6390 Engelberg, Switzerland",
        "localAddress": "Titlis Bergstation, 6390 Engelberg, Switzerland",
        "transportInfo": "从琉森乘火车约45分钟至Engelberg站...",
        "openingHours": "全年开放，夏季8:30-17:30，冬季8:30-16:30",
        "ticketPrice": "Cliff Walk约CHF 15（约¥120）...",
        "visitTips": "最佳游览时间：上午10点前避开人群...",
        "category": "景点",
        "rating": 4.8,
        "visitDuration": "2-3小时",
        "bestTimeToVisit": "上午10点前，晴朗天气"
      },
      {
        "chineseName": "琉森湖游船",
        "localName": "Lake Lucerne Cruise",
        "chineseAddress": "Lucerne Harbor, 6002 Lucerne, Switzerland",
        "localAddress": "Lucerne Harbor, 6002 Lucerne, Switzerland",
        "transportInfo": "位于琉森市中心码头...",
        "openingHours": "全年开放，夏季班次更频繁",
        "ticketPrice": "成人票约CHF 30-50...",
        "visitTips": "建议选择天气晴朗的日子...",
        "category": "景点",
        "rating": 4.5,
        "visitDuration": "1-2小时",
        "bestTimeToVisit": "下午，避开正午强光"
      }
    ],
    "total": 2
  }
}
```

**响应字段说明**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| success | boolean | 是否成功 |
| data | object | 搜索结果 |
| data.locations | array | 位置信息列表（结构同接口1） |
| data.total | number | 符合条件的总数量 |

### 错误响应

**401 Unauthorized**:
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**400 Bad Request** (参数验证失败):
```json
{
  "statusCode": 400,
  "message": ["limit must be a number"]
}
```

### 请求示例

**JavaScript (fetch)**:
```javascript
// 搜索所有景点类型的位置信息
const params = new URLSearchParams({
  activityType: 'attraction',
  limit: '20',
  offset: '0'
});

const response = await fetch(`/api/location/search?${params}`, {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
});

const result = await response.json();
console.log(`Found ${result.data.total} locations`);
console.log('Locations:', result.data.locations);
```

**按目的地搜索**:
```javascript
const params = new URLSearchParams({
  destination: '瑞士琉森',
  limit: '10'
});

const response = await fetch(`/api/location/search?${params}`, {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
});
```

**模糊搜索活动名称**:
```javascript
const params = new URLSearchParams({
  activityName: '铁力士',
  limit: '20'
});

const response = await fetch(`/api/location/search?${params}`, {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
});
```

**分页查询**:
```javascript
async function getAllLocations(pageSize = 20) {
  let offset = 0;
  let allLocations = [];
  let hasMore = true;

  while (hasMore) {
    const params = new URLSearchParams({
      limit: String(pageSize),
      offset: String(offset)
    });

    const response = await fetch(`/api/location/search?${params}`, {
      headers: {
        'Authorization': 'Bearer YOUR_JWT_TOKEN'
      }
    });

    const result = await response.json();
    allLocations = allLocations.concat(result.data.locations);

    if (result.data.locations.length < pageSize) {
      hasMore = false;
    } else {
      offset += pageSize;
    }
  }

  return allLocations;
}
```

**cURL**:
```bash
# 搜索所有景点
curl -X GET 'https://api.example.com/api/location/search?activityType=attraction&limit=20&offset=0' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'

# 按目的地搜索
curl -X GET 'https://api.example.com/api/location/search?destination=瑞士琉森' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'

# 模糊搜索活动名称
curl -X GET 'https://api.example.com/api/location/search?activityName=铁力士' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

**注意事项**:
- 多个筛选条件之间是 AND 关系（同时满足）
- `activityName` 使用模糊搜索（ILIKE），其他字段使用精确匹配
- 结果按创建时间倒序排列（最新的在前）
- 建议合理设置 `limit` 值，避免一次查询过多数据

---

## 8. 根据ID查询位置信息

### 接口信息

- **路径**: `GET /location/:id`
- **功能**: 根据位置信息的唯一ID查询详细信息
- **说明**: 
  - 使用位置信息的数据库ID进行查询
  - 适合已知位置信息ID的场景

### 请求参数

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 位置信息的唯一ID（UUID格式） |

### 响应格式

**成功响应 (200)** - 找到位置信息:

```json
{
  "success": true,
  "data": {
        "chineseName": "铁力士峰云端漫步",
        "localName": "Titlis Cliff Walk",
    "chineseAddress": "Titlis Bergstation, 6390 Engelberg, Switzerland",
    "localAddress": "Titlis Bergstation, 6390 Engelberg, Switzerland",
    "transportInfo": "从琉森乘火车约45分钟至Engelberg站...",
    "openingHours": "全年开放，夏季8:30-17:30，冬季8:30-16:30",
    "ticketPrice": "Cliff Walk约CHF 15（约¥120）...",
    "visitTips": "最佳游览时间：上午10点前避开人群...",
    "category": "景点",
    "rating": 4.8,
    "visitDuration": "2-3小时",
    "bestTimeToVisit": "上午10点前，晴朗天气"
  }
}
```

**成功响应 (200)** - 未找到位置信息:

```json
{
  "success": true,
  "data": null
}
```

**响应字段说明**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| success | boolean | 是否成功 |
| data | object \| null | 位置信息对象（结构同接口1），如果不存在则为 `null` |

### 错误响应

**401 Unauthorized**:
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**400 Bad Request** (ID格式错误):
```json
{
  "statusCode": 400,
  "message": "Invalid ID format"
}
```

### 请求示例

**JavaScript (fetch)**:
```javascript
const locationId = '550e8400-e29b-41d4-a716-446655440000';

const response = await fetch(`/api/location/${locationId}`, {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
});

const result = await response.json();

if (result.data) {
  console.log('Location found:', result.data);
  } else {
  console.log('Location not found');
}
```

**cURL**:
```bash
curl -X GET 'https://api.example.com/api/location/550e8400-e29b-41d4-a716-446655440000' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

**使用场景**:
- 从其他接口或数据库获取到位置信息ID后，直接查询详细信息
- 在管理后台中，通过ID快速定位和查看位置信息
- 与接口6配合使用：先搜索获取ID列表，再批量查询详细信息

**注意事项**:
- ID必须是有效的UUID格式
- 如果位置信息不存在，返回 `data: null`，不会返回404错误
- 此接口仅查询已存储的位置信息，不会触发生成

---

## 接口使用建议

### 1. 生成位置信息
- **单个活动**: 使用接口1 `POST /location/generate`
- **少量活动（<20个）**: 使用接口2 `POST /location/generate-batch`（同步）
- **大量活动（≥20个）**: 使用接口3 `POST /location/generate-batch-async`（异步）

### 2. 查询位置信息
- **已知活动信息**: 使用接口6 `GET /location/query`
- **已知位置ID**: 使用接口8 `GET /location/:id`
- **搜索和浏览**: 使用接口7 `GET /location/search`

### 3. 异步任务管理
- **查询任务状态**: 使用接口4 `GET /location/job/:jobId`
- **获取任务结果**: 使用接口5 `GET /location/job/:jobId/result`

### 4. 性能优化建议
- 优先使用查询接口（接口6、7、8），避免重复生成
- 批量操作时，优先使用异步接口（接口3）
- 合理使用缓存，减少API调用次数

---

## 错误码说明

| 状态码 | 说明 | 处理建议 |
|--------|------|---------|
| 200 | 请求成功 | - |
| 400 | 请求参数错误 | 检查请求参数格式和必填项 |
| 401 | 未授权 | 检查JWT Token是否有效 |
| 404 | 资源不存在 | 检查资源ID或路径是否正确 |
| 500 | 服务器内部错误 | 联系技术支持或稍后重试 |

---

## 联系方式

如有问题或建议，请联系开发团队。

