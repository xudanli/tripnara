# 行程接口文档 - 0. 生成旅行行程（AI）

## 接口信息

**接口路径：** `POST /api/v1/journeys/generate`

**接口描述：** 使用 AI 根据目的地、天数、偏好等信息生成详细的旅行行程

**认证：** 需要 JWT Token（Bearer Token）

**Content-Type：** `application/json`

---

## 请求参数

### 请求体结构

```json
{
  "destination": "瑞士琉森",
  "days": 5,
  "startDate": "2024-06-01",
  "preferences": {
    "interests": ["自然风光", "户外活动"],
    "budget": "medium",
    "travelStyle": "relaxed"
  },
  "intent": {
    "intentType": "photography_exploration",
    "keywords": ["摄影", "自然风光", "日出"],
    "emotionTone": "calm",
    "description": "用户希望进行摄影探索，寻找自然美景",
    "confidence": 0.85
  }
}
```

### 不提供目的地的场景

如果未提供 `destination`，系统会根据其他信息自动推荐目的地：

```json
{
  "days": 5,
  "startDate": "2024-06-01",
  "preferences": {
    "interests": ["自然风光", "户外活动"],
    "budget": "medium",
    "travelStyle": "relaxed"
  },
  "intent": {
    "intentType": "photography_exploration",
    "keywords": ["摄影", "自然风光", "日出"],
    "emotionTone": "calm",
    "description": "用户希望进行摄影探索，寻找自然美景"
  }
}
```

**工作流程：**
1. 系统根据 `intent`、`preferences`、`days` 等信息调用推荐目的地接口
2. 自动选择第一个推荐的目的地
3. 使用该目的地生成详细行程

**注意事项：**
- 如果既没有 `destination`，也没有足够的信息（如 `intent`、`preferences.interests`），系统可能无法推荐目的地
- 建议至少提供 `intent` 或 `preferences.interests` 之一，以便系统更好地推荐目的地

### 字段说明

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `destination` | string | 否 | 目的地名称（如：瑞士琉森、日本东京）。如果不提供，系统会根据其他信息（天数、偏好、意图等）自动推荐目的地 |
| `days` | number | 是 | 旅行天数，范围 1-30 |
| `startDate` | string | 是 | 旅行开始日期（YYYY-MM-DD格式） |
| `preferences` | object | 否 | 用户偏好 |
| `preferences.interests` | string[] | 否 | 兴趣列表（如：自然风光、户外活动、文化历史） |
| `preferences.budget` | string | 否 | 预算等级：`low`（经济）、`medium`（中等）、`high`（豪华） |
| `preferences.travelStyle` | string | 否 | 旅行风格：`relaxed`（轻松）、`moderate`（适中）、`intensive`（紧凑） |
| `intent` | object | 否 | 意图识别数据（用于优化行程生成） |
| `intent.intentType` | string | 否 | 意图类型，可选值：`photography_exploration`（摄影探索）、`cultural_exchange`（文化交流）、`emotional_healing`（情感疗愈）、`mind_healing`（心灵疗愈）、`extreme_exploration`（极限探索）、`urban_creation`（城市创作） |
| `intent.keywords` | string[] | 否 | 提取的关键词列表 |
| `intent.emotionTone` | string | 否 | 情感倾向，可选值：`calm`（平静）、`active`（活跃）、`romantic`（浪漫）、`adventurous`（冒险）、`peaceful`（平和）等 |
| `intent.description` | string | 否 | 意图描述 |
| `intent.confidence` | number | 否 | 置信度（0-1） |

---

## 请求示例

### cURL

```bash
curl -X POST "http://localhost:3000/api/v1/journeys/generate" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "瑞士琉森",
    "days": 5,
    "startDate": "2024-06-01",
    "preferences": {
      "interests": ["自然风光", "户外活动"],
      "budget": "medium",
      "travelStyle": "relaxed"
    },
    "intent": {
      "intentType": "photography_exploration",
      "keywords": ["摄影", "自然风光", "日出"],
      "emotionTone": "calm",
      "description": "用户希望进行摄影探索，寻找自然美景",
      "confidence": 0.85
    }
  }'
```

### 使用意图信息优化行程生成

当提供 `intent` 字段时，系统会利用意图信息优化行程生成：

1. **根据意图类型调整行程重点**：
   - `photography_exploration`：优先推荐适合摄影的景点和时间（如日出、日落时段）
   - `cultural_exchange`：增加文化体验活动，如博物馆、当地文化场所
   - `emotional_healing`：安排安静、疗愈性的活动，如温泉、自然漫步
   - `mind_healing`：推荐冥想、瑜伽、静心类活动
   - `extreme_exploration`：增加冒险、刺激类活动
   - `urban_creation`：关注城市艺术、创意空间

2. **利用关键词优化活动推荐**：系统会根据关键词匹配相关活动和景点

3. **根据情感倾向调整行程风格**：
   - `calm`：安排轻松、慢节奏的活动
   - `active`：增加运动、户外活动
   - `romantic`：推荐浪漫场景和体验
   - `adventurous`：增加冒险和挑战性活动
   - `peaceful`：安排宁静、平和的体验

如果不提供 `intent` 字段，系统将使用原有逻辑生成行程。

---

## 响应数据

### 成功响应（200 OK）

```json
{
  "success": true,
  "data": {
    "days": [
      {
        "day": 1,
        "date": "2024-06-01",
        "activities": [
          {
            "time": "09:00",
            "title": "沿火山步道徒步进入裂谷深处",
            "type": "attraction",
            "duration": 120,
            "location": { "lat": 46.7704, "lng": 8.4050 },
            "notes": "从停车场出发，沿标记清晰的火山步道前行约2公里，途中可观察火山岩地貌和地热现象。建议穿着防滑徒步鞋，携带充足饮水和防晒用品。步道前半段较平缓，后半段需小心碎石路面。最佳游览时间为上午9-11点，避开正午高温。适合有一定体力的游客，不适合老人和幼儿。避坑要点：不要偏离标记步道，注意脚下安全。",
            "cost": 400,
            "details": {
              "highlights": ["近距离观察活火山地貌", "体验地热现象", "欣赏裂谷壮丽景观"],
              "insiderTip": "日落时分在观景台拍照最美，光线柔和且游客较少",
              "bookingSignal": "无需预约，但建议避开周末高峰期"
            }
          },
          {
            "time": "14:00",
            "title": "琉森湖游船",
            "type": "attraction",
            "duration": 90,
            "location": { "lat": 47.0502, "lng": 8.3093 },
            "notes": "欣赏湖光山色",
            "cost": 50
          }
        ]
      },
      {
        "day": 2,
        "date": "2024-06-02",
        "activities": [
          {
            "time": "10:00",
            "title": "皮拉图斯山金色环游",
            "type": "attraction",
            "duration": 240,
            "location": { "lat": 46.9783, "lng": 8.2522 },
            "notes": "世界最陡的齿轮铁路",
            "cost": 120
          }
        ]
      }
    ],
    "totalCost": 8000,
    "summary": "这个5天瑞士琉森行程覆盖了铁力士峰、琉森湖、皮拉图斯山等经典景点，强调自然风光和户外活动体验。行程安排轻松合理，适合中等预算的旅行者。",
    "practicalInfo": {
      "weather": "未来一周以晴天为主，气温15-25°C，适合户外活动。建议携带轻便外套，早晚温差较大。",
      "safety": "瑞士整体安全状况良好，但需注意山区天气变化，遵守景区安全规定。",
      "plugType": "Type J（瑞士标准），220V，50Hz",
      "currency": "CHF（瑞士法郎），1 CHF ≈ 8 CNY",
      "culturalTaboos": "进入教堂需保持安静，不要大声喧哗。餐厅用餐建议给小费10-15%。",
      "packingList": "轻便外套、防滑徒步鞋、防晒用品、转换插头、现金（部分小店不接受信用卡）"
    }
  },
  "generatedAt": "2024-06-01T10:30:00.000Z"
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 是否成功 |
| `data` | object | 生成的行程数据 |
| `data.days` | array | 天数数组 |
| `data.days[].day` | number | 天数序号（从1开始） |
| `data.days[].date` | string | 日期（YYYY-MM-DD） |
| `data.days[].activities` | array | 活动数组 |
| `data.days[].activities[].time` | string | 活动时间（HH:MM格式） |
| `data.days[].activities[].title` | string | 活动标题 |
| `data.days[].activities[].type` | string | 活动类型：`attraction`（景点）、`meal`（用餐）、`hotel`（酒店）、`shopping`（购物）、`transport`（交通）、`ocean`（海洋活动） |
| `data.days[].activities[].duration` | number | 持续时间（分钟） |
| `data.days[].activities[].location` | object | 位置坐标 `{ "lat": number, "lng": number }` |
| `data.days[].activities[].notes` | string | 活动描述和建议（≥80字，包含具体怎么做、体验过程、行动细节） |
| `data.days[].activities[].cost` | number | 预估费用 |
| `data.days[].activities[].details` | object | 活动详细信息（可选） |
| `data.days[].activities[].details.highlights` | string[] | 活动核心亮点（2-3个） |
| `data.days[].activities[].details.insiderTip` | string | 行家视角的私房建议 |
| `data.days[].activities[].details.bookingSignal` | string | 预约要求说明 |
| `data.totalCost` | number | 总费用 |
| `data.summary` | string | 行程摘要 |
| `data.practicalInfo` | object | 实用信息（可选） |
| `data.practicalInfo.weather` | string | 未来一周天气预报摘要 |
| `data.practicalInfo.safety` | string | 安全提醒和注意事项 |
| `data.practicalInfo.plugType` | string | 当地插座类型和电压 |
| `data.practicalInfo.currency` | string | 当地货币及汇率 |
| `data.practicalInfo.culturalTaboos` | string | 文化禁忌和注意事项 |
| `data.practicalInfo.packingList` | string | 针对性打包清单 |
| `generatedAt` | string | 生成时间（ISO 8601格式） |

---

## 错误响应

### 400 Bad Request - 参数验证失败

```json
{
  "statusCode": 400,
  "message": [
    "destination must be a string",
    "days must be a number",
    "days must not be less than 1",
    "days must not be greater than 30",
    "startDate must be a valid ISO 8601 date string"
  ],
  "error": "Bad Request"
}
```

### 400 Bad Request - AI 生成超时

```json
{
  "statusCode": 400,
  "message": "行程生成超时（180秒）。请稍后重试，或减少行程天数。",
  "error": "Bad Request"
}
```

### 400 Bad Request - AI 生成失败

```json
{
  "statusCode": 400,
  "message": "AI 生成行程失败，请稍后重试",
  "error": "Bad Request"
}
```

---

## 使用示例

### JavaScript/TypeScript

```typescript
const generateData = {
  destination: '瑞士琉森',
  days: 5,
  startDate: '2024-06-01',
  preferences: {
    interests: ['自然风光', '户外活动'],
    budget: 'medium',
    travelStyle: 'relaxed',
  },
};

const response = await fetch('/api/v1/journeys/generate', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(generateData),
});

const result = await response.json();
if (result.success) {
  console.log('生成成功:', result.data);
  console.log('总费用:', result.data.totalCost);
  console.log('行程摘要:', result.data.summary);
  
  // 遍历天数
  result.data.days.forEach((day) => {
    console.log(`第${day.day}天 (${day.date}):`);
    day.activities.forEach((activity) => {
      console.log(`  ${activity.time} - ${activity.title}`);
    });
  });
}
```

---

## 注意事项

1. **AI 生成**：此接口使用 AI（DeepSeek）生成行程，可能需要较长时间（通常 30-180 秒）

2. **超时处理**：如果生成时间超过 5 分钟，会返回超时错误，建议减少行程天数后重试

3. **用户偏好**：
   - 如果用户已登录，会自动合并用户保存的偏好设置
   - 请求中的偏好会覆盖用户保存的偏好

4. **费用估算**：返回的费用为预估费用，实际费用可能因季节、汇率等因素有所变化

5. **位置坐标**：AI 生成的位置坐标可能不够精确，建议后续通过位置生成接口进行优化

6. **不保存到数据库**：此接口只生成行程数据，不会自动保存到数据库。如需保存，请使用创建行程接口

7. **偏好格式**：`preferences` 字段可以传入对象或数组（数组会自动转换为 `{ interests: [...] }` 格式）

8. **日期计算**：系统会根据 `startDate` 和 `days` 自动计算每天的日期

9. **活动详细信息**：AI会为每个活动生成详细信息（`details`字段），包括核心亮点、私房建议和预约要求

10. **实用信息**：AI会生成行程实用信息（`practicalInfo`字段），包括天气、安全、插座、汇率、文化禁忌和打包清单

11. **活动标题**：所有活动标题都采用动作导向的格式，让用户一眼看到"要做什么"

12. **活动描述**：每个活动的`notes`字段≥80字，包含具体怎么做、体验过程、行动细节等实用信息

13. **行程结构**：每天安排3-4个活动，确保行程充实但不紧张

