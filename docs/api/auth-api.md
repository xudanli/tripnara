# 认证 API 接口文档

## 基础信息

- **Base URL**: `http://localhost:3000/api`
- **认证方式**: JWT Bearer Token
- **数据格式**: JSON
- **字符编码**: UTF-8

## 环境变量配置

在 `.env` 文件中配置以下变量：

```env
# Google OAuth 配置
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# JWT 配置
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
```

## 接口列表

### 1. Google OAuth 登录

使用 Google ID Token 进行登录，后端验证 token 后返回应用的 JWT token。

**接口地址**: `POST /api/auth/google`

**请求参数** (Request Body):

```json
{
  "token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjE2Nz..."
}
```

**请求字段说明**:

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| token | string | 是 | Google ID Token（从 Google 登录 SDK 获取） |

**响应格式**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "nickname": "John Doe",
    "avatarUrl": "https://lh3.googleusercontent.com/..."
  }
}
```

**响应字段说明**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| success | boolean | 是否成功 |
| token | string | JWT Token，用于后续请求认证 |
| user | object | 用户信息 |
| user.id | string | 用户 ID（UUID） |
| user.email | string | 用户邮箱 |
| user.nickname | string | 用户昵称 |
| user.avatarUrl | string | 用户头像 URL |

**错误响应**:
```json
{
  "statusCode": 401,
  "message": "Google 认证失败",
  "error": "Unauthorized"
}
```

**前端集成示例**:

```typescript
// React + Google Sign-In
import { GoogleLogin } from '@react-oauth/google';

function LoginButton() {
  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: credentialResponse.credential,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // 存储 token
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // 跳转到主页
        window.location.href = '/';
      }
    } catch (error) {
      console.error('登录失败:', error);
    }
  };

  return (
    <GoogleLogin
      onSuccess={handleGoogleSuccess}
      onError={() => {
        console.log('登录失败');
      }}
    />
  );
}
```

**JavaScript 示例**:

```javascript
// 使用 Google Identity Services
async function signInWithGoogle() {
  try {
    // 1. 使用 Google Identity Services 获取 ID Token
    const tokenResponse = await google.accounts.oauth2.initTokenClient({
      client_id: 'YOUR_GOOGLE_CLIENT_ID',
      scope: 'email profile',
      callback: async (response) => {
        // 2. 发送 token 到后端
        const result = await fetch('/api/auth/google', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: response.id_token,
          }),
        });

        const data = await result.json();
        
        if (data.success) {
          // 3. 存储 token
          localStorage.setItem('token', data.token);
          console.log('登录成功:', data.user);
        }
      },
    });

    tokenResponse.requestAccessToken();
  } catch (error) {
    console.error('登录失败:', error);
  }
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

**前端调用示例**:

```typescript
async function getCurrentUser() {
  const token = localStorage.getItem('token');
  
  if (!token) {
    throw new Error('未登录');
  }

  const response = await fetch('/api/auth/profile', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    // Token 过期或无效，清除本地存储
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    throw new Error('登录已过期');
  }

  return await response.json();
}
```

---

## 使用 JWT Token 保护路由

在需要认证的接口中，前端需要在请求头中携带 JWT token：

```typescript
// 创建带认证的 fetch 封装
async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  
  if (!token) {
    throw new Error('未登录');
  }

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

// 使用示例
const response = await authenticatedFetch('/api/v1/journeys', {
  method: 'GET',
});
```

**Axios 示例**:

```typescript
import axios from 'axios';

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: '/api',
});

// 添加请求拦截器，自动添加 token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 添加响应拦截器，处理 token 过期
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token 过期，清除本地存储并跳转到登录页
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 使用
const user = await apiClient.get('/auth/profile');
const journeys = await apiClient.get('/v1/journeys');
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
    // Token 过期，清除本地存储
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // 跳转到登录页
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

## 完整的前端登录流程

```typescript
// 1. 用户点击 Google 登录按钮
// 2. Google SDK 返回 ID Token
const googleToken = await getGoogleIdToken();

// 3. 发送到后端验证
const response = await fetch('/api/auth/google', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: googleToken }),
});

const { success, token, user } = await response.json();

if (success) {
  // 4. 存储 token 和用户信息
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  
  // 5. 更新应用状态（如果使用状态管理）
  // setUser(user);
  
  // 6. 跳转到主页
  router.push('/');
}
```

---

## 安全注意事项

1. **JWT Secret**: 生产环境必须使用强随机字符串作为 `JWT_SECRET`
2. **HTTPS**: 生产环境必须使用 HTTPS 传输
3. **Token 存储**: 
   - Web 应用：使用 `localStorage` 或 `sessionStorage`
   - 移动应用：使用安全存储（Keychain/Keystore）
4. **Token 过期**: 建议设置合理的过期时间（如 7 天）
5. **刷新 Token**: 可以实现 refresh token 机制延长登录状态

---

## 更新日志

- 2024-01-01: 初始版本，支持 Google OAuth 登录和 JWT 认证

