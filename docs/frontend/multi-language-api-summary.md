# 前端多语言支持接口清单

## 概述

本文档列出了所有支持多语言的 API 接口，以及前端需要如何传递语言参数。

## 已支持多语言的接口

### ✅ 1. 生成旅行行程
- **接口**: `POST /api/v1/journeys/generate`
- **字段**: `language` (可选)
- **支持值**: `zh-CN` (默认), `en-US`, `en`
- **说明**: 生成对应语言的行程内容（活动标题、描述、摘要等）

```typescript
{
  "destination": "Paris",
  "days": 5,
  "startDate": "2025-12-10",
  "language": "en-US",  // 🆕 新增字段
  "preferences": { ... }
}
```

### ✅ 2. 行程助手聊天
- **接口**: `POST /api/v1/journeys/:journeyId/assistant/chat`
- **字段**: `language` (可选)
- **支持值**: `zh-CN` (默认), `en-US`, `en`
- **说明**: AI 助手回复使用对应语言

```typescript
{
  "message": "What's the budget for this trip?",
  "conversationId": "uuid",
  "language": "en-US"  // 🆕 已有字段
}
```

### ✅ 3. 生成安全提示
- **接口**: `POST /api/v1/journeys/:journeyId/safety-notice`
- **字段**: `lang` (可选) ⚠️ 注意：字段名是 `lang`，不是 `language`
- **支持值**: `zh-CN` (默认), `en-US`, `en`
- **说明**: 生成对应语言的安全提示

```typescript
{
  "lang": "en-US",  // ⚠️ 注意字段名是 lang
  "forceRefresh": false
}
```

### ✅ 4. 生成通用安全提示（公开接口）
- **接口**: `POST /api/v1/journeys/safety-notice/public`
- **字段**: `lang` (可选) ⚠️ 注意：字段名是 `lang`，不是 `language`
- **支持值**: `zh-CN` (默认), `en-US`, `en`
- **说明**: 生成对应语言的通用安全提示（无需认证）

```typescript
{
  "destination": "Paris",
  "summary": "5-day trip to Paris",
  "lang": "en-US"  // ⚠️ 注意字段名是 lang
}
```

### ✅ 5. 灵感模式生成行程
- **接口**: `POST /api/v1/inspiration/generate-itinerary`
- **字段**: `language` (可选)
- **支持值**: `zh-CN` (默认), `en-US`, `en`
- **说明**: 生成对应语言的灵感行程

```typescript
{
  "input": "I want to visit Paris for 5 days",
  "language": "en-US",  // 🆕 已有字段
  "selectedDestination": "Paris"
}
```

## 需要前端添加语言支持的接口

### ⚠️ 1. 生成每日概要
- **接口**: `POST /api/v1/journeys/:journeyId/daily-summaries`
- **当前状态**: ❌ 不支持 language 字段
- **建议**: 后端需要添加 `language` 字段支持

### ⚠️ 2. 获取文化红黑榜
- **接口**: `GET /api/v1/journeys/:journeyId/cultural-guide`
- **当前状态**: ❌ 不支持 language 参数（GET 请求，需要 query 参数）
- **建议**: 后端需要添加 `?language=en-US` query 参数支持

### ⚠️ 3. 获取本地实用信息
- **接口**: `GET /api/v1/journeys/:journeyId/local-essentials`
- **当前状态**: ❌ 不支持 language 参数（GET 请求，需要 query 参数）
- **建议**: 后端需要添加 `?language=en-US` query 参数支持

### ⚠️ 4. 生成旅行摘要
- **接口**: `POST /api/travel/summary`
- **当前状态**: ❌ 不支持 language 字段
- **建议**: 后端需要添加 `language` 字段支持

## 前端实现建议

### 1. 统一语言字段命名

建议前端统一使用 `language` 字段名，但在调用以下接口时转换为 `lang`：
- `POST /api/v1/journeys/:journeyId/safety-notice`
- `POST /api/v1/journeys/safety-notice/public`

```typescript
// 统一语言处理函数
function buildRequestWithLanguage(baseRequest: any, language: string) {
  return {
    ...baseRequest,
    language: language,  // 大部分接口使用 language
  };
}

// 特殊接口使用 lang
function buildSafetyNoticeRequest(baseRequest: any, language: string) {
  return {
    ...baseRequest,
    lang: language,  // 安全提示接口使用 lang
  };
}
```

### 2. 语言检测逻辑

```typescript
function getUserLanguage(): string {
  // 1. 用户选择/设置的语言（最高优先级）
  const userPreference = getUserPreference('language');
  if (userPreference) return userPreference;
  
  // 2. 浏览器语言设置
  const browserLang = navigator.language || 'zh-CN';
  if (browserLang.startsWith('en')) return 'en-US';
  if (browserLang.startsWith('zh')) return 'zh-CN';
  
  // 3. 默认值
  return 'zh-CN';
}
```

### 3. 请求示例

```typescript
// 生成行程（已支持）
const generateRequest = {
  destination: "Paris",
  days: 5,
  startDate: "2025-12-10",
  language: getUserLanguage(),  // ✅ 已支持
  preferences: { ... }
};

// 行程助手聊天（已支持）
const chatRequest = {
  message: "What's the budget?",
  language: getUserLanguage(),  // ✅ 已支持
  conversationId: "uuid"
};

// 生成安全提示（已支持，但字段名不同）
const safetyRequest = {
  lang: getUserLanguage(),  // ✅ 已支持，但字段名是 lang
  forceRefresh: false
};

// 获取文化红黑榜（待支持）
// 当前：GET /api/v1/journeys/:journeyId/cultural-guide
// 建议：GET /api/v1/journeys/:journeyId/cultural-guide?language=en-US

// 获取本地实用信息（待支持）
// 当前：GET /api/v1/journeys/:journeyId/local-essentials
// 建议：GET /api/v1/journeys/:journeyId/local-essentials?language=en-US

// 生成每日概要（待支持）
const dailySummaryRequest = {
  day: 1,
  language: getUserLanguage()  // ⚠️ 待后端支持
};

// 生成旅行摘要（待支持）
const summaryRequest = {
  destination: "Paris",
  itinerary: { ... },
  language: getUserLanguage()  // ⚠️ 待后端支持
};
```

## 支持的语言代码

| 语言代码 | 说明 | 使用场景 |
|---------|------|---------|
| `zh-CN` | 简体中文（默认） | 中文用户界面 |
| `en-US` | 美式英语 | 英文用户界面 |
| `en` | 英语（简写） | 同 `en-US` |

## 注意事项

1. **字段名不一致**：
   - 大部分接口使用 `language`
   - 安全提示接口使用 `lang`
   - 前端需要根据接口类型选择正确的字段名

2. **向后兼容**：
   - 所有 `language`/`lang` 字段都是可选的
   - 如果不传递，默认使用 `zh-CN`

3. **GET 请求参数**：
   - 文化红黑榜和本地实用信息是 GET 请求
   - 需要后端添加 query 参数支持（待实现）

4. **缓存考虑**：
   - 文化红黑榜和本地实用信息有缓存
   - 不同语言的缓存键应该不同
   - 后端需要更新缓存键逻辑（待实现）

## 待后端实现的接口

以下接口需要后端添加语言支持：

1. ✅ `POST /api/v1/journeys/generate` - 已支持
2. ✅ `POST /api/v1/journeys/:journeyId/assistant/chat` - 已支持
3. ✅ `POST /api/v1/journeys/:journeyId/safety-notice` - 已支持（使用 `lang`）
4. ✅ `POST /api/v1/journeys/safety-notice/public` - 已支持（使用 `lang`）
5. ✅ `POST /api/v1/inspiration/generate-itinerary` - 已支持
6. ⚠️ `POST /api/v1/journeys/:journeyId/daily-summaries` - 待支持
7. ⚠️ `GET /api/v1/journeys/:journeyId/cultural-guide` - 待支持（query 参数）
8. ⚠️ `GET /api/v1/journeys/:journeyId/local-essentials` - 待支持（query 参数）
9. ⚠️ `POST /api/travel/summary` - 待支持

## 相关文档

- [多语言支持指南](./multi-language-support.md) - 详细的前端实现指南
- [LLM 调用接口清单](../api/llm-endpoints.md) - 所有 LLM 接口列表
