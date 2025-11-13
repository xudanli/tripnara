# Google OAuth 配置指南

## 问题说明

如果前端控制台出现以下错误：
```
[GSI_LOGGER]: The given origin is not allowed for the given client ID.
Failed to load resource: the server responded with a status of 403
```

这表示当前前端域名/来源未在 Google Cloud Console 中授权。

## 解决步骤

### 1. 登录 Google Cloud Console

访问：https://console.cloud.google.com/

### 2. 选择或创建项目

1. 在顶部选择正确的项目（或创建新项目）
2. 确保项目已启用 Google+ API

### 3. 配置 OAuth 同意屏幕

1. 导航到 **APIs & Services** > **OAuth consent screen**
2. 选择用户类型（**External** 用于测试，**Internal** 仅限组织内）
3. 填写应用信息：
   - **App name**: TripMind（或你的应用名称）
   - **User support email**: 你的邮箱
   - **Developer contact information**: 你的邮箱
4. 点击 **Save and Continue**
5. 在 **Scopes** 页面，点击 **Add or Remove Scopes**
   - 添加：`email`、`profile`、`openid`
6. 继续完成后续步骤

### 4. 创建 OAuth 2.0 客户端 ID

1. 导航到 **APIs & Services** > **Credentials**
2. 点击 **+ CREATE CREDENTIALS** > **OAuth client ID**
3. 选择应用类型：**Web application**
4. 填写名称：`TripMind Web Client`（或自定义名称）

### 5. 配置授权来源（重要）

在 **Authorized JavaScript origins** 部分，添加以下来源：

#### 开发环境
```
http://localhost:3000
http://127.0.0.1:3000
```

#### 生产环境（根据实际域名）
```
https://yourdomain.com
https://www.yourdomain.com
```

**注意：**
- 必须包含协议（`http://` 或 `https://`）
- 不能包含路径（不要加 `/` 或 `/api`）
- 不能包含端口号（除非是开发环境的非标准端口）

### 6. 配置授权重定向 URI（如果需要）

如果使用 OAuth 2.0 授权码流程，在 **Authorized redirect URIs** 部分添加：

#### 开发环境
```
http://localhost:3000/auth/callback
http://localhost:3000/api/auth/callback
```

#### 生产环境
```
https://yourdomain.com/auth/callback
https://yourdomain.com/api/auth/callback
```

**注意：** 如果只使用 Google Identity Services（ID Token），可能不需要配置重定向 URI。

### 7. 获取 Client ID

1. 创建完成后，会显示 **Client ID** 和 **Client Secret**
2. 复制 **Client ID**（格式类似：`562798909455-l2h178bkfvdo6to0fvtrtqvu36n39maq.apps.googleusercontent.com`）

### 8. 配置后端环境变量

在 `.env` 文件中添加：

```env
GOOGLE_CLIENT_ID=562798909455-l2h178bkfvdo6to0fvtrtqvu36n39maq.apps.googleusercontent.com
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
```

### 9. 配置前端

在前端代码中使用相同的 `GOOGLE_CLIENT_ID`：

```typescript
// Vue/React 示例
const GOOGLE_CLIENT_ID = '562798909455-l2h178bkfvdo6to0fvtrtqvu36n39maq.apps.googleusercontent.com';
```

### 10. 重启服务

配置完成后，重启后端服务以加载新的环境变量：

```bash
# 停止服务
pkill -f "node.*dist/src/main"

# 启动服务
npm run start:dev
```

## 验证配置

### 1. 检查前端控制台

刷新页面后，应该不再出现：
- `[GSI_LOGGER]: The given origin is not allowed for the given client ID.`
- `Failed to load resource: the server responded with a status of 403`

### 2. 测试登录流程

1. 点击 Google 登录按钮
2. 应该能正常弹出 Google 登录窗口
3. 登录成功后，应该能收到后端返回的 JWT token

### 3. 检查后端日志

后端应该能正常验证 Google ID Token，并返回用户信息。

## 常见问题

### Q1: 配置后仍然报错

**A:** 检查以下几点：
1. 确保添加的来源完全匹配（包括协议、域名、端口）
2. 等待几分钟让 Google 配置生效（通常立即生效，但有时需要等待）
3. 清除浏览器缓存并硬刷新（Ctrl+Shift+R 或 Cmd+Shift+R）
4. 检查是否使用了正确的 Client ID

### Q2: 生产环境配置

**A:** 生产环境需要：
1. 使用 HTTPS（Google 要求）
2. 在 Google Cloud Console 中添加生产域名
3. 确保 OAuth 同意屏幕已发布（测试模式仅限 100 个用户）

### Q3: 多个环境配置

**A:** 可以为不同环境创建不同的 OAuth 客户端：
- 开发环境：`TripMind Dev`
- 测试环境：`TripMind Staging`
- 生产环境：`TripMind Production`

每个客户端配置对应的授权来源。

### Q4: 本地开发使用不同端口

**A:** 如果前端运行在不同端口（如 `5173`、`8080`），需要在 Google Cloud Console 中添加对应的来源：
```
http://localhost:5173
http://localhost:8080
```

## 当前配置信息

**Client ID:** `562798909455-l2h178bkfvdo6to0fvtrtqvu36n39maq.apps.googleusercontent.com`

**需要添加的授权来源：**
- `http://localhost:3000`（开发环境）
- `http://127.0.0.1:3000`（开发环境，备用）

**后端接口：** `POST /api/auth/google`

---

**最后更新：** 2024-11-13

