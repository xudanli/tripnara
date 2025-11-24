# 行程接口文档 - 13. 为指定天数添加时间段

## 接口信息

**接口路径：** `POST /api/v1/journeys/{journeyId}/days/{dayId}/slots`

**接口描述：** 为指定天数添加一个新的活动（时间段）

**认证：** 需要 JWT Token（Bearer Token）

**Content-Type：** `application/json`

---

## 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `journeyId` | string | 是 | 行程ID（UUID） |
| `dayId` | string | 是 | 天数ID（UUID） |

---

## 请求参数

### 请求体结构

```json
{
  "time": "09:00",
  "title": "蓝湖温泉",
  "type": "attraction",
  "duration": 120,
  "location": { "lat": 64.1419, "lng": -21.9274 },
  "notes": "提前预订门票",
  "cost": 1200
}
```

### 字段说明

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `time` | string | 是 | 活动时间（HH:MM格式，如：09:00） |
| `title` | string | 是 | 活动标题 |
| `type` | string | 是 | 活动类型：`attraction`（景点）、`meal`（用餐）、`hotel`（酒店）、`shopping`（购物）、`transport`（交通）、`ocean`（海洋活动） |
| `duration` | number | 是 | 持续时间（分钟），最小值为 1 |
| `location` | object | 是 | 位置坐标 `{ "lat": number, "lng": number }` |
| `notes` | string | 否 | 活动描述和建议 |
| `cost` | number | 否 | 预估费用，最小值为 0 |

---

## 请求示例

### cURL

```bash
curl -X POST "http://localhost:3000/api/v1/journeys/04d7126d-219f-49ab-b71a-a595c18d6b8f/days/day-id-1/slots" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "time": "09:00",
    "title": "蓝湖温泉",
    "type": "attraction",
    "duration": 120,
    "location": { "lat": 64.1419, "lng": -21.9274 },
    "notes": "提前预订门票",
    "cost": 1200
  }'
```

---

## 响应数据

### 成功响应（200 OK）

```json
{
  "id": "activity-id-1",
  "time": "09:00",
  "title": "蓝湖温泉",
  "type": "attraction",
  "duration": 120,
  "location": { "lat": 64.1419, "lng": -21.9274 },
  "notes": "提前预订门票",
  "cost": 1200
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 活动ID |
| `time` | string | 时间（HH:MM格式） |
| `title` | string | 活动标题 |
| `type` | string | 活动类型 |
| `duration` | number | 持续时间（分钟） |
| `location` | object | 位置坐标 |
| `notes` | string | 活动备注 |
| `cost` | number | 预估费用 |

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
  "message": "无权修改此行程",
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

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": [
    "time must be a string",
    "title must be a string",
    "type must be one of the following values: attraction, meal, hotel, shopping, transport, ocean",
    "duration must be a number",
    "duration must not be less than 1",
    "location must be an object"
  ],
  "error": "Bad Request"
}
```

---

## 使用示例

### JavaScript/TypeScript

```typescript
const journeyId = '04d7126d-219f-49ab-b71a-a595c18d6b8f';
const dayId = 'day-id-1';

const newActivity = {
  time: '09:00',
  title: '蓝湖温泉',
  type: 'attraction',
  duration: 120,
  location: { lat: 64.1419, lng: -21.9274 },
  notes: '提前预订门票',
  cost: 1200,
};

const response = await fetch(`/api/v1/journeys/${journeyId}/days/${dayId}/slots`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(newActivity),
});

const activity = await response.json();
console.log('创建成功:', activity);
```

---

## 注意事项

1. **时间格式**：`time` 字段必须使用 `HH:MM` 格式（24小时制）

2. **活动类型**：`type` 字段必须是以下值之一：
   - `attraction` - 景点
   - `meal` - 用餐
   - `hotel` - 酒店
   - `shopping` - 购物
   - `transport` - 交通
   - `ocean` - 海洋活动

3. **持续时间**：`duration` 字段必须大于等于 1（分钟）

4. **位置坐标**：`location` 对象必须包含 `lat`（纬度）和 `lng`（经度）两个数字字段

5. **权限控制**：
   - 只能为当前登录用户自己的行程添加活动
   - 系统会验证天数是否属于指定的行程

6. **费用**：`cost` 字段为可选，如果提供，必须大于等于 0

