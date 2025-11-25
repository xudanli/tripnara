# 行程接口文档 - 25. 生成安全提示

## 接口信息

**接口路径：** `POST /api/v1/journeys/:journeyId/safety-notice`

**接口描述：** 为行程生成/刷新安全提示（调用 AI + 缓存）

**认证：** 需要 JWT Token（Bearer Token）

**Content-Type：** `application/json`

---

## 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `journeyId` | string | 是 | 行程ID（UUID） |

---

## 请求参数

### 请求体结构

```json
{
  "lang": "zh-CN",
  "forceRefresh": false
}
```

### 字段说明

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `lang` | string | 否 | 语言代码，默认 `zh-CN` |
| `forceRefresh` | boolean | 否 | 是否强制刷新（忽略缓存），默认 `false` |

---

## 请求示例

### cURL

```bash
curl -X POST "http://localhost:3000/api/v1/journeys/journey-id-123/safety-notice" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lang": "zh-CN",
    "forceRefresh": false
  }'
```

---

## 响应数据

### 成功响应（200 OK）

```json
{
  "success": true,
  "data": {
    "noticeText": "前往冰岛旅行时，请注意以下安全事项：\n\n1. 天气变化：冰岛天气多变，请随时关注天气预报，准备防风雨的衣物。\n\n2. 驾驶安全：冬季道路可能结冰，建议租用四驱车，并熟悉当地交通规则。\n\n3. 自然风险：远离危险区域，遵守景区安全提示，不要靠近火山、冰川边缘等危险地带。\n\n4. 紧急联系：冰岛紧急电话为112，可拨打此号码寻求帮助。\n\n5. 健康建议：建议购买旅行保险，携带常用药品。",
    "lang": "zh-CN",
    "fromCache": false,
    "generatedAt": "2025-01-15T12:00:00.000Z"
  },
  "message": "安全提示生成成功"
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 是否成功 |
| `data` | object | 安全提示数据 |
| `data.noticeText` | string | 安全提示文本内容 |
| `data.lang` | string | 语言代码 |
| `data.fromCache` | boolean | 是否来自缓存 |
| `data.generatedAt` | string | 生成时间（ISO 8601格式） |
| `message` | string | 响应消息 |

---

## 错误响应

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "行程不存在: journey-id-123",
  "error": "Not Found"
}
```

### 403 Forbidden

```json
{
  "statusCode": 403,
  "message": "无权访问此行程",
  "error": "Forbidden"
}
```

### 400 Bad Request - AI 服务调用失败

```json
{
  "statusCode": 400,
  "message": "AI服务调用失败: Connection timeout",
  "error": "Bad Request"
}
```

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

---

## 使用示例

### JavaScript/TypeScript

```typescript
const journeyId = 'journey-id-123';

// 生成安全提示（使用缓存）
const response = await fetch(`/api/v1/journeys/${journeyId}/safety-notice`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    lang: 'zh-CN',
    forceRefresh: false,
  }),
});

const result = await response.json();
if (result.success) {
  console.log('安全提示:', result.data.noticeText);
  console.log('是否来自缓存:', result.data.fromCache);
}

// 强制刷新安全提示
const refreshResponse = await fetch(`/api/v1/journeys/${journeyId}/safety-notice`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    lang: 'zh-CN',
    forceRefresh: true, // 强制刷新，忽略缓存
  }),
});
```

---

## 注意事项

1. **缓存机制**：
   - 系统会根据目的地、语言和行程摘要生成缓存键
   - 相同的目的地和行程摘要会复用缓存，缓存有效期为 7 天
   - 使用 `forceRefresh: true` 可以强制刷新，忽略缓存

2. **AI 生成**：
   - 如果缓存不存在或已过期，系统会调用 AI 生成新的安全提示
   - 生成的内容包括：当地安全状况、常见风险、紧急联系方式、健康建议、文化礼仪等

3. **权限控制**：
   - 只能为属于当前用户的行程生成安全提示
   - 需要有效的 JWT Token

4. **性能优化**：
   - 优先使用缓存，减少 AI 调用次数
   - 缓存命中时响应速度更快

5. **数据存储**：
   - 生成的安全提示会保存到行程的 `safetyNotice` 字段
   - 同时会保存到 `ai_safety_notice_cache` 表中供其他行程复用

