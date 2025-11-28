# 行程接口文档 - 38. 生成通用安全提示（公开接口）

## 接口信息

**接口路径：** `POST /api/v1/journeys/safety-notice/public`

**接口描述：** 根据目的地生成通用安全提示，无需认证。支持缓存机制，相同目的地和语言的请求会返回缓存结果。

**认证：** 不需要（公开接口）

**Content-Type：** `application/json`

---

## 请求参数

### 请求体结构

```json
{
  "destination": "冰岛",
  "summary": "5天冰岛之旅，包含极光观赏、蓝湖温泉等",
  "lang": "zh-CN",
  "forceRefresh": false
}
```

### 字段说明

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `destination` | string | 是 | 目的地名称 |
| `summary` | string | 否 | 行程摘要（可选，用于更精准的安全提示） |
| `lang` | string | 否 | 语言代码，默认 `zh-CN` |
| `forceRefresh` | boolean | 否 | 是否强制刷新（忽略缓存），默认 `false` |

---

## 请求示例

### cURL

```bash
curl -X POST "http://localhost:3000/api/v1/journeys/safety-notice/public" \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "冰岛",
    "summary": "5天冰岛之旅，包含极光观赏、蓝湖温泉等",
    "lang": "zh-CN"
  }'
```

### JavaScript (Fetch)

```javascript
async function generatePublicSafetyNotice(destination, summary, lang = 'zh-CN') {
  const response = await fetch('http://localhost:3000/api/v1/journeys/safety-notice/public', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      destination,
      summary,
      lang,
    }),
  });

  if (!response.ok) {
    throw new Error('生成安全提示失败');
  }

  const result = await response.json();
  return result.data;
}

// 使用示例
try {
  const safetyNotice = await generatePublicSafetyNotice('冰岛', '5天冰岛之旅');
  console.log('安全提示:', safetyNotice.noticeText);
  console.log('是否来自缓存:', safetyNotice.fromCache);
} catch (error) {
  console.error('错误:', error.message);
}
```

### TypeScript (Axios)

```typescript
import axios from 'axios';

interface GeneratePublicSafetyNoticeRequest {
  destination: string;
  summary?: string;
  lang?: string;
  forceRefresh?: boolean;
}

interface SafetyNotice {
  noticeText: string;
  lang: string;
  fromCache?: boolean;
  generatedAt?: string;
}

interface GeneratePublicSafetyNoticeResponse {
  success: boolean;
  data: SafetyNotice;
  message?: string;
}

async function generatePublicSafetyNotice(
  request: GeneratePublicSafetyNoticeRequest
): Promise<SafetyNotice> {
  const response = await axios.post<GeneratePublicSafetyNoticeResponse>(
    'http://localhost:3000/api/v1/journeys/safety-notice/public',
    request
  );

  return response.data.data;
}

// 使用示例
const safetyNotice = await generatePublicSafetyNotice({
  destination: '冰岛',
  summary: '5天冰岛之旅，包含极光观赏、蓝湖温泉等',
  lang: 'zh-CN',
});
```

---

## 响应格式

### 成功响应 (200 OK)

```json
{
  "success": true,
  "data": {
    "noticeText": "前往冰岛旅行时，请注意以下安全事项：\n\n1. 天气变化：冰岛天气多变，请随时关注天气预报，准备防寒衣物...",
    "lang": "zh-CN",
    "fromCache": false,
    "generatedAt": "2025-11-28T17:40:00.000Z"
  },
  "message": "安全提示生成成功"
}
```

### 响应字段说明

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `success` | boolean | 是否成功 |
| `data.noticeText` | string | 安全提示文本内容 |
| `data.lang` | string | 语言代码 |
| `data.fromCache` | boolean | 是否来自缓存（可选） |
| `data.generatedAt` | string | 生成时间（ISO 8601格式） |
| `message` | string | 响应消息（可选） |

---

## 缓存机制

### 缓存策略

- **缓存键**：基于目的地、语言和行程摘要的哈希值
- **缓存有效期**：7天
- **缓存更新**：相同缓存键的请求会更新缓存时间

### 缓存命中示例

如果请求相同的目的地和语言，且缓存未过期，会直接返回缓存结果：

```json
{
  "success": true,
  "data": {
    "noticeText": "...",
    "lang": "zh-CN",
    "fromCache": true,
    "generatedAt": "2025-11-21T10:00:00.000Z"
  },
  "message": "安全提示（来自缓存）"
}
```

### 强制刷新

如果需要忽略缓存，生成新的安全提示，可以设置 `forceRefresh: true`：

```json
{
  "destination": "冰岛",
  "lang": "zh-CN",
  "forceRefresh": true
}
```

---

## 错误响应

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": ["destination should not be empty"],
  "error": "Bad Request"
}
```

### 500 Internal Server Error

```json
{
  "statusCode": 500,
  "message": "AI服务调用失败: ...",
  "error": "Internal Server Error"
}
```

---

## 使用场景

### 场景 1: 行程规划阶段

在用户规划行程时，可以提前获取目的地的安全提示：

```javascript
// 用户在搜索目的地时
const safetyNotice = await generatePublicSafetyNotice({
  destination: '冰岛',
  lang: 'zh-CN',
});

// 显示安全提示给用户
displaySafetyNotice(safetyNotice.noticeText);
```

### 场景 2: 多语言支持

支持不同语言的安全提示：

```javascript
// 中文
const zhNotice = await generatePublicSafetyNotice({
  destination: 'Iceland',
  lang: 'zh-CN',
});

// 英文
const enNotice = await generatePublicSafetyNotice({
  destination: 'Iceland',
  lang: 'en',
});
```

### 场景 3: 带行程摘要的精准提示

如果用户已经规划了行程，可以提供摘要以获得更精准的安全提示：

```javascript
const safetyNotice = await generatePublicSafetyNotice({
  destination: '冰岛',
  summary: '5天冰岛之旅，包含极光观赏、蓝湖温泉、冰川徒步等户外活动',
  lang: 'zh-CN',
});
```

---

## 注意事项

1. **无需认证**：此接口是公开接口，不需要 JWT Token
2. **缓存机制**：相同目的地和语言的请求会使用缓存，提高响应速度
3. **AI 生成**：首次请求或缓存过期时会调用 AI 生成，可能需要几秒钟
4. **语言支持**：目前支持 `zh-CN`（中文）和 `en`（英文）
5. **内容长度**：安全提示内容通常在 500-800 字之间

---

## 与行程相关接口的区别

| 特性 | 公开接口 | 行程相关接口 |
|------|---------|-------------|
| 认证 | ❌ 不需要 | ✅ 需要 JWT |
| 参数 | 目的地 + 摘要 | 行程 ID |
| 用途 | 通用查询 | 行程特定 |
| 缓存 | ✅ 支持 | ✅ 支持 |

---

## 相关接口

- [生成行程安全提示](./journey-api-25-generate-safety-notice.md) - 需要认证，关联到具体行程
- [获取行程安全提示](./journey-api-26-get-safety-notice.md) - 需要认证，获取行程的安全提示

