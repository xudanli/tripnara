# 行程接口文档 - 44. 行程AI助手

## 接口信息

**接口路径：** `POST /api/v1/journeys/:journeyId/assistant/chat`

**接口描述：** 与行程AI助手对话，询问关于行程、预算、活动、时间安排、天气或注意事项等问题

**认证：** 需要 JWT Token（Bearer Token）

**Content-Type：** `application/json`

---

## 请求参数

### 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `journeyId` | string | 是 | 行程ID |

### 请求体结构

```json
{
  "message": "这个行程的预算大概是多少？",
  "conversationId": "uuid（可选，用于多轮对话）",
  "language": "zh-CN（可选，默认 zh-CN）"
}
```

### 字段说明

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `message` | string | 是 | 用户消息 |
| `conversationId` | string | 否 | 对话ID（用于多轮对话，如果不提供将创建新对话） |
| `language` | string | 否 | 语言代码，可选值：`zh-CN`（中文）、`en-US`（英文），默认 `zh-CN` |

---

## 请求示例

### cURL

```bash
curl -X POST "http://localhost:3000/api/v1/journeys/{journeyId}/assistant/chat" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "这个行程的预算大概是多少？",
    "language": "zh-CN"
  }'
```

### JavaScript (axios)

```javascript
const response = await axios.post(
  `/api/v1/journeys/${journeyId}/assistant/chat`,
  {
    message: '这个行程的预算大概是多少？',
    language: 'zh-CN',
  },
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);
```

---

## 响应数据

### 成功响应（200 OK）

```json
{
  "success": true,
  "response": "根据您的行程安排，总预算大约在8000-12000元之间。具体包括：住宿费用约3000-5000元，餐饮费用约2000-3000元，景点门票和活动费用约2000-3000元，交通费用约1000-2000元。建议您根据个人消费习惯和选择的住宿档次进行适当调整。",
  "conversationId": "uuid-123-456-789",
  "message": "回复成功"
}
```

### 响应字段说明

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `success` | boolean | 是否成功 |
| `response` | string | AI助手回复内容 |
| `conversationId` | string | 对话ID（用于多轮对话） |
| `message` | string | 响应消息 |

---

## 错误响应

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "助手回复失败: AI服务调用失败",
  "error": "Bad Request"
}
```

**可能原因：**
- 请求参数验证失败
- AI服务调用失败
- 行程数据格式错误

### 403 Forbidden

```json
{
  "statusCode": 403,
  "message": "无权访问此行程",
  "error": "Forbidden"
}
```

**可能原因：**
- 用户无权访问该行程

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "行程不存在: {journeyId}",
  "error": "Not Found"
}
```

**可能原因：**
- 行程ID不存在

---

## 功能说明

### AI助手能力

Trip Nara 助手可以回答以下类型的问题：

1. **行程相关问题**
   - 每天的安排是什么？
   - 有哪些必去的景点？
   - 行程的时间安排如何？

2. **预算相关问题**
   - 总预算大概是多少？
   - 每天的预算分配如何？
   - 哪些活动需要额外付费？

3. **活动相关问题**
   - 某个活动的详细信息
   - 活动之间的交通方式
   - 活动的推荐时间

4. **时间安排问题**
   - 每天的行程时间表
   - 活动之间的时间间隔
   - 最佳游览时间

5. **天气和注意事项**
   - 目的地的天气情况
   - 需要准备的物品
   - 旅行注意事项

6. **其他问题**
   - 如果问到计划中没有的细节，助手会基于目的地的通用知识给出建议

### 多轮对话

- 每次请求可以传入 `conversationId` 来维持对话上下文
- 如果不提供 `conversationId`，系统会自动生成一个新的对话ID
- 建议前端保存 `conversationId`，用于后续的多轮对话

### 语言支持

- 支持中文（`zh-CN`）和英文（`en-US`）
- 助手会根据 `language` 参数使用相应语言回答
- 默认使用中文

---

## 使用示例

### 示例1：询问预算

**请求：**
```json
{
  "message": "这个行程的预算大概是多少？"
}
```

**响应：**
```json
{
  "success": true,
  "response": "根据您的行程安排，总预算大约在8000-12000元之间...",
  "conversationId": "uuid-123"
}
```

### 示例2：询问活动安排

**请求：**
```json
{
  "message": "第一天有哪些活动？",
  "conversationId": "uuid-123"
}
```

**响应：**
```json
{
  "success": true,
  "response": "第一天您将参观琉森老城区，包括卡佩尔桥、狮子纪念碑等景点...",
  "conversationId": "uuid-123"
}
```

### 示例3：多轮对话

```javascript
// 第一轮对话
const response1 = await axios.post(
  `/api/v1/journeys/${journeyId}/assistant/chat`,
  { message: '这个行程的预算大概是多少？' }
);
const conversationId = response1.data.conversationId;

// 第二轮对话（使用相同的 conversationId）
const response2 = await axios.post(
  `/api/v1/journeys/${journeyId}/assistant/chat`,
  {
    message: '那每天的预算分配如何？',
    conversationId: conversationId,
  }
);
```

---

## 注意事项

1. **权限控制**：只有行程的所有者才能使用助手功能
2. **数据隐私**：助手只能访问当前行程的数据，不会访问其他行程
3. **响应时间**：AI回复可能需要几秒钟，建议前端显示加载状态
4. **对话历史**：当前版本不持久化对话历史，每次请求都是独立的（除非使用 conversationId）
5. **上下文限制**：助手基于当前行程的完整数据生成回复，包含所有天数和活动信息

---

## 技术实现

- **AI模型**：使用 DeepSeek Chat 模型
- **上下文**：将完整的行程数据（JSON格式）作为上下文传递给AI
- **提示词**：系统提示词定义了助手的角色、任务和回答要求
- **语言支持**：根据用户请求的语言参数调整回答语言

