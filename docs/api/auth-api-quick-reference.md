# 认证 API 快速参考

## 环境变量

```env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
```

## 接口列表

### 1. Google OAuth 登录

```bash
POST /api/auth/google
Content-Type: application/json

{
  "token": "google-id-token"
}
```

**响应**:
```json
{
  "success": true,
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "nickname": "John Doe",
    "avatarUrl": "https://..."
  }
}
```

### 2. 获取当前用户信息

```bash
GET /api/auth/profile
Authorization: Bearer <jwt-token>
```

**响应**:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "nickname": "John Doe",
  "avatarUrl": "https://...",
  "preferredLanguage": "zh-CN",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## 前端使用示例

### React + Google Sign-In

```typescript
import { GoogleLogin } from '@react-oauth/google';

function LoginButton() {
  const handleSuccess = async (credentialResponse: any) => {
    const response = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: credentialResponse.credential }),
    });
    
    const { success, token, user } = await response.json();
    if (success) {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }
  };

  return <GoogleLogin onSuccess={handleSuccess} />;
}
```

### 带认证的 API 请求

```typescript
const token = localStorage.getItem('token');

const response = await fetch('/api/v1/journeys', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});
```

### Axios 拦截器

```typescript
import axios from 'axios';

const apiClient = axios.create({ baseURL: '/api' });

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
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

