# 行程接口文档 - 9. 为行程添加天数

## 接口信息

**接口路径：** `POST /api/v1/journeys/{journeyId}/days`

**接口描述：** 为指定行程添加一个新的天数

**认证：** 需要 JWT Token（Bearer Token）

**Content-Type：** `application/json`

---

## 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `journeyId` | string | 是 | 行程ID（UUID） |

---

## 请求参数

### 请求体结构

```json
{
  "day": 1,
  "date": "2025-11-24"
}
```

### 字段说明

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `day` | number | 是 | 天数序号（从1开始，最小值为1） |
| `date` | string | 是 | 日期（YYYY-MM-DD格式） |

---

## 请求示例

### cURL

```bash
curl -X POST "http://localhost:3000/api/v1/journeys/04d7126d-219f-49ab-b71a-a595c18d6b8f/days" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "day": 1,
    "date": "2025-11-24"
  }'
```

---

## 响应数据

### 成功响应（200 OK）

```json
{
  "id": "day-id-1",
  "day": 1,
  "date": "2025-11-24",
  "activities": []
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 天数ID |
| `day` | number | 天数序号 |
| `date` | string | 日期（YYYY-MM-DD） |
| `activities` | array | 活动数组（新创建的天数默认为空数组） |

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

const newDay = {
  day: 1,
  date: '2025-11-24',
};

const response = await fetch(`/api/v1/journeys/${journeyId}/days`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(newDay),
});

const day = await response.json();
console.log('创建成功:', day);
```

---

## 注意事项

1. **天数序号**：`day` 字段必须大于等于 1，建议与行程的实际天数顺序一致

2. **日期格式**：`date` 字段必须使用 `YYYY-MM-DD` 格式（ISO 8601日期格式）

3. **权限控制**：只能为当前登录用户自己的行程添加天数

4. **空活动列表**：新创建的天数默认没有活动，需要后续通过添加活动接口来添加活动

5. **重复天数**：系统不检查天数序号是否重复，请确保前端逻辑正确

