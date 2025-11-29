# JWT 认证接口清单

本文档列出了项目中所有需要 JWT 认证的接口。这些接口都需要在请求头中包含 `Authorization: Bearer <JWT_TOKEN>`。

## 认证方式

所有需要认证的接口都使用 `JwtAuthGuard`，支持两种方式传递 Token：
1. **Bearer Token**：在请求头中设置 `Authorization: Bearer <token>`
2. **Cookie**：通过 `app_session` cookie 传递（主要用于 Web 应用）

---

## 1. 行程管理接口 (Journey V1)

**基础路径**: `/api/v1/journeys`

所有接口都需要 JWT 认证：

### 行程 CRUD
- `POST /api/v1/journeys/generate` - 生成旅行行程（AI）
- `GET /api/v1/journeys` - 获取行程列表
- `POST /api/v1/journeys` - 创建行程
- `GET /api/v1/journeys/:journeyId` - 获取行程详情
- `PUT /api/v1/journeys/:journeyId` - 更新行程
- `PATCH /api/v1/journeys/:journeyId` - 部分更新行程
- `DELETE /api/v1/journeys/:journeyId` - 删除行程

### 天数管理
- `GET /api/v1/journeys/:journeyId/days` - 获取所有天数
- `POST /api/v1/journeys/:journeyId/days` - 添加天数
- `PATCH /api/v1/journeys/:journeyId/days/:dayId` - 更新天数
- `DELETE /api/v1/journeys/:journeyId/days/:dayId` - 删除天数

### 时间槽管理
- `GET /api/v1/journeys/:journeyId/days/:dayId/slots` - 获取时间槽列表
- `POST /api/v1/journeys/:journeyId/days/:dayId/slots` - 添加时间槽
- `PATCH /api/v1/journeys/:journeyId/days/:dayId/slots/:slotId` - 更新时间槽
- `DELETE /api/v1/journeys/:journeyId/days/:dayId/slots/:slotId` - 删除时间槽
- `POST /api/v1/journeys/:journeyId/days/:dayId/slots/reorder` - 重新排序时间槽

### 活动管理
- `GET /api/v1/journeys/:journeyId/activities` - 获取活动列表
- `POST /api/v1/journeys/:journeyId/activities` - 添加活动
- `GET /api/v1/journeys/:journeyId/activities/batch` - 批量获取活动详情
- `PATCH /api/v1/journeys/:journeyId/activities/:activityId` - 更新活动
- `DELETE /api/v1/journeys/:journeyId/activities/:activityId` - 删除活动

### 费用管理
- `GET /api/v1/journeys/:journeyId/expenses` - 获取支出列表
- `POST /api/v1/journeys/:journeyId/expenses` - 创建支出
- `PATCH /api/v1/journeys/:journeyId/expenses/:expenseId` - 更新支出
- `DELETE /api/v1/journeys/:journeyId/expenses/:expenseId` - 删除支出

### 其他功能
- `POST /api/v1/journeys/:journeyId/recalculate-cost` - 重新计算总费用
- `POST /api/v1/journeys/:journeyId/daily-summaries` - 生成每日概要
- `POST /api/v1/journeys/:journeyId/assistant/chat` - 行程AI助手聊天
- `GET /api/v1/journeys/:journeyId/safety-notice` - 获取安全提示
- `POST /api/v1/journeys/:journeyId/safety-notice` - 生成安全提示

---

## 2. 灵感/意图识别接口 (Inspiration)

**基础路径**: `/api/inspiration`

所有接口都需要 JWT 认证（控制器级别）：

- `POST /api/inspiration/detect-intent` - 意图识别
- `POST /api/inspiration/recommend-destinations` - 目的地推荐
- `POST /api/inspiration/generate-itinerary` - 生成完整行程
- `POST /api/inspiration/extract-days` - 天数提取

---

## 3. 行程成员管理接口 (Journey Members)

**基础路径**: `/api/v1/journeys/:journeyId/members`

所有接口都需要 JWT 认证（控制器级别）：

- `GET /api/v1/journeys/:journeyId/members` - 获取成员列表
- `POST /api/v1/journeys/:journeyId/members/invite` - 邀请成员
- `POST /api/v1/journeys/:journeyId/members` - 添加成员
- `PATCH /api/v1/journeys/:journeyId/members/:memberId` - 更新成员信息
- `DELETE /api/v1/journeys/:journeyId/members/:memberId` - 移除成员

---

## 4. 位置信息接口 (Location)

**基础路径**: `/api/location`

- `POST /api/location/generate` - 生成单个活动位置信息
- `POST /api/location/generate-batch` - 批量生成活动位置信息

---

## 5. 旅行摘要接口 (Travel Summary)

**基础路径**: `/api/travel`

- `POST /api/travel/summary` - 生成旅行摘要

---

## 6. 外部搜索接口 (External Search)

**基础路径**: `/api/external`

所有接口都需要 JWT 认证（控制器级别）：

- `GET /api/external/events` - 搜索 Eventbrite 活动
- `GET /api/external/locations` - 搜索地点
- `GET /api/external/attractions/:id/details` - 获取景点详情

---

## 7. 旅行指南接口 (Travel Guides)

**基础路径**: `/api/travel-guides`

所有接口都需要 JWT 认证（控制器级别）：

- `GET /api/travel-guides` - 获取旅行指南

---

## 8. Eventbrite 接口

**基础路径**: `/api/eventbrite`

- `GET /api/eventbrite/auth-url` - 获取 Eventbrite 授权地址
- `POST /api/eventbrite/disconnect` - 解除 Eventbrite 绑定
- `GET /api/eventbrite/status` - 查看 Eventbrite 绑定状态

**注意**: `GET /api/eventbrite/callback` 不需要认证（OAuth 回调）

---

## 9. 用户偏好接口 (User Preferences)

**基础路径**: `/api/user/preferences`

所有接口都需要 JWT 认证（控制器级别）：

- `GET /api/user/preferences` - 获取当前用户偏好
- `PUT /api/user/preferences` - 更新当前用户偏好

---

## 不需要认证的接口

以下接口**不需要** JWT 认证：

### 安全提示接口（公开）
- `GET /api/v1/alerts` - 获取安全提示列表
- `POST /api/v1/alerts` - 创建安全提示
- `GET /api/v1/alerts/:id` - 获取单个安全提示详情
- `PUT /api/v1/alerts/:id` - 更新安全提示
- `PATCH /api/v1/alerts/:id` - 更新安全提示（部分更新）
- `DELETE /api/v1/alerts/:id` - 删除安全提示
- `POST /api/v1/journeys/safety-notice/public` - 生成通用安全提示

### 邀请验证接口（公开）
- `GET /api/v1/journeys/invitations/:invitationId` - 验证邀请（无需认证）

### 目的地接口（部分公开）
- `GET /api/v1/destinations/:id/events` - 获取目的地活动信息
- `GET /api/v1/destinations/:id/weather` - 获取目的地天气信息
- `POST /api/v1/destinations/find-or-create` - 查找或创建目的地（**当前未设置认证，可能需要添加**）

### 认证相关接口
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/refresh` - 刷新 Token

---

## 使用示例

### cURL 示例

```bash
# 使用 Bearer Token
curl -X GET "http://localhost:3000/api/v1/journeys" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### JavaScript/Fetch 示例

```javascript
const token = 'YOUR_JWT_TOKEN';

fetch('http://localhost:3000/api/v1/journeys', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log(data));
```

### Axios 示例

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

api.get('/v1/journeys')
  .then(response => console.log(response.data));
```

---

## 注意事项

1. **Token 格式**: 必须使用 `Bearer <token>` 格式，注意 `Bearer` 和 token 之间有一个空格
2. **Token 过期**: JWT Token 有过期时间，过期后需要重新登录或刷新 Token
3. **错误响应**: 如果认证失败，会返回 `401 Unauthorized` 错误
4. **Swagger UI**: 在 Swagger UI 中测试接口时，需要先点击右上角的 "Authorize" 按钮，输入 Bearer Token

---

## 统计信息

- **需要认证的控制器**: 9 个
- **需要认证的接口总数**: 约 50+ 个
- **公开接口**: 约 10+ 个

