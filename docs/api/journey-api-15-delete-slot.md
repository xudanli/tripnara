# 行程接口文档 - 15. 删除指定时间段

## 接口信息

**接口路径：** `DELETE /api/v1/journeys/{journeyId}/days/{dayId}/slots/{slotId}`

**接口描述：** 删除指定的活动（时间段）

**认证：** 需要 JWT Token（Bearer Token）

---

## 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `journeyId` | string | 是 | 行程ID（UUID） |
| `dayId` | string | 是 | 天数ID（UUID） |
| `slotId` | string | 是 | 活动ID（UUID） |

---

## 请求示例

### cURL

```bash
curl -X DELETE "http://localhost:3000/api/v1/journeys/04d7126d-219f-49ab-b71a-a595c18d6b8f/days/day-id-1/slots/activity-id-1" \
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

---

## 使用示例

### JavaScript/TypeScript

```typescript
const journeyId = '04d7126d-219f-49ab-b71a-a595c18d6b8f';
const dayId = 'day-id-1';
const slotId = 'activity-id-1';

const response = await fetch(`/api/v1/journeys/${journeyId}/days/${dayId}/slots/${slotId}`, {
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

1. **权限控制**：
   - 只能删除当前登录用户自己的行程活动
   - 系统会验证天数和活动是否属于指定的行程

2. **不可恢复**：删除操作不可恢复，请谨慎操作

3. **硬删除**：当前实现为硬删除（物理删除），未来可能会改为软删除

4. **级联关系**：删除活动不会影响所属的天数，天数仍然存在

