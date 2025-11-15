# 用户偏好 API

用于读取与更新当前登录用户的个性化偏好（语言、币种、展示选项等），数据存储在 `user_preferences` 表中，采用 JSON 结构保存。

## 基础信息

- **Base URL**：`/api/user/preferences`
- **认证方式**：`app_session` Cookie 或 Bearer Token，需通过 `JwtAuthGuard`
- **返回格式**：`application/json`

---

## 1. 获取用户偏好

- **接口**：`GET /api/user/preferences`
- **说明**：返回当前登录用户的偏好 JSON，如果从未设置则返回空对象 `{}`。

**请求示例**

```bash
curl -X GET http://localhost:3000/api/user/preferences \
  --cookie "app_session=xxx"
```

**响应示例**

```json
{
  "preferences": {
    "language": "zh-CN",
    "currency": "USD",
    "theme": "dark"
  }
}
```

---

## 2. 更新用户偏好

- **接口**：`PUT /api/user/preferences`
- **说明**：覆盖写入当前用户的偏好 JSON。需要传入完整对象；若只想更新某个字段，请先 `GET` 获取旧值再合并。

**请求体**

| 字段名      | 类型   | 必填 | 说明                      |
|-------------|--------|------|---------------------------|
| preferences | object | 是   | 任意 JSON 对象，键值不限 |

**请求示例**

```bash
curl -X PUT http://localhost:3000/api/user/preferences \
  -H "Content-Type: application/json" \
  --cookie "app_session=xxx" \
  -d '{
    "preferences": {
      "language": "en-US",
      "currency": "EUR",
      "notifications": {
        "email": true,
        "sms": false
      }
    }
  }'
```

**响应示例**

```json
{
  "preferences": {
    "language": "en-US",
    "currency": "EUR",
    "notifications": {
      "email": true,
      "sms": false
    }
  }
}
```

若成功写入，将同步更新 `updatedAt`，同时 `user_auth_providers` 中的记录保持不变。

---

## 错误码

| 状态码 | 说明                         |
|--------|------------------------------|
| 401    | 未认证，需登录               |
| 400    | 请求体验证失败（例如非 JSON） |
| 500    | 服务器内部错误               |

错误示例：

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

## 自测步骤

1. 登录获取 `app_session` Cookie（可通过 Google OAuth）。
2. `GET /api/user/preferences`，确认默认返回 `{}`。
3. `PUT /api/user/preferences` 发送自定义 JSON。
4. 再次 `GET`，验证返回内容与步骤 3 保持一致。

可使用 `curl`、Postman 或脚本 `npm run test preferences`（运行 Jest 单元测试 `preferences.service.spec.ts`）。***

