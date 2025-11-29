# 灵感模式 API 文档

## 概述

灵感模式 API 提供了一系列接口，用于分析用户自然语言输入、识别旅行意图、推荐目的地、生成行程等功能。

**基础路径**: `/api/inspiration` (注意：应用已设置全局前缀 `api`，控制器路径为 `inspiration`)

**认证**: 需要 JWT Bearer Token

---

## 1. 意图识别接口

### 接口信息

- **URL**: `POST /api/inspiration/detect-intent`
- **认证**: 需要登录（JWT Bearer Token）
- **Content-Type**: `application/json`

### 请求参数

```typescript
interface DetectIntentRequest {
  input: string;        // 用户自然语言输入，如"我想去一个安静的地方放松"
  language?: string;     // 语言代码，默认 'zh-CN'
}
```

### 响应格式

```typescript
interface DetectIntentResponse {
  success: boolean;
  data: {
    intentType: string;      // 意图类型
    keywords: string[];      // 提取的关键词列表
    emotionTone: string;     // 情感倾向
    description: string;     // 意图描述
    confidence?: number;     // 置信度（0-1）
  };
}
```

### 意图类型说明

- `photography_exploration` - 摄影探索
- `cultural_exchange` - 文化交流
- `emotional_healing` - 情感疗愈
- `mind_healing` - 心灵疗愈
- `extreme_exploration` - 极限探索
- `urban_creation` - 城市创作

### 请求示例

```bash
curl -X POST "http://localhost:3000/api/inspiration/detect-intent" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "我想去一个安静的地方放松",
    "language": "zh-CN"
  }'
```

### 响应示例

```json
{
  "success": true,
  "data": {
    "intentType": "emotional_healing",
    "keywords": ["安静", "放松", "自然"],
    "emotionTone": "calm",
    "description": "用户希望寻找一个安静、放松的旅行目的地，追求情感疗愈和心灵平静",
    "confidence": 0.85
  }
}
```

---

## 2. 目的地推荐接口

### 接口信息

- **URL**: `POST /api/inspiration/recommend-destinations`
- **认证**: 需要登录（JWT Bearer Token）
- **Content-Type**: `application/json`

### 请求参数

```typescript
interface RecommendDestinationsRequest {
  input: string;                    // 用户自然语言输入
  intent?: {                        // 意图识别结果（可选，如果不提供会在后端识别）
    intentType: string;
    keywords: string[];
    emotionTone: string;
  };
  language?: string;                // 语言代码，默认 'zh-CN'
  userCountry?: string;             // 用户所在国家
  userNationality?: string;         // 用户国籍
  userPermanentResidency?: string;  // 用户永久居住地
  heldVisas?: string[];            // 用户持有的签证
  visaFreeDestinations?: string[];   // 免签目的地列表
  visaInfoSummary?: string | null;  // 签证信息摘要
  limit?: number;                   // 返回数量，默认 10，范围 1-12
}
```

### 响应格式

```typescript
interface RecommendDestinationsResponse {
  success: boolean;
  data: {
    locations: string[];            // 推荐的目的地列表
    locationDetails?: {             // 可选：目的地详情
      [location: string]: {
        country?: string;
        description?: string;
        highlights?: string[];      // 亮点列表
        bestSeason?: string;
        coverImage?: string;        // 目的地封面图片URL
        budget?: {                  // 预算信息
          low?: number;             // 经济型预算（每人每天，人民币）
          medium?: number;          // 舒适型预算（每人每天，人民币）
          high?: number;            // 豪华型预算（每人每天，人民币）
          currency?: string;        // 货币代码（默认CNY）
          description?: string;      // 预算说明文字
        };
      };
    };
    reasoning?: string;              // 推荐理由
  };
}
```

### 请求示例

```bash
curl -X POST "http://localhost:3000/api/inspiration/recommend-destinations" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "我想去一个安静的地方放松",
    "language": "zh-CN",
    "userCountry": "CN",
    "userNationality": "CN",
    "limit": 10
  }'
```

### 响应示例

```json
{
  "success": true,
  "data": {
    "locations": ["冰岛", "挪威", "瑞士", "新西兰", "日本北海道", "加拿大班夫", "智利", "芬兰", "奥地利", "苏格兰"],
    "locationDetails": {
      "冰岛": {
        "country": "Iceland",
        "description": "冰岛是追求宁静和自然美景的理想目的地",
        "highlights": ["极光", "温泉", "冰川"],
        "bestSeason": "全年，夏季最佳",
        "coverImage": "https://images.unsplash.com/photo-1539650116574-75c0c6d73a6e",
        "budget": {
          "low": 800,
          "medium": 1500,
          "high": 3000,
          "currency": "CNY",
          "description": "预算范围：经济型800-1000元/天，舒适型1500-2000元/天，豪华型3000-4000元/天"
        }
      }
    },
    "reasoning": "这些目的地符合您对安静、放松的需求，拥有丰富的自然景观和疗愈环境"
  }
}
```

---

## 3. 生成完整行程接口

### 接口信息

- **URL**: `POST /api/inspiration/generate-itinerary`
- **认证**: 需要登录（JWT Bearer Token）
- **Content-Type**: `application/json`

### 请求参数

```typescript
interface GenerateItineraryRequest {
  input: string;                    // 用户自然语言输入
  selectedDestination?: string;     // 用户选择的目的地（可选）
  intent?: {                        // 意图识别结果（可选）
    intentType: string;
    keywords: string[];
    emotionTone: string;
  };
  language?: string;                // 语言代码，默认 'zh-CN'
  userCountry?: string;
  userNationality?: string;
  userPermanentResidency?: string;
  heldVisas?: string[];
  visaFreeDestinations?: string[];
  visaInfoSummary?: string | null;
  transportPreference?: 'public_transit_and_walking' | 'driving_and_walking';
  userRequestedDays?: number;        // 用户期望的天数（可选）
  mode?: 'full' | 'candidates';     // 生成模式，默认 'full'
}
```

### 响应格式

```typescript
interface GenerateItineraryResponse {
  success: boolean;
  data: {
    title: string;
    destination?: string;
    location?: string;
    locations?: string[];           // 如果 mode === 'candidates'，返回候选列表
    duration: string | number;
    days?: Array<{
      day: number;
      date: string;
      theme?: string;
      mood?: string;
      summary?: string;
      timeSlots: Array<{
        time: string;
        title?: string;
        activity?: string;
        coordinates?: { lat: number; lng: number };
        type?: string;
        duration?: number;
        cost?: number;
        details?: Record<string, unknown>;
      }>;
    }>;
    hasFullItinerary?: boolean;
    generationMode?: 'full' | 'candidates';
    highlights?: string[];
  };
}
```

### 请求示例

```bash
curl -X POST "http://localhost:3000/api/inspiration/generate-itinerary" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "我想去冰岛看极光，5天行程",
    "selectedDestination": "冰岛",
    "language": "zh-CN",
    "mode": "full",
    "userRequestedDays": 5
  }'
```

### 响应示例

```json
{
  "success": true,
  "data": {
    "title": "冰岛极光之旅",
    "destination": "冰岛",
    "location": "冰岛",
    "duration": "5天",
    "hasFullItinerary": true,
    "generationMode": "full",
    "highlights": ["极光", "温泉", "冰川"],
    "days": [
      {
        "day": 1,
        "date": "2024-06-01",
        "theme": "抵达与适应",
        "mood": "calm",
        "summary": "抵达雷克雅未克，适应时差，探索市区",
        "timeSlots": [
          {
            "time": "09:00",
            "title": "抵达雷克雅未克",
            "activity": "机场接机，前往酒店",
            "coordinates": { "lat": 64.1466, "lng": -21.9426 },
            "type": "transport",
            "duration": 60,
            "cost": 50
          }
        ]
      }
    ]
  }
}
```

---

## 4. 天数提取接口

### 接口信息

- **URL**: `POST /api/inspiration/extract-days`
- **认证**: 需要登录（JWT Bearer Token）
- **Content-Type**: `application/json`

### 请求参数

```typescript
interface ExtractDaysRequest {
  input: string;        // 用户输入
  language?: string;   // 语言代码，默认 'zh-CN'
}
```

### 响应格式

```typescript
interface ExtractDaysResponse {
  success: boolean;
  data: {
    days: number | null;    // 提取到的天数，如果未提取到则为 null
    confidence?: number;    // 置信度
  };
}
```

### 请求示例

```bash
curl -X POST "http://localhost:3000/api/inspiration/extract-days" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "我想去冰岛5天",
    "language": "zh-CN"
  }'
```

### 响应示例

```json
{
  "success": true,
  "data": {
    "days": 5,
    "confidence": 0.9
  }
}
```

---

## 前端使用示例

### TypeScript (Axios)

```typescript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api/inspiration';
const token = 'your-jwt-token';

// 1. 意图识别
async function detectIntent(input: string, language = 'zh-CN') {
  const response = await axios.post(
    `${API_BASE_URL}/detect-intent`,
    { input, language },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
}

// 2. 目的地推荐
async function recommendDestinations(
  input: string,
  options: {
    intent?: any;
    language?: string;
    userCountry?: string;
    limit?: number;
  } = {}
) {
  const response = await axios.post(
    `${API_BASE_URL}/recommend-destinations`,
    { input, ...options },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
}

// 3. 生成完整行程
async function generateItinerary(
  input: string,
  options: {
    selectedDestination?: string;
    mode?: 'full' | 'candidates';
    userRequestedDays?: number;
  } = {}
) {
  const response = await axios.post(
    `${API_BASE_URL}/generate-itinerary`,
    { input, ...options },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
}

// 4. 天数提取
async function extractDays(input: string, language = 'zh-CN') {
  const response = await axios.post(
    `${API_BASE_URL}/extract-days`,
    { input, language },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
}

// 使用示例
async function example() {
  // 步骤1: 识别意图
  const intent = await detectIntent('我想去一个安静的地方放松');
  console.log('意图:', intent.data);

  // 步骤2: 推荐目的地
  const destinations = await recommendDestinations('我想去一个安静的地方放松', {
    intent: intent.data,
    limit: 10,
  });
  console.log('推荐目的地:', destinations.data.locations);

  // 步骤3: 提取天数
  const days = await extractDays('我想去冰岛5天');
  console.log('天数:', days.data.days);

  // 步骤4: 生成完整行程
  const itinerary = await generateItinerary('我想去冰岛看极光，5天行程', {
    selectedDestination: '冰岛',
    mode: 'full',
    userRequestedDays: 5,
  });
  console.log('行程:', itinerary.data);
}
```

---

## 错误处理

所有接口遵循统一的错误响应格式：

```typescript
interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
}
```

常见错误：
- `400 Bad Request`: 请求参数验证失败
- `401 Unauthorized`: 未提供有效的 JWT Token
- `500 Internal Server Error`: 服务器内部错误

---

## 注意事项

1. 所有接口都需要 JWT Bearer Token 认证
2. 如果未提供 `intent` 参数，`recommend-destinations` 和 `generate-itinerary` 接口会在后端自动调用意图识别
3. 如果未提供 `userRequestedDays`，`generate-itinerary` 接口会在后端自动调用天数提取
4. `mode` 参数为 `candidates` 时，返回的是目的地候选列表，不会生成详细行程
5. 建议前端对接口调用进行错误处理和重试机制

