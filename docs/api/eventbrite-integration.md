# Eventbrite 集成 API

用于让用户在 TripMind 内绑定/解绑 Eventbrite 账户并代替用户调用 Eventbrite API。所有接口均需要用户已登录（`app_session` Cookie）。

## 环境变量

```env
EVENTBRITE_CLIENT_ID=xxxx
EVENTBRITE_CLIENT_SECRET=xxxx
EVENTBRITE_REDIRECT_URI=https://your-backend.com/api/eventbrite/callback
EVENTBRITE_AUTH_URL=https://www.eventbrite.com/oauth/authorize
EVENTBRITE_TOKEN_URL=https://www.eventbrite.com/oauth/token
EVENTBRITE_SUCCESS_REDIRECT=/settings/integrations?eventbrite=connected
EVENTBRITE_FAILURE_REDIRECT=/settings/integrations?eventbrite=error
```

确保上述值与 Eventbrite 应用配置一致（dev / prod 分别设置）。

---

## 1. 获取授权地址

- **接口**：`GET /api/eventbrite/auth-url`
- **认证**：需要登录
- **说明**：生成带 `state` 的 Eventbrite OAuth URL。前端拿到后直接 `window.location.href = url` 即可。

**响应示例**

```json
{
  "url": "https://www.eventbrite.com/oauth/authorize?response_type=code&client_id=..."
}
```

---

## 2. Eventbrite 回调

- **接口**：`GET /api/eventbrite/callback?code=...&state=...`
- **说明**：Eventbrite 授权完成后会回调到后端；后端会自动校验 `state`、用 `code` 换 `access_token`，并写入 `eventbrite_connections` 表。成功或失败都会 `302` 重定向回前端（分别使用 `EVENTBRITE_SUCCESS_REDIRECT / EVENTBRITE_FAILURE_REDIRECT`）。
- **前端注意**：无须直接调用，只需在集成页监听 URL 参数 `eventbrite=connected|error` 以刷新 UI。

---

## 3. 查看绑定状态

- **接口**：`GET /api/eventbrite/status`
- **认证**：需要登录
- **响应**

```json
{
  "connected": true,
  "expiresAt": "2025-11-15T14:00:00.000Z",
  "eventbriteUserId": "123456789"
}
```

---

## 4. 解除绑定

- **接口**：`POST /api/eventbrite/disconnect`
- **认证**：需要登录
- **说明**：删除 `eventbrite_connections` 表中该用户的 token。

```json
{
  "success": true
}
```

---

## 数据库

`eventbrite_connections` 表（TypeORM：`EventbriteConnectionEntity`）：

| 字段 | 说明 |
|------|------|
| user_id | TripMind 用户 ID（唯一） |
| eventbrite_user_id | Eventbrite 用户 ID |
| access_token | OAuth access token |
| refresh_token | refresh token（可空） |
| token_type | 一般为 `Bearer` |
| scope | 授权 scope |
| expires_at | 过期时间 |

---

## 使用指南

1. 前端“绑定 Eventbrite”按钮调用 `GET /api/eventbrite/auth-url`，重定向到返回的 URL。
2. 用户完成授权 → 后端自动处理回调并重定向回前端 `/settings/integrations?eventbrite=connected`。
3. 前端根据 URL 参数/`GET /api/eventbrite/status` 更新 UI（显示“已绑定”）。
4. 若用户点击“解除绑定”，调用 `POST /api/eventbrite/disconnect`，成功后刷新状态。

