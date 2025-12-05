# 行程接口文档 - 12. 获取指定天数的所有时间段

## 接口信息

**接口路径：** `GET /api/v1/journeys/{journeyId}/days/{dayId}/slots`

**接口描述：** 获取指定天数的所有活动（时间段）

**认证：** 需要 JWT Token（Bearer Token）

---

## 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `journeyId` | string | 是 | 行程ID（UUID） |
| `dayId` | string | 是 | 天数ID（UUID） |

---

## 请求示例

### cURL

```bash
curl -X GET "http://localhost:3000/api/v1/journeys/04d7126d-219f-49ab-b71a-a595c18d6b8f/days/day-id-1/slots" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 响应数据

### 成功响应（200 OK）

```json
[
  {
    "id": "activity-id-1",
    "time": "09:00",
    "title": "蓝湖温泉",
    "type": "attraction",
    "duration": 120,
    "location": { "lat": 64.1419, "lng": -21.9274 },
    "notes": "提前预订门票",
    "cost": 1200,
    "chineseName": "蓝湖温泉",
    "englishName": "Blue Lagoon",
    "destinationLanguageName": "Bláa lónið",
    "locationName": "Nordurljosavegur 9, 240 Grindavík, Iceland"
  },
  {
    "id": "activity-id-2",
    "time": "14:00",
    "title": "黄金圈游览",
    "type": "attraction",
    "duration": 180,
    "location": { "lat": 64.2550, "lng": -20.5145 },
    "notes": "包含三个主要景点",
    "cost": 2500,
    "chineseName": "黄金圈游览",
    "englishName": "Golden Circle Tour",
    "destinationLanguageName": "Gullni hringurinn",
    "locationName": "Golden Circle, Iceland"
  },
  {
    "id": "activity-id-3",
    "time": "19:00",
    "title": "冰岛特色餐厅",
    "type": "meal",
    "duration": 90,
    "location": { "lat": 64.1419, "lng": -21.9274 },
    "notes": "推荐尝试当地特色菜",
    "cost": 800,
    "chineseName": "冰岛特色餐厅",
    "englishName": "Icelandic Restaurant",
    "destinationLanguageName": "Íslenskt veitingahús",
    "locationName": "Reykjavik, Iceland"
  }
]
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `[].id` | string | 活动ID |
| `[].time` | string | 时间（HH:MM格式） |
| `[].title` | string | 活动标题 |
| `[].type` | string | 活动类型：`attraction`（景点）、`meal`（用餐）、`hotel`（酒店）、`shopping`（购物）、`transport`（交通）、`ocean`（海洋活动） |
| `[].duration` | number | 持续时间（分钟） |
| `[].location` | object | 位置坐标 `{ "lat": number, "lng": number }` |
| `[].notes` | string | 活动备注 |
| `[].cost` | number | 预估费用 |
| `[].chineseName` | string | 中文名称（可选） |
| `[].englishName` | string | 英文名称（可选） |
| `[].destinationLanguageName` | string | 目的地语言名称（可选，当地语言） |
| `[].locationName` | string | 位置名称（可选，完整地址或位置描述） |

---

## 错误响应

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "行程不存在: 04d7126d-219f-49ab-b71a-a595c18d6b8f",
  "error": "Not Found"
}
```

### 403 Forbidden

```json
{
  "statusCode": 403,
  "message": "无权访问此行程",
  "error": "Forbidden"
}
```

### 403 Forbidden - 天数不属于此行程

```json
{
  "statusCode": 403,
  "message": "天数不属于此行程",
  "error": "Forbidden"
}
```

---

## 使用示例

### JavaScript/TypeScript

```typescript
const journeyId = '04d7126d-219f-49ab-b71a-a595c18d6b8f';
const dayId = 'day-id-1';

const response = await fetch(`/api/v1/journeys/${journeyId}/days/${dayId}/slots`, {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const slots = await response.json();
console.log('时间段列表:', slots);

// 遍历时间段
slots.forEach((slot) => {
  console.log(`${slot.time} - ${slot.title} (${slot.type})`);
});
```

---

## 注意事项

1. **排序**：返回的活动按 `time` 字段升序排列

2. **权限控制**：
   - 只能查看当前登录用户自己的行程活动
   - 系统会验证天数是否属于指定的行程

3. **空数组**：如果该天没有活动，将返回空数组 `[]`

4. **术语说明**：接口路径中使用 `slots`（时间段），但响应数据中的字段名与活动相关（`time`、`title`、`type` 等）

