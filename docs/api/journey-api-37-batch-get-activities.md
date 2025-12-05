# 行程接口文档 - 37. 批量获取活动详情

## 接口信息

**接口路径：** `POST /api/v1/journeys/:journeyId/activities/batch`

**接口描述：** 批量获取指定行程中多个天数的所有活动详情。如果不提供 dayIds，则返回整个行程所有天的活动。

**认证：** 需要 JWT Token（Bearer Token）

**Content-Type：** `application/json`

---

## 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `journeyId` | string | 是 | 行程ID（UUID） |

## 请求参数

### 请求体结构

```json
{
  "dayIds": ["day-id-1", "day-id-2", "day-id-3"]
}
```

**字段说明：**

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `dayIds` | string[] | 否 | 天数ID列表。如果不提供或为空数组，则返回整个行程所有天的活动 |

---

## 请求示例

### 获取指定天数的活动

```bash
POST /api/v1/journeys/770e8400-e29b-41d4-a716-446655440000/activities/batch
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "dayIds": ["day-id-1", "day-id-2"]
}
```

### 获取整个行程所有天的活动

```bash
POST /api/v1/journeys/770e8400-e29b-41d4-a716-446655440000/activities/batch
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{}
```

或

```bash
POST /api/v1/journeys/770e8400-e29b-41d4-a716-446655440000/activities/batch
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "dayIds": []
}
```

---

## 响应数据

### 成功响应（200 OK）

```json
{
  "activities": {
    "day-id-1": [
      {
        "id": "activity-id-1",
        "time": "09:00",
        "title": "探秘雷克雅未克大教堂的螺旋天际",
        "type": "attraction",
        "duration": 90,
        "location": {
          "lat": 64.1419,
          "lng": -21.9274
        },
        "notes": "登上哈尔格林姆教堂塔顶，俯瞰雷克雅未克彩色屋顶和远山...",
        "cost": 1200,
        "chineseName": "探秘雷克雅未克大教堂的螺旋天际",
        "englishName": "Hallgrímskirkja Spiral Skyline Tour",
        "destinationLanguageName": "Hallgrímskirkja Spiral Skyline Tour",
        "locationName": "Hallgrímstorg 1, 101 Reykjavík, Iceland",
        "details": {
          "notes": "...",
          "description": "...",
          "name": {
            "chinese": "探秘雷克雅未克大教堂的螺旋天际",
            "english": "Hallgrímskirkja Spiral Skyline Tour",
            "local": "Hallgrímskirkja Spiral Skyline Tour"
          },
          "address": {
            "chinese": "...",
            "english": "...",
            "local": "..."
          },
          "transportation": "...",
          "openingHours": "...",
          "pricing": {
            "detail": "..."
          },
          "rating": 4.7,
          "recommendations": {
            "visitTips": "...",
            "bestTimeToVisit": "...",
            "nearbyAttractions": "...",
            "visitDuration": 45,
            "outfitSuggestions": "...",
            "culturalTips": "...",
            "bookingInfo": "..."
          },
          "contact": {
            "info": "..."
          },
          "accessibility": "...",
          "category": "宗教建筑与观景台"
        }
      }
    ],
    "day-id-2": [
      {
        "id": "activity-id-2",
        "time": "08:00",
        "title": "驱车前往黄金圈探秘之旅",
        "type": "transport",
        "duration": 120,
        "location": {
          "lat": 64.255,
          "lng": -20.225
        },
        "notes": "租车或参加小团前往黄金圈，沿途欣赏冰岛高原风光...",
        "cost": 5000,
        "details": {
          "notes": "...",
          "description": "...",
          "name": {
            "chinese": "黄金圈探秘之旅起点",
            "english": "Golden Circle Tour Starting Point",
            "local": "Golden Circle Tour Starting Point"
          },
          "address": {
            "chinese": "...",
            "english": "...",
            "local": "..."
          },
          "transportation": "...",
          "openingHours": "...",
          "pricing": {
            "detail": "..."
          },
          "rating": 4.5,
          "recommendations": {
            "visitTips": "...",
            "bestTimeToVisit": "...",
            "nearbyAttractions": "...",
            "visitDuration": 480,
            "outfitSuggestions": "...",
            "culturalTips": "...",
            "bookingInfo": "..."
          },
          "contact": {
            "info": "..."
          },
          "accessibility": "...",
          "category": "交通和自驾游起点"
        }
      }
    ]
  },
  "totalCount": 2
}
```

**响应字段说明：**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `activities` | object | 活动详情，按天数ID分组。键为天数ID，值为该天数的活动数组 |
| `activities[dayId]` | array | 指定天数的活动列表，按时间排序 |
| `totalCount` | number | 总活动数量 |

**活动对象字段说明：**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `id` | string | 活动ID |
| `time` | string | 活动时间（HH:mm格式） |
| `title` | string | 活动标题 |
| `type` | string | 活动类型：`attraction`、`meal`、`hotel`、`shopping`、`transport`、`ocean` |
| `duration` | number | 持续时间（分钟） |
| `location` | object | 位置坐标 `{ lat: number, lng: number }` |
| `notes` | string | 备注 |
| `cost` | number | 预估费用 |
| `chineseName` | string | 中文名称（可选，从 details.name.chinese 或自动推导） |
| `englishName` | string | 英文名称（可选，从 details.name.english 或自动推导） |
| `destinationLanguageName` | string | 目的地语言名称（可选，从 details.name.local 提取） |
| `locationName` | string | 位置名称（可选，从 details.address 或自动构建） |
| `details` | object | 详细信息（JSON对象），包含多语言名称、地址、开放时间、价格详情、推荐信息等。**会被保存到数据库** |

---

## 错误响应

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden

```json
{
  "statusCode": 403,
  "message": "无权访问此行程"
}
```

或

```json
{
  "statusCode": 403,
  "message": "天数 xxx 不属于此行程"
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "行程不存在: xxx"
}
```

---

## 使用场景

1. **获取整个行程的所有活动**：不传 `dayIds` 或传空数组，一次性获取所有天的活动
2. **获取指定天数的活动**：传入具体的 `dayIds` 数组，只获取这些天的活动
3. **减少请求次数**：相比多次调用单个接口，批量接口可以减少网络请求次数

---

## 注意事项

1. 所有活动都包含完整的 `details` 字段（如果已保存）
2. 活动按 `dayId` 和 `time` 排序
3. 如果某个天数没有活动，返回的数组为空 `[]`
4. 如果某个天数ID不属于此行程，会返回 403 错误
