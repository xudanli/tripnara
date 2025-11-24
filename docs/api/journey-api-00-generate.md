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
  }
}
```

### 字段说明

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `destination` | string | 是 | 目的地名称（如：瑞士琉森、日本东京） |
| `days` | number | 是 | 旅行天数，范围 1-30 |
| `startDate` | string | 是 | 旅行开始日期（YYYY-MM-DD格式） |
| `preferences` | object | 否 | 用户偏好 |
| `preferences.interests` | string[] | 否 | 兴趣列表（如：自然风光、户外活动、文化历史） |
| `preferences.budget` | string | 否 | 预算等级：`low`（经济）、`medium`（中等）、`high`（豪华） |
| `preferences.travelStyle` | string | 否 | 旅行风格：`relaxed`（轻松）、`moderate`（适中）、`intensive`（紧凑） |

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
    }
  }'
```

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
            "title": "铁力士峰云端漫步",
            "type": "attraction",
            "duration": 120,
            "location": { "lat": 46.7704, "lng": 8.4050 },
            "notes": "详细的游览建议和体验描述",
            "cost": 400
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
    "summary": "这个5天瑞士琉森行程覆盖了铁力士峰、琉森湖、皮拉图斯山等经典景点，强调自然风光和户外活动体验。行程安排轻松合理，适合中等预算的旅行者。"
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
| `data.days[].activities[].notes` | string | 活动描述和建议 |
| `data.days[].activities[].cost` | number | 预估费用 |
| `data.totalCost` | number | 总费用 |
| `data.summary` | string | 行程摘要 |
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

