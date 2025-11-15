# 认证 API 快速参考

## 环境变量

```env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-backend.com/api/auth/google/callback
APP_SESSION_SECRET=change-me-at-least-32-characters
FRONTEND_ORIGIN=https://your-frontend.com
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
```

## 接口列表

### 1. 发起 Google OAuth

```bash
GET /api/auth/google           # 浏览器直接访问，后端返回 302
```

### 2. Google 回调

```bash
GET /api/auth/google/callback?code=xxx&state=yyy   # 仅由 Google 调用，成功后 302 回前端
```

### 3. 获取当前登录用户（Cookie）

```bash
GET /api/auth/me
Cookie: app_session=<HttpOnly cookie>   # 浏览器自动附带
```

### 4. 退出登录

```bash
POST /api/auth/logout
```

> 兼容接口：`GET /api/auth/profile` 仍支持 `Authorization: Bearer <token>` 访问，用于现有后端守卫。

## 前端使用示例

### 浏览器登录流程

```typescript
// 1. 点击按钮跳转到后端
window.location.href = '/api/auth/google';

// 2. 登录成功并回到前端后，调用 /me 获取用户信息
const profileResponse = await fetch('/api/auth/me', { credentials: 'include' });
const user = await profileResponse.json();
```

### 带认证的 API 请求（Cookie）

```typescript
await fetch('/api/v1/journeys', {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
});
```

### Axios 拦截器（Cookie）

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
```

## 后端保护路由

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('api/v1/journeys')
export class JourneyController {
  @Get()
  @UseGuards(JwtAuthGuard)
  async listJourneys(@CurrentUser() user: { userId: string }) {
    // user.userId 包含当前登录用户的 ID
  }
}
```

