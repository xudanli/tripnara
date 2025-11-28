# 行程接口文档 - 37. 验证邀请

## 接口信息

**接口路径：** `GET /api/v1/journeys/invitations/{invitationId}`

**接口描述：** 验证邀请链接的有效性，获取邀请信息（公开接口，无需认证）

**认证：** 无需认证（公开接口）

**Content-Type：** `application/json`

---

## 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `invitationId` | string | 是 | 邀请ID（UUID） |

---

## 请求示例

### cURL

```bash
curl -X GET "http://localhost:3000/api/v1/journeys/invitations/inv_123456"
```

### JavaScript/TypeScript

```typescript
const invitationId = 'inv_123456';

const response = await fetch(`/api/v1/journeys/invitations/${invitationId}`, {
  method: 'GET',
});

const result = await response.json();
console.log('邀请信息:', result);
```

---

## 响应数据

### 成功响应（200 OK）

```json
{
  "success": true,
  "data": {
    "invitationId": "inv_123456",
    "journeyId": "b8b8626a-b914-4109-9a95-6441676df252",
    "email": "newmember@example.com",
    "role": "member",
    "journeyName": "冰岛之旅",
    "message": "欢迎加入我们的冰岛之旅！",
    "status": "pending",
    "expiresAt": "2025-12-02T10:00:00.000Z",
    "invitedBy": {
      "id": "user_001",
      "name": "张三",
      "email": "zhangsan@example.com"
    }
  }
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 是否成功 |
| `data` | object | 邀请详情 |
| `data.invitationId` | string | 邀请ID |
| `data.journeyId` | string | 行程ID |
| `data.email` | string | 被邀请人邮箱 |
| `data.role` | string | 角色：`member` 或 `admin` |
| `data.journeyName` | string | 行程名称（目的地） |
| `data.message` | string | 邀请消息（可选） |
| `data.status` | string | 邀请状态：`pending`（待处理）、`accepted`（已接受）、`expired`（已过期）、`cancelled`（已取消） |
| `data.expiresAt` | string | 过期时间（ISO 8601格式） |
| `data.invitedBy` | object | 邀请人信息（可选） |
| `data.invitedBy.id` | string | 邀请人ID |
| `data.invitedBy.name` | string | 邀请人名称 |
| `data.invitedBy.email` | string | 邀请人邮箱（可选） |

---

## 错误响应

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "邀请ID无效",
  "error": "Bad Request"
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "邀请不存在或已过期",
  "error": "Not Found"
}
```

---

## 使用说明

1. **公开接口**：此接口无需认证，任何人都可以通过邀请ID验证邀请
2. **自动过期检查**：如果邀请已过期但状态仍为 `pending`，系统会自动将其标记为 `expired`
3. **状态验证**：只有 `pending` 状态的邀请才会返回成功，`expired` 或 `cancelled` 状态的邀请会返回 404
4. **邀请人信息**：如果邀请人信息可用，会包含在响应中

---

## 注意事项

1. 此接口是公开的，不需要 JWT Token
2. 邀请ID必须有效且未过期
3. 如果邀请已过期，系统会自动更新状态并返回 404
4. 行程名称使用目的地的值
5. 邀请人信息可能不可用（如果邀请人账户被删除）

---

## 典型使用场景

### 场景 1: 用户点击邀请链接

```typescript
// 1. 从URL获取邀请ID
const urlParams = new URLSearchParams(window.location.search);
const invitationId = urlParams.get('invitationId');

// 2. 验证邀请
const response = await fetch(`/api/v1/journeys/invitations/${invitationId}`);
const result = await response.json();

if (result.success) {
  // 显示邀请信息
  console.log('邀请人:', result.data.invitedBy?.name);
  console.log('行程:', result.data.journeyName);
  console.log('角色:', result.data.role);
} else {
  // 显示错误信息
  console.error('邀请无效或已过期');
}
```

### 场景 2: 接受邀请前的验证

```typescript
// 在显示接受邀请按钮前，先验证邀请
async function verifyInvitationBeforeAccept(invitationId: string) {
  try {
    const response = await fetch(`/api/v1/journeys/invitations/${invitationId}`);
    const result = await response.json();
    
    if (result.success && result.data.status === 'pending') {
      return result.data; // 邀请有效，可以接受
    } else {
      throw new Error('邀请无效或已过期');
    }
  } catch (error) {
    console.error('验证邀请失败:', error);
    return null;
  }
}
```

