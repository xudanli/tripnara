# 认证 API 接口文档

## 基础信息

- **Base URL**: `http://localhost:3000/api`
- **认证方式**: HttpOnly Cookie（`app_session`，内部保存 JWT）
- **数据格式**: JSON
- **字符编码**: UTF-8

## 环境变量配置

在 `.env` 文件中配置以下变量：

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Session & 前端
APP_SESSION_SECRET=change-me-at-least-32-characters
FRONTEND_ORIGIN=http://localhost:3000

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
```

## 接口列表

### 1. 发起 Google OAuth 登录

后端会生成 `state` 与 `code_verifier`，通过加密 cookie 临时保存，然后 302 跳转到 Google 授权页面。

- **接口地址**: `GET /api/auth/google`
- **请求方式**: 浏览器直接访问 / 重定向
- **响应**: 302 -> `https://accounts.google.com/...`

### 2. Google OAuth 回调

Google 完成授权后回调此接口，后端会：

1. 校验 `state` 是否匹配
2. 使用 `code + code_verifier` 向 Google 换取 `id_token`
3. 校验 `id_token` 并同步用户
4. 签发 HttpOnly `app_session` Cookie（存放 JWT）
5. 302 回 `FRONTEND_ORIGIN`

- **接口地址**: `GET /api/auth/google/callback?code=xxx&state=yyy`

### 3. 获取当前用户（Cookie）

```bash
GET /api/auth/me
```

- 自动读取 `app_session` Cookie，返回用户资料
- 用于前端在登录成功后确认身份

### 4. 退出登录

```bash
POST /api/auth/logout
```

- 清除 `app_session` Cookie

> 兼容接口：`GET /api/auth/profile` 仍支持 `Authorization: Bearer <jwt>`，用于脚本或未迁移的客户端。

---

### 前端集成（React 示例）

```typescript
function LoginButton() {
  const handleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  return <button onClick={handleLogin}>使用 Google 登录</button>;
}

async function fetchProfile() {
  const response = await fetch('/api/auth/me', {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('未登录');
  return response.json();
}
```

---

### 2. 获取当前用户信息

获取当前登录用户的详细信息。

**接口地址**: `GET /api/auth/profile`

**请求头**:
```
Authorization: Bearer <your-jwt-token>
```

**响应格式**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "phone": null,
  "nickname": "John Doe",
  "avatarUrl": "https://lh3.googleusercontent.com/...",
  "preferredLanguage": "zh-CN",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Server-to-Server 调用示例**（在服务器或脚本中直接使用 Bearer Token）:

```bash
# 将浏览器中的 app_session Cookie 复制出来后可直接请求
curl -H "Authorization: Bearer <jwt-from-app_session>" https://api.example.com/api/auth/profile
```

---

## 使用 Cookie 保护路由

- 浏览器请求时需开启 `credentials: 'include'`
- `app_session` Cookie 会自动携带，不需要手动设置 `Authorization`

```typescript
await fetch('/api/v1/journeys', {
  method: 'GET',
  credentials: 'include',
});
```

**Axios 示例**:

```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const user = await apiClient.get('/auth/me');
```

---

## 后端保护路由示例

在后端控制器中使用 `@UseGuards(JwtAuthGuard)` 保护路由：

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('api/v1/journeys')
export class JourneyController {
  @Get()
  @UseGuards(JwtAuthGuard)  // 需要认证
  async listJourneys(@CurrentUser() user: { userId: string }) {
    // user.userId 包含当前登录用户的 ID
    return this.journeyService.listJourneys(user.userId);
  }
}
```

---

## 错误码说明

| HTTP 状态码 | 说明 |
|------------|------|
| 200 | 请求成功 |
| 401 | 未授权（token 无效或过期） |
| 400 | 请求参数错误 |
| 500 | 服务器内部错误 |

**常见错误处理**:

```typescript
async function handleApiError(response: Response) {
  if (response.status === 401) {
    // 清理本地状态并跳转登录
    window.location.href = '/login';
  } else if (response.status === 400) {
    const error = await response.json();
    console.error('请求错误:', error.message);
  } else {
    console.error('服务器错误:', response.statusText);
  }
}
```

---

## 完整的前端登录流程（Cookie）

```typescript
// 1. 用户点击按钮 -> 跳转 /api/auth/google
window.location.href = '/api/auth/google';

// 2. 登录成功返回前端后，调用 /api/auth/me
async function bootstrapAuth() {
  const response = await fetch('/api/auth/me', {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('未登录');
  }
  const user = await response.json();
  // 3. 将用户信息放到全局状态 / context
  setUser(user);
}

// 4. 调用业务接口
await fetch('/api/v1/journeys', {
  method: 'GET',
  credentials: 'include',
});
```

---

## 安全注意事项

1. **JWT Secret**: 生产环境必须使用强随机字符串作为 `JWT_SECRET`
2. **HTTPS**: 生产环境必须使用 HTTPS 传输
3. **Cookie 安全**: 后端默认设置 `HttpOnly + SameSite=Lax + Secure`，请务必在 HTTPS 环境下部署
4. **Session 轮换**: 定期轮换 `APP_SESSION_SECRET` 并使旧会话失效
5. **Token 过期**: 默认 7 天，可按需调整 `JWT_EXPIRES_IN`
6. **Refresh Token（可选）**: 如需长期会话，可在数据库中存储并旋转 Google refresh token

---

## Google OAuth 官方端点（全部使用 HTTPS）

| 功能 | URL |
|------|-----|
| 授权页 | `https://accounts.google.com/o/oauth2/v2/auth` |
| Token 交换 | `https://oauth2.googleapis.com/token` |
| 用户信息 | `https://www.googleapis.com/oauth2/v3/userinfo` |

> `userinfo` 接口需在服务端携带 `Authorization: Bearer <access_token>` 访问，请勿在前端直接调用以免泄露令牌。

---

## 更新日志

- 2024-01-01: 初始版本，支持 Google OAuth 登录和 JWT 认证

