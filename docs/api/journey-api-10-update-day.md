# 行程接口文档 - 10. 更新指定天数

## 接口信息

**接口路径：** `PATCH /api/v1/journeys/{journeyId}/days/{dayId}`

**接口描述：** 更新指定天数的信息（day、date）

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

所有字段都是可选的，只传入需要更新的字段即可。

```json
{
  "day": 2,
  "date": "2025-11-25"
}
```

### 字段说明

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `day` | number | 否 | 天数序号（从1开始，最小值为1） |
| `date` | string | 否 | 日期（YYYY-MM-DD格式） |

---

## 请求示例

### cURL

```bash
curl -X PATCH "http://localhost:3000/api/v1/journeys/04d7126d-219f-49ab-b71a-a595c18d6b8f/days/day-id-1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "day": 2,
    "date": "2025-11-25"
  }'
```

---

## 响应数据

### 成功响应（200 OK）

```json
{
  "id": "day-id-1",
  "day": 2,
  "date": "2025-11-25",
  "activities": [
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
  ]
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 天数ID |
| `day` | number | 天数序号 |
| `date` | string | 日期（YYYY-MM-DD） |
| `activities` | array | 活动数组（包含该天的所有活动） |
| `activities[].id` | string | 活动ID |
| `activities[].time` | string | 时间（HH:MM格式） |
| `activities[].title` | string | 活动标题 |
| `activities[].type` | string | 活动类型 |
| `activities[].duration` | number | 持续时间（分钟） |
| `activities[].location` | object | 位置坐标 |
| `activities[].notes` | string | 活动备注 |
| `activities[].cost` | number | 预估费用 |

---

## 错误响应

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "天数不存在: day-id-1",
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
    "day must be a number",
    "day must not be less than 1",
    "date must be a valid ISO 8601 date string"
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

// 只更新日期
const updateData = {
  date: '2025-11-25',
};

const response = await fetch(`/api/v1/journeys/${journeyId}/days/${dayId}`, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(updateData),
});

const day = await response.json();
console.log('更新成功:', day);
```

---

## 注意事项

1. **部分更新**：所有字段都是可选的，只传入需要更新的字段即可

2. **权限控制**：
   - 只能更新当前登录用户自己的行程天数
   - 系统会验证天数是否属于指定的行程

3. **活动保留**：更新天数信息不会影响该天的活动，所有活动都会保留

4. **日期格式**：`date` 字段必须使用 `YYYY-MM-DD` 格式

5. **天数序号**：`day` 字段必须大于等于 1

