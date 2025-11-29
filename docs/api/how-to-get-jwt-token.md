# 如何获取 JWT Token

本文档说明如何在 Swagger UI 或其他 API 客户端中获取和使用 JWT Token。

## 认证方式

本项目支持两种方式传递 JWT Token：

1. **Bearer Token**：在请求头中设置 `Authorization: Bearer <token>`
2. **Cookie**：通过 `app_session` cookie 传递（主要用于 Web 应用）

## 方法一：通过浏览器 Cookie 获取（推荐）

### 步骤 1：登录

1. 在浏览器中访问登录接口：
   ```
   http://localhost:3000/api/auth/google
   ```
   这会跳转到 Google OAuth 登录页面。

2. 完成 Google 登录后，系统会自动重定向回前端，并在浏览器中设置 `app_session` Cookie。

### 步骤 2：从浏览器获取 Cookie 值

#### Chrome/Edge 浏览器：

1. 打开开发者工具（F12）
2. 切换到 **Application**（应用）标签
3. 在左侧找到 **Cookies** → `http://localhost:3000`
4. 找到名为 `app_session` 的 Cookie
5. 复制其 **Value** 值

#### Firefox 浏览器：

1. 打开开发者工具（F12）
2. 切换到 **存储** 标签
3. 展开 **Cookie** → `http://localhost:3000`
4. 找到名为 `app_session` 的 Cookie
5. 复制其 **值**

#### 使用浏览器控制台：

在浏览器控制台（Console）中运行：

```javascript
// 获取 app_session Cookie 值
document.cookie.split('; ').find(row => row.startsWith('app_session='))?.split('=')[1]
```

### 步骤 3：在 Swagger UI 中使用

1. 在 Swagger UI 中点击右上角的 **"Authorize"** 按钮
2. 在弹出的 "Available authorizations" 窗口中：
   - 找到 **"bearer (http, Bearer)"** 部分
   - 在 **"Value:"** 输入框中粘贴刚才复制的 `app_session` Cookie 值
   - 点击 **"Authorize"** 按钮
   - 点击 **"Close"** 关闭窗口

3. 现在你可以测试所有需要认证的接口了！

## 方法二：通过 API 获取 Token（如果支持）

如果后端提供了直接返回 Token 的接口，可以使用：

```bash
# 示例（需要根据实际接口调整）
curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }'
```

**注意**：当前项目使用 Google OAuth 登录，不提供传统的用户名/密码登录接口。

## 方法三：使用浏览器扩展（高级）

### Postman/Insomnia：

1. 在浏览器中登录后，使用浏览器扩展（如 Postman Interceptor）同步 Cookie
2. 或者在 Postman 中手动设置 Cookie：
   - 在请求的 **Headers** 中添加：
     ```
     Cookie: app_session=<your-token-value>
     ```

### cURL 命令：

```bash
# 先登录获取 Cookie（在浏览器中完成）
# 然后使用 Cookie 值
curl -X GET "http://localhost:3000/api/v1/journeys" \
  -H "Cookie: app_session=YOUR_TOKEN_VALUE" \
  -H "Content-Type: application/json"
```

或者使用 Bearer Token：

```bash
curl -X GET "http://localhost:3000/api/v1/journeys" \
  -H "Authorization: Bearer YOUR_TOKEN_VALUE" \
  -H "Content-Type: application/json"
```

## Token 格式

Token 是一个 JWT（JSON Web Token），格式类似：
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTY3OC0xMjM0LTEyMzQtMTIzNC0xMjM0NTY3ODkwMTIiLCJpYXQiOjE2MzQ1Njc4OTAsImV4cCI6MTYzNTE3MjY5MH0.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Token 有效期

- 默认有效期：**7 天**（可在环境变量 `JWT_EXPIRES_IN` 中配置）
- Token 过期后需要重新登录

## 验证 Token 是否有效

可以调用以下接口验证：

```bash
curl -X GET "http://localhost:3000/api/auth/me" \
  -H "Authorization: Bearer YOUR_TOKEN_VALUE"
```

如果返回用户信息，说明 Token 有效；如果返回 401，说明 Token 无效或已过期。

## 常见问题

### Q: 为什么在 Swagger UI 中输入 Token 后还是 401？

**A:** 可能的原因：
1. Token 已过期（需要重新登录）
2. Token 格式不正确（确保没有多余的空格）
3. 没有点击 "Authorize" 按钮确认

### Q: 如何知道 Token 是否过期？

**A:** 可以：
1. 调用 `/api/auth/me` 接口测试
2. 查看浏览器 Cookie 的过期时间
3. 检查 Token 的 payload（JWT 解码）

### Q: 可以在多个地方使用同一个 Token 吗？

**A:** 可以，Token 是独立的，可以在多个客户端（Swagger UI、Postman、cURL 等）同时使用。

### Q: Token 泄露了怎么办？

**A:** 如果 Token 泄露：
1. 立即退出登录（调用 `/api/auth/logout`）
2. 这会清除服务器端的会话
3. 泄露的 Token 将无法再使用

## 安全建议

1. **不要**将 Token 提交到代码仓库
2. **不要**在公开场合分享 Token
3. Token 过期后及时更新
4. 使用 HTTPS 传输 Token（生产环境）

## 快速测试脚本

```bash
#!/bin/bash
# 获取 Token 并测试接口

# 1. 从浏览器 Cookie 中获取 Token（需要手动复制）
TOKEN="your-token-here"

# 2. 测试接口
curl -X GET "http://localhost:3000/api/v1/journeys" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

---

**提示**：最简单的方法是在浏览器中登录后，从开发者工具的 Application/存储标签中复制 `app_session` Cookie 的值，然后在 Swagger UI 的授权弹窗中粘贴即可。

