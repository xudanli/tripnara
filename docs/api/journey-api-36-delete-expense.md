# 行程接口文档 - 36. 删除支出

## 接口信息

**接口路径：** `DELETE /api/v1/journeys/{journeyId}/expenses/{expenseId}`

**接口描述：** 删除指定的支出记录

**认证：** 需要 JWT Token（Bearer Token）

**Content-Type：** `application/json`

---

## 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `journeyId` | string | 是 | 行程ID（UUID） |
| `expenseId` | string | 是 | 支出ID（UUID） |

---

## 请求示例

### cURL

```bash
curl -X DELETE "http://localhost:3000/api/v1/journeys/b8b8626a-b914-4109-9a95-6441676df252/expenses/exp_123456" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript/TypeScript

```typescript
const journeyId = 'b8b8626a-b914-4109-9a95-6441676df252';
const expenseId = 'exp_123456';

const response = await fetch(`/api/v1/journeys/${journeyId}/expenses/${expenseId}`, {
  method: 'DELETE',
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const result = await response.json();
console.log('删除成功:', result);
```

---

## 响应数据

### 成功响应（200 OK）

```json
{
  "success": true,
  "message": "支出删除成功"
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 是否成功 |
| `message` | string | 提示消息 |

---

## 错误响应

### 403 Forbidden

```json
{
  "statusCode": 403,
  "message": "无权删除此行程的支出",
  "error": "Forbidden"
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "支出不存在或不属于此行程: exp_123456",
  "error": "Not Found"
}
```

---

## 使用说明

1. **删除操作**：删除操作不可逆，请谨慎操作
2. **权限验证**：只有行程的创建者或成员可以删除支出
3. **关联检查**：系统会验证支出是否属于指定的行程

---

## 注意事项

1. 删除操作是永久性的，无法恢复
2. 只有行程的创建者或成员可以删除支出
3. 支出必须属于指定的行程
4. 删除后，该支出将从数据库中永久移除
