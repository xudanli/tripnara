# 行程模版接口文档 - 5. 删除行程模版

## 接口信息

**接口路径：** `DELETE /api/v1/itineraries/{id}`

**接口描述：** 删除指定的行程模版

**认证：** 需要 JWT Token（Bearer Token）

---

## 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `id` | string | 是 | 行程模版ID |

---

## 请求示例

```
DELETE /api/v1/itineraries/123e4567-e89b-12d3-a456-426614174000
```

### cURL

```bash
curl -X DELETE "http://localhost:3000/api/v1/itineraries/123e4567-e89b-12d3-a456-426614174000" \
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
  "message": "行程模版不存在: 123e4567-e89b-12d3-a456-426614174000",
  "error": "Not Found"
}
```

### 403 Forbidden

```json
{
  "statusCode": 403,
  "message": "无权删除此行程模版",
  "error": "Forbidden"
}
```

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "未授权",
  "error": "Unauthorized"
}
```

---

## 使用示例

### JavaScript/TypeScript

```typescript
const itineraryId = '123e4567-e89b-12d3-a456-426614174000';

const response = await fetch(`/api/v1/itineraries/${itineraryId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const result = await response.json();
if (result.success) {
  console.log('删除成功');
} else {
  console.error('删除失败:', result.message);
}
```

### 带确认的删除示例

```typescript
async function deleteItinerary(itineraryId: string, confirm: boolean = false) {
  if (!confirm) {
    const userConfirm = window.confirm('确定要删除这个行程模版吗？此操作不可恢复。');
    if (!userConfirm) {
      return;
    }
  }

  try {
    const response = await fetch(`/api/v1/itineraries/${itineraryId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const result = await response.json();
      console.log('删除成功:', result.message);
      return true;
    } else {
      const error = await response.json();
      console.error('删除失败:', error.message);
      return false;
    }
  } catch (error) {
    console.error('删除请求失败:', error);
    return false;
  }
}
```

---

## 注意事项

1. **不可恢复**：删除操作是不可逆的，删除后无法恢复
2. **权限控制**：只能删除当前登录用户自己的行程模版
3. **级联删除**：删除行程模版时，会同时删除相关的天数、活动等关联数据
4. **建议操作**：删除前建议先获取详情确认，或使用确认对话框提示用户
5. **状态无关**：无论行程模版处于什么状态（`draft`、`published`、`archived`），都可以删除

