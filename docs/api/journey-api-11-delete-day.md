# 行程接口文档 - 11. 删除指定天数

## 接口信息

**接口路径：** `DELETE /api/v1/journeys/{journeyId}/days/{dayId}`

**接口描述：** 删除指定的天数（会级联删除该天的所有活动）

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
curl -X DELETE "http://localhost:3000/api/v1/journeys/04d7126d-219f-49ab-b71a-a595c18d6b8f/days/day-id-1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 响应数据

### 成功响应（200 OK）

```json
{
  "success": true,
  "message": "删除成功"
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 是否成功 |
| `message` | string | 响应消息 |

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

---

## 使用示例

### JavaScript/TypeScript

```typescript
const journeyId = '04d7126d-219f-49ab-b71a-a595c18d6b8f';
const dayId = 'day-id-1';

const response = await fetch(`/api/v1/journeys/${journeyId}/days/${dayId}`, {
  method: 'DELETE',
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const result = await response.json();
if (result.success) {
  console.log('删除成功');
}
```

---

## 注意事项

1. **级联删除**：删除天数会同时删除该天的所有活动数据

2. **权限控制**：
   - 只能删除当前登录用户自己的行程天数
   - 系统会验证天数是否属于指定的行程

3. **不可恢复**：删除操作不可恢复，请谨慎操作

4. **硬删除**：当前实现为硬删除（物理删除），未来可能会改为软删除

