# 行程接口文档 - 14. 更新指定时间段

## 接口信息

**接口路径：** `PATCH /api/v1/journeys/{journeyId}/days/{dayId}/slots/{slotId}`

**接口描述：** 更新指定活动（时间段）的信息

**认证：** 需要 JWT Token（Bearer Token）

**Content-Type：** `application/json`

---

## 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `journeyId` | string | 是 | 行程ID（UUID） |
| `dayId` | string | 是 | 天数ID（UUID） |
| `slotId` | string | 是 | 活动ID（UUID） |

---

## 请求参数

### 请求体结构

所有字段都是可选的，只传入需要更新的字段即可。

```json
{
  "time": "10:00",
  "title": "更新后的活动标题",
  "type": "attraction",
  "duration": 150,
  "location": { "lat": 64.1419, "lng": -21.9274 },
  "notes": "更新后的备注",
  "cost": 1500
}
```

### 字段说明

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `time` | string | 否 | 活动时间（HH:MM格式） |
| `title` | string | 否 | 活动标题 |
| `type` | string | 否 | 活动类型：`attraction`、`meal`、`hotel`、`shopping`、`transport`、`ocean` |
| `duration` | number | 否 | 持续时间（分钟），最小值为 1 |
| `location` | object | 否 | 位置坐标 `{ "lat": number, "lng": number }` |
| `notes` | string | 否 | 活动描述和建议 |
| `cost` | number | 否 | 预估费用，最小值为 0 |

---

## 请求示例

### cURL

```bash
curl -X PATCH "http://localhost:3000/api/v1/journeys/04d7126d-219f-49ab-b71a-a595c18d6b8f/days/day-id-1/slots/activity-id-1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "time": "10:00",
    "title": "更新后的活动标题",
    "cost": 1500
  }'
```

---

## 响应数据

### 成功响应（200 OK）

```json
{
  "id": "activity-id-1",
  "time": "10:00",
  "title": "更新后的活动标题",
  "type": "attraction",
  "duration": 150,
  "location": { "lat": 64.1419, "lng": -21.9274 },
  "notes": "更新后的备注",
  "cost": 1500
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
  "message": "活动不存在: activity-id-1",
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

### 403 Forbidden - 天数或活动不属于此行程

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
    "duration must be a number",
    "duration must not be less than 1",
    "type must be one of the following values: attraction, meal, hotel, shopping, transport, ocean"
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
const slotId = 'activity-id-1';

// 只更新时间和费用
const updateData = {
  time: '10:00',
  cost: 1500,
};

const response = await fetch(`/api/v1/journeys/${journeyId}/days/${dayId}/slots/${slotId}`, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(updateData),
});

const activity = await response.json();
console.log('更新成功:', activity);
```

---

## 注意事项

1. **部分更新**：所有字段都是可选的，只传入需要更新的字段即可

2. **权限控制**：
   - 只能更新当前登录用户自己的行程活动
   - 系统会验证天数和活动是否属于指定的行程

3. **时间格式**：`time` 字段必须使用 `HH:MM` 格式（24小时制）

4. **活动类型**：如果更新 `type` 字段，必须是有效的活动类型值

5. **数值验证**：
   - `duration` 必须大于等于 1（分钟）
   - `cost` 必须大于等于 0

6. **位置坐标**：如果更新 `location`，必须包含 `lat` 和 `lng` 两个数字字段

