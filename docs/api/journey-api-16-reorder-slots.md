# 行程接口文档 - 16. 重新排序时间段

## 接口信息

**接口路径：** `POST /api/v1/journeys/{journeyId}/days/{dayId}/slots/reorder`

**接口描述：** 根据提供的活动 ID 列表重新排序指定天数的活动

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
  "activityIds": ["activity-id-2", "activity-id-1", "activity-id-3"]
}
```

### 字段说明

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `activityIds` | string[] | 是 | 活动 ID 列表（按新顺序排列），必须包含该天的所有活动 ID |

---

## 请求示例

### cURL

```bash
curl -X POST "http://localhost:3000/api/v1/journeys/04d7126d-219f-49ab-b71a-a595c18d6b8f/days/day-id-1/slots/reorder" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "activityIds": ["activity-id-2", "activity-id-1", "activity-id-3"]
  }'
```

---

## 响应数据

### 成功响应（200 OK）

返回重新排序后的活动列表（按新顺序）：

```json
[
  {
    "id": "activity-id-2",
    "time": "14:00",
    "title": "黄金圈游览",
    "type": "attraction",
    "duration": 180,
    "location": { "lat": 64.2550, "lng": -20.5145 },
    "notes": "包含三个主要景点",
    "cost": 2500
  },
  {
    "id": "activity-id-1",
    "time": "09:00",
    "title": "蓝湖温泉",
    "type": "attraction",
    "duration": 120,
    "location": { "lat": 64.1419, "lng": -21.9274 },
    "notes": "提前预订门票",
    "cost": 1200
  },
  {
    "id": "activity-id-3",
    "time": "19:00",
    "title": "冰岛特色餐厅",
    "type": "meal",
    "duration": 90,
    "location": { "lat": 64.1419, "lng": -21.9274 },
    "notes": "推荐尝试当地特色菜",
    "cost": 800
  }
]
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `[].id` | string | 活动ID |
| `[].time` | string | 时间（HH:MM格式） |
| `[].title` | string | 活动标题 |
| `[].type` | string | 活动类型 |
| `[].duration` | number | 持续时间（分钟） |
| `[].location` | object | 位置坐标 |
| `[].notes` | string | 活动备注 |
| `[].cost` | number | 预估费用 |

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

### 400 Bad Request - 活动 ID 列表不完整

```json
{
  "statusCode": 400,
  "message": "活动 ID 列表必须包含该天的所有活动",
  "error": "Bad Request"
}
```

### 400 Bad Request - 活动不属于该天

```json
{
  "statusCode": 400,
  "message": "活动不属于该天",
  "error": "Bad Request"
}
```

### 400 Bad Request - 参数验证失败

```json
{
  "statusCode": 400,
  "message": [
    "activityIds must be an array",
    "each value in activityIds must be a string"
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

// 假设当前活动顺序为：activity-id-1, activity-id-2, activity-id-3
// 要调整为：activity-id-2, activity-id-1, activity-id-3
const reorderData = {
  activityIds: ['activity-id-2', 'activity-id-1', 'activity-id-3'],
};

const response = await fetch(`/api/v1/journeys/${journeyId}/days/${dayId}/slots/reorder`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(reorderData),
});

const reorderedActivities = await response.json();
console.log('重新排序后的活动列表:', reorderedActivities);
```

---

## 注意事项

1. **完整列表**：`activityIds` 数组必须包含该天的**所有**活动 ID，不能遗漏或添加不存在的活动 ID

2. **顺序**：`activityIds` 数组的顺序即为新的活动顺序，第一个 ID 对应的活动将排在第一位

3. **权限控制**：
   - 只能重新排序当前登录用户自己的行程活动
   - 系统会验证天数是否属于指定的行程
   - 系统会验证所有活动是否属于该天

4. **验证规则**：
   - 活动 ID 列表必须包含该天的所有活动（不能多也不能少）
   - 所有活动 ID 必须属于该天
   - 活动 ID 不能重复

5. **使用场景**：适用于用户在前端拖拽调整活动顺序的场景

6. **返回数据**：接口返回重新排序后的完整活动列表，按新顺序排列

