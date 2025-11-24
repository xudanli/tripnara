# 行程接口文档 - 7. 删除行程

## 接口信息

**接口路径：** `DELETE /api/v1/journeys/{journeyId}`

**接口描述：** 删除指定的行程（会级联删除相关的 days 和 activities）

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
curl -X DELETE "http://localhost:3000/api/v1/journeys/04d7126d-219f-49ab-b71a-a595c18d6b8f" \
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
  "message": "行程不存在: 04d7126d-219f-49ab-b71a-a595c18d6b8f",
  "error": "Not Found"
}
```

### 403 Forbidden

```json
{
  "statusCode": 403,
  "message": "无权删除此行程",
  "error": "Forbidden"
}
```

---

## 使用示例

### JavaScript/TypeScript

```typescript
const journeyId = '04d7126d-219f-49ab-b71a-a595c18d6b8f';

const response = await fetch(`/api/v1/journeys/${journeyId}`, {
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

1. **级联删除**：删除行程会同时删除该行程的所有 days 和 activities 数据

2. **权限控制**：只能删除当前登录用户自己的行程

3. **不可恢复**：删除操作不可恢复，请谨慎操作

4. **软删除**：当前实现为硬删除（物理删除），未来可能会改为软删除（标记为已删除）

