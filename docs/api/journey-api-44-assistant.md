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
# 注意：URL 中的 {journeyId} 需要替换为实际的行程ID
curl -X POST "http://localhost:3000/api/v1/journeys/7a80e7ce-a359-4149-b0b1-534f316eb2bc/assistant/chat" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "这个行程的预算大概是多少？",
    "language": "zh-CN"
  }'
```

**重要提示：**
- 完整路径是：`/api/v1/journeys/:journeyId/assistant/chat`
- 全局前缀是 `api`，控制器路径是 `v1/journeys`，所以不需要重复添加 `/api`
- 如果前端配置了基础 URL 包含 `/api`，则只需要调用 `/v1/journeys/:journeyId/assistant/chat`

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

### 回复格式特点

助手会生成**清晰、结构化、易读**的回复：

- **简单问题**：直接回答，1-3句话，关键信息突出显示
- **复杂问题**：使用分点或列表，每点1-2句话
- **多维度问题**：分段回答，每段一个小标题或主题
- **数字和金额**：使用清晰的格式，如"约8000-12000元"、"每天约1500-2000元"
- **时间信息**：使用时间段格式，如"上午（09:00-12:00）"
- **列表格式**：使用符号（•、-）或数字组织信息
- **Markdown支持**：支持加粗（**文本**）等格式（如果前端支持Markdown渲染）

回复会适当使用换行和空行，避免过长的段落，保持每段不超过3-4句话。

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
  "response": "根据您的行程安排，总预算大约在 **8000-12000元** 之间，包括住宿、餐饮、景点门票和交通费用。\n\n具体分配：\n• 住宿费用：约3000-5000元\n• 餐饮费用：约2000-3000元\n• 景点门票：约2000-3000元\n• 交通费用：约1000-2000元",
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
  "response": "第一天的安排如下：\n\n**上午（09:00-12:00）**\n• 参观琉森老城区，包括卡佩尔桥和狮子纪念碑\n• 预计游览时间：2-3小时\n\n**下午（14:00-17:00）**\n• 游览琉森湖，可以选择游船或湖边漫步\n• 建议预留3小时，包括拍照和休息时间\n\n**晚上（18:00-20:00）**\n• 品尝当地特色美食\n• 推荐尝试瑞士奶酪火锅或琉森湖鱼",
  "conversationId": "uuid-123"
}
```

### 示例3：多轮对话

```javascript
// 注意：如果 axios 配置了 baseURL 为 '/api'，则路径应该是 '/v1/journeys/...'
// 如果 baseURL 为空，则路径应该是 '/api/v1/journeys/...'

// 第一轮对话
const response1 = await axios.post(
  `/v1/journeys/${journeyId}/assistant/chat`, // 假设 baseURL 已配置为 '/api'
  { message: '这个行程的预算大概是多少？' }
);
const conversationId = response1.data.conversationId;

// 第二轮对话（使用相同的 conversationId）
const response2 = await axios.post(
  `/v1/journeys/${journeyId}/assistant/chat`,
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

