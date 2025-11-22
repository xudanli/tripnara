# Seeker 模式 API 文档

## 概述

Seeker 模式 API 用于根据用户的心情、期望体验、预算和时长，生成个性化的旅行计划。用户通过提供明确的需求参数，系统会自动推荐目的地并生成详细的行程安排。

**基础路径**: `/api/seeker` (注意：应用已设置全局前缀 `api`，控制器路径为 `seeker`)

**认证**: 需要 JWT Bearer Token

---

## 生成行程接口

### 接口信息

- **URL**: `POST /api/seeker/generate-travel-plan`
- **认证**: 需要登录（JWT Bearer Token）
- **Content-Type**: `application/json`

### 请求参数

```typescript
interface GenerateSeekerTravelPlanRequest {
  currentMood: string;          // 当前心情，必填
  desiredExperience: string;    // 期望体验，必填
  budget: string;               // 预算范围，必填
  duration: string;             // 时长类型，必填
  language?: string;            // 语言代码，默认 'zh-CN'
  userCountry?: string;         // 用户所在国家
  userNationality?: string;     // 用户国籍
}
```

#### 参数说明

| 参数 | 类型 | 必填 | 说明 | 可选值 |
|------|------|------|------|--------|
| `currentMood` | string | 是 | 当前心情 | `calm`（平静）、`active`（活跃）、`romantic`（浪漫）、`adventurous`（冒险）、`cultural`（文化） |
| `desiredExperience` | string | 是 | 期望体验 | `sightseeing`（观光）、`nature`（自然）、`food`（美食）、`shopping`（购物）、`nightlife`（夜生活）、`adventure`（探险） |
| `budget` | string | 是 | 预算范围 | `economy`（经济）、`comfort`（舒适）、`luxury`（奢华） |
| `duration` | string | 是 | 时长类型 | `weekend`（周末，2天）、`week`（一周，7天）、`extended`（长期，14天） |
| `language` | string | 否 | 语言代码 | 默认 `zh-CN` |
| `userCountry` | string | 否 | 用户所在国家 | 例如：`CN` |
| `userNationality` | string | 否 | 用户国籍 | 例如：`CN` |

### 响应格式

#### 成功响应 (200 OK)

```typescript
interface GenerateSeekerTravelPlanResponse {
  success: boolean;
  data: {
    destination: string;        // 推荐的目的地
    duration: number;           // 行程天数
    itinerary: Array<{          // 行程详情
      day: number;              // 第几天
      title: string;            // 标题
      theme?: string;           // 主题（可选）
      activities: Array<{       // 活动列表
        time: string;           // 时间，格式：HH:mm
        activity: string;       // 活动名称
        type: string;           // 活动类型
        location?: string;      // 位置（可选）
        notes?: string;         // 备注（可选）
      }>;
    }>;
    recommendations?: {         // 推荐信息（可选）
      accommodation?: string;   // 住宿推荐
      transportation?: string;  // 交通推荐
      food?: string;            // 美食推荐
      tips?: string;            // 旅行提示
    };
    detectedIntent?: {          // 检测到的意图（可选）
      intentType: string;       // 意图类型
      keywords: string[];       // 关键词列表
      emotionTone: string;      // 情感倾向
      description: string;      // 意图描述
    };
  };
}
```

#### 响应字段说明

| 字段路径 | 类型 | 说明 |
|---------|------|------|
| `data.destination` | string | 推荐的目的地 |
| `data.duration` | number | 行程天数（根据 duration 参数计算：weekend=2, week=7, extended=14） |
| `data.itinerary[].day` | number | 第几天（从1开始） |
| `data.itinerary[].title` | string | 当天的标题 |
| `data.itinerary[].theme` | string | 当天的主题（可选） |
| `data.itinerary[].activities[].time` | string | 活动时间（格式：HH:mm） |
| `data.itinerary[].activities[].activity` | string | 活动名称 |
| `data.itinerary[].activities[].type` | string | 活动类型（attraction/meal/hotel/shopping/transport/ocean） |
| `data.itinerary[].activities[].location` | string | 位置（可选） |
| `data.itinerary[].activities[].notes` | string | 备注（可选） |
| `data.recommendations.accommodation` | string | 住宿推荐（可选） |
| `data.recommendations.transportation` | string | 交通推荐（可选） |
| `data.recommendations.food` | string | 美食推荐（可选） |
| `data.recommendations.tips` | string | 旅行提示（可选） |
| `data.detectedIntent.intentType` | string | 意图类型（可选） |
| `data.detectedIntent.keywords` | string[] | 关键词列表（可选） |
| `data.detectedIntent.emotionTone` | string | 情感倾向（可选） |
| `data.detectedIntent.description` | string | 意图描述（可选） |

### 请求示例

#### cURL

```bash
curl -X POST "http://localhost:3000/api/seeker/generate-travel-plan" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentMood": "calm",
    "desiredExperience": "nature",
    "budget": "comfort",
    "duration": "weekend",
    "language": "zh-CN",
    "userCountry": "CN",
    "userNationality": "CN"
  }'
```

#### JavaScript (Fetch)

```javascript
async function generateSeekerTravelPlan(
  currentMood,
  desiredExperience,
  budget,
  duration,
  token,
  options = {}
) {
  const response = await fetch(
    'http://localhost:3000/api/seeker/generate-travel-plan',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        currentMood,
        desiredExperience,
        budget,
        duration,
        language: options.language || 'zh-CN',
        userCountry: options.userCountry,
        userNationality: options.userNationality,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '生成行程失败');
  }

  const result = await response.json();
  if (result.success) {
    return result.data;
  }
  throw new Error('生成行程失败');
}

// 使用示例
try {
  const plan = await generateSeekerTravelPlan(
    'calm',
    'nature',
    'comfort',
    'weekend',
    'your-jwt-token',
    {
      language: 'zh-CN',
      userCountry: 'CN',
      userNationality: 'CN',
    }
  );
  console.log('推荐目的地:', plan.destination);
  console.log('行程天数:', plan.duration);
  console.log('行程详情:', plan.itinerary);
} catch (error) {
  console.error('错误:', error.message);
}
```

#### TypeScript (Axios)

```typescript
import axios from 'axios';

interface GenerateSeekerTravelPlanRequest {
  currentMood: 'calm' | 'active' | 'romantic' | 'adventurous' | 'cultural';
  desiredExperience: 'sightseeing' | 'nature' | 'food' | 'shopping' | 'nightlife' | 'adventure';
  budget: 'economy' | 'comfort' | 'luxury';
  duration: 'weekend' | 'week' | 'extended';
  language?: string;
  userCountry?: string;
  userNationality?: string;
}

interface Activity {
  time: string;
  activity: string;
  type: string;
  location?: string;
  notes?: string;
}

interface DayItinerary {
  day: number;
  title: string;
  theme?: string;
  activities: Activity[];
}

interface Recommendations {
  accommodation?: string;
  transportation?: string;
  food?: string;
  tips?: string;
}

interface DetectedIntent {
  intentType: string;
  keywords: string[];
  emotionTone: string;
  description: string;
}

interface SeekerTravelPlanData {
  destination: string;
  duration: number;
  itinerary: DayItinerary[];
  recommendations?: Recommendations;
  detectedIntent?: DetectedIntent;
}

interface GenerateSeekerTravelPlanResponse {
  success: boolean;
  data: SeekerTravelPlanData;
}

async function generateSeekerTravelPlan(
  request: GenerateSeekerTravelPlanRequest,
  token: string
): Promise<SeekerTravelPlanData> {
  const response = await axios.post<GenerateSeekerTravelPlanResponse>(
    'http://localhost:3000/api/seeker/generate-travel-plan',
    request,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      withCredentials: true,
    }
  );

  if (response.data.success) {
    return response.data.data;
  }
  throw new Error('生成行程失败');
}

// 使用示例
const plan = await generateSeekerTravelPlan(
  {
    currentMood: 'calm',
    desiredExperience: 'nature',
    budget: 'comfort',
    duration: 'weekend',
    language: 'zh-CN',
    userCountry: 'CN',
    userNationality: 'CN',
  },
  'your-jwt-token'
);

console.log('推荐目的地:', plan.destination);
console.log('行程天数:', plan.duration);
console.log('第一天行程:', plan.itinerary[0]);
console.log('住宿推荐:', plan.recommendations?.accommodation);
```

### 响应示例

```json
{
  "success": true,
  "data": {
    "destination": "冰岛",
    "duration": 2,
    "itinerary": [
      {
        "day": 1,
        "title": "探索雷克雅未克",
        "theme": "城市文化",
        "activities": [
          {
            "time": "09:00",
            "activity": "参观哈尔格林姆斯大教堂",
            "type": "attraction",
            "location": "雷克雅未克",
            "notes": "建议提前预订门票"
          },
          {
            "time": "12:00",
            "activity": "品尝当地美食",
            "type": "meal",
            "location": "雷克雅未克市中心",
            "notes": "推荐尝试冰岛特色菜"
          },
          {
            "time": "14:00",
            "activity": "游览蓝湖温泉",
            "type": "attraction",
            "location": "蓝湖",
            "notes": "需要提前预订，建议带泳衣"
          }
        ]
      },
      {
        "day": 2,
        "title": "自然奇观之旅",
        "theme": "自然探索",
        "activities": [
          {
            "time": "08:00",
            "activity": "黄金圈一日游",
            "type": "attraction",
            "location": "黄金圈",
            "notes": "包含间歇泉、黄金瀑布等景点"
          },
          {
            "time": "18:00",
            "activity": "极光观测",
            "type": "attraction",
            "location": "雷克雅未克郊区",
            "notes": "天气晴朗时最佳，建议穿保暖衣物"
          }
        ]
      }
    ],
    "recommendations": {
      "accommodation": "推荐市中心精品酒店，交通便利，价格适中",
      "transportation": "建议租车自驾，灵活方便，可以自由安排行程",
      "food": "尝试当地特色菜如羊肉汤、熏鱼等，推荐米其林餐厅",
      "tips": "冰岛天气变化快，建议携带防风防雨衣物；提前预订热门景点门票；注意当地习俗和环保要求"
    },
    "detectedIntent": {
      "intentType": "emotional_healing",
      "keywords": ["平静", "自然", "放松"],
      "emotionTone": "calm",
      "description": "用户希望寻找一个安静、放松的旅行目的地，追求情感疗愈和心灵平静"
    }
  }
}
```

---

## 数据格式转换

### 保存到数据库

Seeker 模式接口返回的是前端展示格式，保存到数据库前需要转换为 `CreateItineraryRequest` 格式。

#### 转换示例

```typescript
// 前端展示格式（Seeker 接口返回）
interface SeekerTravelPlanData {
  destination: string;
  duration: number;
  itinerary: DayItinerary[];
  // ...
}

// 数据库保存格式（CreateItineraryRequest）
interface CreateItineraryRequest {
  destination: string;
  startDate: string;  // YYYY-MM-DD
  days: number;
  data: {
    days: Array<{
      day: number;
      date: string;  // YYYY-MM-DD
      activities: Array<{
        time: string;  // HH:mm
        title: string;
        type: 'attraction' | 'meal' | 'hotel' | 'shopping' | 'transport' | 'ocean';
        duration: number;  // 分钟
        location: { lat: number; lng: number };
        notes: string;
        cost: number;
      }>;
    }>;
    totalCost: number;
    summary: string;
  };
  preferences?: {
    interests?: string[];
    budget?: 'low' | 'medium' | 'high';
    travelStyle?: 'relaxed' | 'moderate' | 'intensive';
  };
  status?: 'draft' | 'published' | 'archived';
  mode?: 'planner' | 'seeker' | 'inspiration';
}

// 转换函数示例
function convertSeekerPlanToCreateRequest(
  seekerPlan: SeekerTravelPlanData,
  startDate: string
): CreateItineraryRequest {
  const days = seekerPlan.itinerary.map((day, index) => {
    // 计算日期
    const date = new Date(startDate);
    date.setDate(date.getDate() + index);
    const dateStr = date.toISOString().split('T')[0];

    return {
      day: day.day,
      date: dateStr,
      activities: day.activities.map((activity) => ({
        time: activity.time,
        title: activity.activity,  // 使用 activity 作为 title
        type: activity.type as 'attraction' | 'meal' | 'hotel' | 'shopping' | 'transport' | 'ocean',
        duration: 120,  // 默认2小时，需要根据实际情况计算
        location: { lat: 0, lng: 0 },  // 需要根据 location 名称获取坐标
        notes: activity.notes || '',
        cost: 0,  // 需要根据预算和活动类型计算
      })),
    };
  });

  // 构建预算映射
  const budgetMap: Record<string, 'low' | 'medium' | 'high'> = {
    economy: 'low',
    comfort: 'medium',
    luxury: 'high',
  };

  return {
    destination: seekerPlan.destination,
    startDate,
    days: seekerPlan.duration,
    data: {
      days,
      totalCost: 0,  // 需要计算总费用
      summary: seekerPlan.recommendations?.tips || '',
    },
    preferences: {
      budget: budgetMap[/* 从原始请求中获取 budget */],
    },
    status: 'draft',
    mode: 'seeker',
  };
}
```

---

## 错误处理

### 错误响应格式

```typescript
interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
}
```

### 常见错误代码

| 状态码 | 错误代码 | 说明 |
|--------|---------|------|
| 400 | `VALIDATION_ERROR` | 参数验证失败（如必填参数缺失、枚举值不正确） |
| 401 | `UNAUTHORIZED` | 未提供有效的 JWT Token |
| 403 | `FORBIDDEN` | Token 无效或已过期 |
| 500 | `INTERNAL_ERROR` | 服务器内部错误 |

### 错误响应示例

```json
{
  "statusCode": 400,
  "message": [
    "currentMood must be one of the following values: calm, active, romantic, adventurous, cultural",
    "desiredExperience must be one of the following values: sightseeing, nature, food, shopping, nightlife, adventure"
  ],
  "error": "Bad Request"
}
```

---

## 前端对接建议

### 1. 参数验证

前端应该在发送请求前验证参数：

```typescript
const VALID_MOODS = ['calm', 'active', 'romantic', 'adventurous', 'cultural'];
const VALID_EXPERIENCES = ['sightseeing', 'nature', 'food', 'shopping', 'nightlife', 'adventure'];
const VALID_BUDGETS = ['economy', 'comfort', 'luxury'];
const VALID_DURATIONS = ['weekend', 'week', 'extended'];

function validateSeekerRequest(request: GenerateSeekerTravelPlanRequest): string[] {
  const errors: string[] = [];
  
  if (!VALID_MOODS.includes(request.currentMood)) {
    errors.push('currentMood 必须是有效值');
  }
  
  if (!VALID_EXPERIENCES.includes(request.desiredExperience)) {
    errors.push('desiredExperience 必须是有效值');
  }
  
  // ... 其他验证
  
  return errors;
}
```

### 2. 加载状态处理

生成行程可能需要较长时间，建议显示加载状态：

```typescript
const [loading, setLoading] = useState(false);
const [plan, setPlan] = useState<SeekerTravelPlanData | null>(null);

async function handleGenerate() {
  setLoading(true);
  try {
    const result = await generateSeekerTravelPlan(/* ... */);
    setPlan(result);
  } catch (error) {
    console.error('生成失败:', error);
    // 显示错误提示
  } finally {
    setLoading(false);
  }
}
```

### 3. 数据转换

保存到数据库前，确保正确转换数据格式：

```typescript
// 1. 获取行程数据
const seekerPlan = await generateSeekerTravelPlan(request, token);

// 2. 获取坐标（如果需要）
const coordinates = await getLocationCoordinates(seekerPlan.destination);

// 3. 转换为保存格式
const createRequest = convertSeekerPlanToCreateRequest(
  seekerPlan,
  startDate
);

// 4. 保存到数据库
await createItinerary(createRequest, token);
```

### 4. 错误处理

```typescript
try {
  const plan = await generateSeekerTravelPlan(request, token);
  // 处理成功结果
} catch (error) {
  if (error.response?.status === 400) {
    // 参数验证错误
    const messages = error.response.data.message;
    // 显示验证错误信息
  } else if (error.response?.status === 401) {
    // 未授权，需要重新登录
    // 跳转到登录页
  } else {
    // 其他错误
    // 显示通用错误提示
  }
}
```

---

## 注意事项

1. **时长类型映射**：
   - `weekend` → 2 天
   - `week` → 7 天
   - `extended` → 14 天

2. **意图自动检测**：接口会自动调用意图识别服务，分析用户的心情和期望体验，无需前端单独调用。

3. **数据格式**：返回的数据是前端展示格式，保存到数据库前需要转换为 `CreateItineraryRequest` 格式。

4. **坐标信息**：返回的活动可能只有位置名称，保存到数据库时需要根据位置名称获取经纬度坐标。

5. **费用计算**：返回的活动可能没有费用信息，保存到数据库时需要根据预算范围和活动类型估算费用。

6. **模式标识**：保存到数据库时，建议设置 `mode: 'seeker'` 用于区分不同模式的行程。

---

## 完整使用流程示例

```typescript
// 1. 用户填写需求表单
const formData = {
  currentMood: 'calm',
  desiredExperience: 'nature',
  budget: 'comfort',
  duration: 'weekend',
};

// 2. 调用生成接口
const plan = await generateSeekerTravelPlan(
  {
    ...formData,
    language: 'zh-CN',
    userCountry: 'CN',
    userNationality: 'CN',
  },
  jwtToken
);

// 3. 显示生成的行程
console.log('推荐目的地:', plan.destination);
console.log('行程天数:', plan.duration);
plan.itinerary.forEach((day) => {
  console.log(`第${day.day}天: ${day.title}`);
  day.activities.forEach((activity) => {
    console.log(`  ${activity.time} - ${activity.activity}`);
  });
});

// 4. 用户确认后，选择开始日期
const startDate = '2024-06-01';

// 5. 转换为保存格式（需要补充坐标和费用信息）
const createRequest = {
  destination: plan.destination,
  startDate,
  days: plan.duration,
  data: {
    days: plan.itinerary.map((day, index) => ({
      day: day.day,
      date: calculateDate(startDate, index),
      activities: day.activities.map((activity) => ({
        time: activity.time,
        title: activity.activity,
        type: activity.type,
        duration: estimateDuration(activity.type),
        location: await getCoordinates(activity.location),
        notes: activity.notes || '',
        cost: estimateCost(activity.type, formData.budget),
      })),
    })),
    totalCost: calculateTotalCost(/* ... */),
    summary: plan.recommendations?.tips || '',
  },
  preferences: {
    budget: mapBudget(formData.budget),
  },
  status: 'draft',
  mode: 'seeker',
};

// 6. 保存到数据库
await createItinerary(createRequest, jwtToken);
```

