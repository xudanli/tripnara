# 行程接口文档 - 26. 获取安全提示

## 接口信息

**接口路径：** `GET /api/v1/journeys/:journeyId/safety-notice`

**接口描述：** 获取当前行程的安全提示内容

**认证：** 需要 JWT Token（Bearer Token）

---

## 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `journeyId` | string | 是 | 行程ID（UUID） |

---

## 请求示例

### cURL

```bash
curl -X GET "http://localhost:3000/api/v1/journeys/journey-id-123/safety-notice" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 响应数据

### 成功响应（200 OK）- 有安全提示

```json
{
  "success": true,
  "data": {
    "noticeText": "前往冰岛旅行时，请注意以下安全事项：\n\n1. 天气变化：冰岛天气多变，请随时关注天气预报，准备防风雨的衣物。\n\n2. 驾驶安全：冬季道路可能结冰，建议租用四驱车，并熟悉当地交通规则。\n\n3. 自然风险：远离危险区域，遵守景区安全提示，不要靠近火山、冰川边缘等危险地带。\n\n4. 紧急联系：冰岛紧急电话为112，可拨打此号码寻求帮助。\n\n5. 健康建议：建议购买旅行保险，携带常用药品。",
    "lang": "zh-CN",
    "fromCache": false,
    "generatedAt": "2025-01-15T12:00:00.000Z"
  }
}
```

### 成功响应（200 OK）- 无安全提示

```json
{
  "success": true,
  "data": {
    "noticeText": "暂无安全提示，请先生成安全提示。",
    "lang": "zh-CN",
    "fromCache": false
  }
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 是否成功 |
| `data` | object | 安全提示数据 |
| `data.noticeText` | string | 安全提示文本内容 |
| `data.lang` | string | 语言代码 |
| `data.fromCache` | boolean | 是否来自缓存（获取接口始终为 false） |
| `data.generatedAt` | string | 生成时间（ISO 8601格式，如果存在） |

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

const response = await fetch(`/api/v1/journeys/${journeyId}/safety-notice`, {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const result = await response.json();
if (result.success) {
  if (result.data.noticeText && !result.data.noticeText.includes('暂无安全提示')) {
    console.log('安全提示:', result.data.noticeText);
    console.log('生成时间:', result.data.generatedAt);
  } else {
    console.log('暂无安全提示，需要先生成');
    // 可以调用生成接口
    // await generateSafetyNotice(journeyId);
  }
}
```

---

## 注意事项

1. **数据来源**：
   - 安全提示存储在行程的 `safetyNotice` 字段中
   - 如果行程没有安全提示，会返回提示信息，建议调用生成接口

2. **权限控制**：
   - 只能获取属于当前用户的行程的安全提示
   - 需要有效的 JWT Token

3. **使用流程**：
   - 首次获取时可能没有安全提示，需要先调用 `POST /api/v1/journeys/:journeyId/safety-notice` 生成
   - 生成后可以随时通过此接口获取

4. **与生成接口的区别**：
   - 此接口只获取已存在的安全提示，不会触发 AI 生成
   - 如果需要生成或刷新，请使用 `POST /api/v1/journeys/:journeyId/safety-notice` 接口

