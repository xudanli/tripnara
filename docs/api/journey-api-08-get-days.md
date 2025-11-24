# 行程接口文档 - 8. 获取行程的所有天数

## 接口信息

**接口路径：** `GET /api/v1/journeys/{journeyId}/days`

**接口描述：** 获取指定行程的所有天数及其活动信息

**认证：** 需要 JWT Token（Bearer Token）

---

## 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `journeyId` | string | 是 | 行程ID（UUID） |

---

## 请求示例

### cURL

```bash
curl -X GET "http://localhost:3000/api/v1/journeys/04d7126d-219f-49ab-b71a-a595c18d6b8f/days" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 响应数据

### 成功响应（200 OK）

```json
[
  {
    "id": "day-id-1",
    "day": 1,
    "date": "2025-11-24",
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
      },
      {
        "id": "activity-id-2",
        "time": "14:00",
        "title": "黄金圈游览",
        "type": "attraction",
        "duration": 180,
        "location": { "lat": 64.2550, "lng": -20.5145 },
        "notes": "包含三个主要景点",
        "cost": 2500
      }
    ]
  },
  {
    "id": "day-id-2",
    "day": 2,
    "date": "2025-11-25",
    "activities": [
      {
        "id": "activity-id-3",
        "time": "10:00",
        "title": "冰川徒步",
        "type": "attraction",
        "duration": 240,
        "location": { "lat": 64.1419, "lng": -21.9274 },
        "notes": "需要专业装备",
        "cost": 3500
      }
    ]
  }
]
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `[].id` | string | 天数ID |
| `[].day` | number | 天数序号（从1开始） |
| `[].date` | string | 日期（YYYY-MM-DD） |
| `[].activities` | array | 活动数组（按时间排序） |
| `[].activities[].id` | string | 活动ID |
| `[].activities[].time` | string | 时间（HH:MM格式） |
| `[].activities[].title` | string | 活动标题 |
| `[].activities[].type` | string | 活动类型：`attraction`、`meal`、`hotel`、`shopping`、`transport`、`ocean` |
| `[].activities[].duration` | number | 持续时间（分钟） |
| `[].activities[].location` | object | 位置坐标 `{ "lat": number, "lng": number }` |
| `[].activities[].notes` | string | 活动备注 |
| `[].activities[].cost` | number | 预估费用 |

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

---

## 使用示例

### JavaScript/TypeScript

```typescript
const journeyId = '04d7126d-219f-49ab-b71a-a595c18d6b8f';

const response = await fetch(`/api/v1/journeys/${journeyId}/days`, {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const days = await response.json();
console.log('天数列表:', days);

// 遍历天数
days.forEach((day) => {
  console.log(`第${day.day}天 (${day.date}):`);
  day.activities.forEach((activity) => {
    console.log(`  ${activity.time} - ${activity.title}`);
  });
});
```

---

## 注意事项

1. **排序**：返回的天数按 `day` 字段升序排列，活动按 `time` 字段升序排列

2. **权限控制**：只能查看当前登录用户自己的行程天数

3. **空数组**：如果行程没有天数，将返回空数组 `[]`

4. **关联数据**：返回的数据包含完整的活动信息，无需额外请求

