# 旅伴管理接口文档

## 概述

本文档描述了旅伴管理功能的所有后端接口。这些接口用于实现行程成员（旅伴）的完整管理功能，包括成员的增删改查、邀请成员等。

**基础路径：** `/api/v1/journeys/{journeyId}/members`

**认证：** 所有接口都需要 JWT Token（Bearer Token）

**Content-Type：** `application/json`

---

## 接口列表

### 1. 获取成员列表 ✅

**接口路径：** `GET /api/v1/journeys/{journeyId}/members`

**接口描述：** 获取指定行程的所有成员列表

**调用时机：**

- 打开旅伴管理页面时
- 成员列表发生变化后刷新时

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `journeyId` | string | 是 | 行程ID（UUID） |

**请求示例**

```bash
curl -X GET "http://localhost:3000/api/v1/journeys/04d7126d-219f-49ab-b71a-a595c18d6b8f/members" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**响应格式**

```json
{
  "success": true,
  "data": [
    {
      "id": "member_001",
      "name": "张三",
      "email": "zhangsan@example.com",
      "role": "owner",
      "userId": "user_001",
      "createdAt": "2025-11-25T10:00:00.000Z",
      "updatedAt": "2025-11-25T10:00:00.000Z"
    },
    {
      "id": "member_002",
      "name": "李四",
      "email": "lisi@example.com",
      "role": "admin",
      "userId": "user_002",
      "createdAt": "2025-11-25T11:00:00.000Z",
      "updatedAt": "2025-11-25T11:00:00.000Z"
    }
  ]
}
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 成员ID（UUID） |
| `name` | string | 成员名称 |
| `email` | string | 成员邮箱（可选） |
| `role` | string | 角色（`owner` \| `admin` \| `member`） |
| `userId` | string \| null | 关联的用户ID（如果成员已注册，否则为 null） |
| `createdAt` | string | 创建时间（ISO 8601格式） |
| `updatedAt` | string | 更新时间（ISO 8601格式） |

**错误响应：**

- `404`: 行程不存在
- `403`: 无权访问此行程的成员列表

---

### 2. 邀请成员 ✅

**接口路径：** `POST /api/v1/journeys/{journeyId}/members/invite`

**接口描述：** 通过邮箱邀请成员加入行程

**调用时机：**

- 用户点击"邀请成员"按钮并填写表单后提交时

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `journeyId` | string | 是 | 行程ID（UUID） |

**请求体：**

```json
{
  "email": "newmember@example.com",
  "role": "member",
  "message": "欢迎加入我们的冰岛之旅！"
}
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `email` | string | 是 | 被邀请人的邮箱地址 |
| `role` | string | 否 | 角色（`member` \| `admin`），默认 `member` |
| `message` | string | 否 | 邀请消息（最多500字符） |

**请求示例**

```bash
curl -X POST "http://localhost:3000/api/v1/journeys/04d7126d-219f-49ab-b71a-a595c18d6b8f/members/invite" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newmember@example.com",
    "role": "member",
    "message": "欢迎加入我们的冰岛之旅！"
  }'
```

**响应格式：**

```json
{
  "success": true,
  "message": "邀请已发送",
  "data": {
    "id": "inv_123456",
    "email": "newmember@example.com",
    "role": "member",
    "status": "pending",
    "expiresAt": "2025-12-02T10:00:00.000Z"
  }
}
```

**错误响应：**

- `400`: 邮箱格式不正确、角色无效
- `403`: 无权邀请成员到此行程
- `409`: 该邮箱已被邀请或已是成员

---

### 3. 添加成员 ✅

**接口路径：** `POST /api/v1/journeys/{journeyId}/members`

**接口描述：** 直接添加成员到行程（无需邀请流程）

**调用时机：**

- 当用户接受邀请后自动调用
- 管理员直接添加成员时

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `journeyId` | string | 是 | 行程ID（UUID） |

**请求体：**

```json
{
  "name": "新成员",
  "email": "newmember@example.com",
  "role": "member",
  "userId": "user_003"
}
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 成员名称 |
| `email` | string | 否 | 成员邮箱 |
| `role` | string | 否 | 角色（`member` \| `admin`），默认 `member` |
| `userId` | string | 否 | 关联的用户ID（如果成员已注册） |

**请求示例**

```bash
curl -X POST "http://localhost:3000/api/v1/journeys/04d7126d-219f-49ab-b71a-a595c18d6b8f/members" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "新成员",
    "email": "newmember@example.com",
    "role": "member",
    "userId": "user_003"
  }'
```

**响应格式：**

```json
{
  "success": true,
  "message": "成员添加成功",
  "data": {
    "id": "member_004",
    "name": "新成员",
    "email": "newmember@example.com",
    "role": "member",
    "userId": "user_003",
    "createdAt": "2025-11-25T13:00:00.000Z",
    "updatedAt": "2025-11-25T13:00:00.000Z"
  }
}
```

**错误响应：**

- `400`: 成员名称不能为空、邮箱格式不正确
- `403`: 无权添加成员到此行程
- `409`: 该用户已是此行程的成员

---

### 4. 更新成员信息 ✅

**接口路径：** `PATCH /api/v1/journeys/{journeyId}/members/{memberId}`

**接口描述：** 更新成员信息（如修改角色、名称等）

**调用时机：**

- 管理员修改成员角色时
- 更新成员名称或邮箱时

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `journeyId` | string | 是 | 行程ID（UUID） |
| `memberId` | string | 是 | 成员ID（UUID） |

**请求体：**

所有字段都是可选的，只传入需要更新的字段即可。

```json
{
  "name": "更新后的名称",
  "role": "admin",
  "email": "updated@example.com"
}
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 否 | 成员名称 |
| `role` | string | 否 | 角色（`admin` \| `member`） |
| `email` | string | 否 | 成员邮箱 |

**请求示例**

```bash
curl -X PATCH "http://localhost:3000/api/v1/journeys/04d7126d-219f-49ab-b71a-a595c18d6b8f/members/member_002" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "更新后的名称",
    "role": "admin"
  }'
```

**响应格式：**

```json
{
  "success": true,
  "message": "成员信息更新成功",
  "data": {
    "id": "member_002",
    "name": "更新后的名称",
    "email": "lisi@example.com",
    "role": "admin",
    "userId": "user_002",
    "createdAt": "2025-11-25T11:00:00.000Z",
    "updatedAt": "2025-11-25T14:00:00.000Z"
  }
}
```

**错误响应：**

- `400`: 角色必须是 admin 或 member、不能将 owner 角色修改为其他角色
- `403`: 无权修改此成员信息
- `404`: 成员不存在

---

### 5. 移除成员 ✅

**接口路径：** `DELETE /api/v1/journeys/{journeyId}/members/{memberId}`

**接口描述：** 从行程中移除成员

**调用时机：**

- 管理员点击"移除成员"按钮并确认时
- 成员自己退出行程时

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `journeyId` | string | 是 | 行程ID（UUID） |
| `memberId` | string | 是 | 成员ID（UUID） |

**请求示例**

```bash
curl -X DELETE "http://localhost:3000/api/v1/journeys/04d7126d-219f-49ab-b71a-a595c18d6b8f/members/member_002" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**响应格式：**

```json
{
  "success": true,
  "message": "成员已移除"
}
```

**错误响应：**

- `403`: 无权移除此成员、不能移除行程所有者
- `404`: 成员不存在或不属于此行程

---

## 权限说明

### 角色权限矩阵

| 操作 | owner | admin | member |
|------|-------|-------|--------|
| 查看成员列表 | ✅ | ✅ | ✅ |
| 邀请成员 | ✅ | ✅ | ❌ |
| 添加成员 | ✅ | ✅ | ❌ |
| 更新成员信息 | ✅ | ✅（仅限非owner成员） | ❌ |
| 移除成员 | ✅ | ✅（仅限非owner成员） | ✅（仅限自己） |

### 特殊规则

1. **owner 角色：**
   - 不能修改自己的角色
   - 不能被移除
   - 拥有所有权限

2. **admin 角色：**
   - 可以管理普通成员（member）
   - 不能管理 owner
   - 不能修改其他 admin 的角色（除非自己是 owner）

3. **member 角色：**
   - 只能查看成员列表
   - 可以移除自己（退出行程）

---

## 邮件配置

### 环境变量

要启用邮件发送功能，需要在 `.env` 文件中配置以下变量：

```env
# 启用邮件服务
EMAIL_ENABLED=true

# 发件人信息
EMAIL_FROM=noreply@tripmind.com
EMAIL_FROM_NAME=TripMind

# SMTP 配置
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
SMTP_SECURE=false  # true for 465, false for other ports
```

### 邮件服务说明

- **默认状态**：邮件服务默认关闭（`EMAIL_ENABLED=false`）
- **优雅降级**：如果邮件服务未配置或发送失败，邀请仍会创建，但不会发送邮件
- **邮件模板**：系统使用 HTML 邮件模板，包含邀请链接、行程信息、过期时间等
- **邀请链接格式**：`{FRONTEND_ORIGIN}/invitations/{invitationId}?journey={journeyId}`

### 常见 SMTP 服务商配置示例

#### Gmail
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password  # 需要使用应用专用密码
```

#### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

#### 阿里云邮件推送
```env
SMTP_HOST=smtpdm.aliyun.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
```

---

## 注意事项

1. **邀请流程：**
   - 邀请发送后，系统会自动发送邀请邮件到被邀请人的邮箱
   - 被邀请人需要通过邮件中的链接接受邀请
   - 邀请有有效期（7天）
   - 如果被邀请人已注册，可以直接加入；如果未注册，需要先注册
   - 如果邮件服务未配置（`EMAIL_ENABLED=false`），邀请仍会创建，但不会发送邮件

2. **成员限制：**
   - 每个行程的最大成员数为 20 人
   - owner 角色只能有一个

3. **数据一致性：**
   - 移除成员时，需要处理该成员分配的任务（建议取消分配或重新分配）
   - 移除成员时，需要处理该成员相关的支出记录（建议保留记录但标记为已移除）

4. **性能优化：**
   - 成员列表接口可以支持分页（如果成员数量较多）
   - 统计信息可以缓存，避免每次请求都计算

5. **安全性：**
   - 验证用户是否有权限操作指定的行程
   - 验证成员是否属于指定的行程
   - 防止权限提升攻击（如普通成员尝试将自己提升为 admin）

---

## 相关接口

### 任务管理接口（用于任务分配）

- 更新任务：`PATCH /api/v1/journeys/{journeyId}/tasks/{taskId}`
- 请求体包含 `assignedTo` 字段（成员ID）

### 预算管理接口（用于成本分摊，可选）

- 如果成本分摊需要后端持久化，建议使用预算管理相关接口
- 接口路径：`POST /api/v1/journeys/{journeyId}/expenses`（如果存在）

