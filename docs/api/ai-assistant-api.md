# AI助手接口文档

## 概述

AI助手（Nara）是行程的智能管家，可以为用户提供专业的旅行建议、回答行程相关问题，并支持行程修改建议。

## 接口列表

### 1. 行程助手聊天

与AI助手进行对话，询问关于行程、预算、活动、时间安排等问题。

**接口地址：** `POST /api/v1/journeys/:journeyId/assistant/chat`

**认证：** 需要JWT认证

**路径参数：**
- `journeyId` (string, required): 行程ID

**请求体：**
```typescript
{
  message: string;              // 用户消息（必填）
  conversationId?: string;       // 对话ID（可选，用于多轮对话，如果不提供将创建新对话）
  language?: string;             // 语言代码（可选，默认'zh-CN'，支持'zh-CN'、'en-US'）
}
```

**请求示例：**
```json
{
  "message": "这个行程的预算大概是多少？",
  "conversationId": "uuid",
  "language": "zh-CN"
}
```

**响应体：**
```typescript
{
  success: boolean;              // 是否成功
  response: string;               // AI助手回复（Markdown格式）
  conversationId: string;         // 对话ID（用于后续多轮对话）
  message?: string;               // 消息（可选）
  modifications?: ModificationSuggestion[];  // 行程修改建议（当用户提出修改需求时）
}
```

**修改建议结构（ModificationSuggestion）：**
```typescript
{
  type: 'modify' | 'add' | 'delete' | 'reorder';  // 修改类型
  target: {
    day?: number;           // 天数（1-based）
    dayId?: string;         // 天数ID
    activityId?: string;     // 活动ID
    slotId?: string;        // 时间段ID（前端使用）
  };
  changes?: {               // 修改内容（用于 modify 类型）
    time?: string;          // 时间（HH:mm格式）
    title?: string;         // 标题
    type?: 'attraction' | 'meal' | 'hotel' | 'shopping' | 'transport' | 'ocean';
    duration?: number;       // 持续时间（分钟）
    location?: { lat: number; lng: number };  // 位置坐标
    notes?: string;         // 备注
    cost?: number;          // 费用
  };
  newActivity?: {          // 新活动数据（用于 add 类型）
    time: string;
    title: string;
    type: 'attraction' | 'meal' | 'hotel' | 'shopping' | 'transport' | 'ocean';
    duration: number;
    location: { lat: number; lng: number };
    notes?: string;
    cost?: number;
  };
  newOrder?: string[];     // 新的活动顺序（用于 reorder 类型）
  reason?: string;         // 修改原因（给用户看的说明）
}
```

**响应示例：**
```json
{
  "success": true,
  "response": "根据您的行程安排，总预算大约在**8000-12000元**之间...",
  "conversationId": "uuid",
  "message": "回复成功",
  "modifications": [
    {
      "type": "modify",
      "target": {
        "day": 1,
        "activityId": "activity-id-here"
      },
      "changes": {
        "time": "10:00"
      },
      "reason": "将活动时间调整为10:00，提供更充足的准备时间"
    }
  ]
}
```

**状态码：**
- `200`: 成功获取助手回复
- `400`: 请求参数错误或AI服务调用失败
- `403`: 无权访问此行程
- `404`: 行程不存在

**功能特性：**
1. **多轮对话支持**：通过`conversationId`参数实现多轮对话，保持上下文记忆
2. **自动保存历史**：所有对话消息会自动保存到数据库
3. **行程修改建议**：当用户提出修改需求时，Nara会生成结构化的修改建议
4. **专业回复格式**：使用Markdown格式，关键信息加粗，使用箭头展示路线

---

### 2. 获取对话历史

获取指定对话的所有历史消息。

**接口地址：** `GET /api/v1/journeys/:journeyId/assistant/conversations/:conversationId/history`

**认证：** 需要JWT认证

**路径参数：**
- `journeyId` (string, required): 行程ID
- `conversationId` (string, required): 对话ID

**响应体：**
```typescript
{
  success: boolean;              // 是否成功
  conversationId: string;        // 对话ID
  messages: ConversationMessage[]; // 对话消息列表
  totalCount: number;            // 消息总数
}
```

**消息结构（ConversationMessage）：**
```typescript
{
  id: string;                    // 消息ID
  role: 'user' | 'assistant';    // 消息角色
  content: string;                // 消息内容
  sequence: number;               // 消息序号（按时间顺序）
  metadata?: Record<string, unknown>;  // 元数据（如修改建议）
  createdAt: Date;                // 创建时间
}
```

**响应示例：**
```json
{
  "success": true,
  "conversationId": "uuid",
  "messages": [
    {
      "id": "msg-1",
      "role": "user",
      "content": "这个行程的预算大概是多少？",
      "sequence": 1,
      "createdAt": "2025-01-30T10:00:00Z"
    },
    {
      "id": "msg-2",
      "role": "assistant",
      "content": "根据您的行程安排，总预算大约在**8000-12000元**之间...",
      "sequence": 2,
      "metadata": {},
      "createdAt": "2025-01-30T10:00:05Z"
    }
  ],
  "totalCount": 2
}
```

**状态码：**
- `200`: 获取成功
- `403`: 无权访问此行程
- `404`: 行程或对话不存在

---

## AI助手特性

### 身份设定

Nara是一位拥有20年高端定制旅行经验的首席旅行管家（Senior Concierge），精通：
- 全球地理和复杂的交通物流
- 米其林餐饮体系
- 各地深度的文化禁忌

### 核心能力

1. **专家级路线优化**
   - 基于地理位置分析景点分布
   - 识别"折返跑"或效率低下的路线
   - 提供具体的优化方案和交通建议

2. **深度本地洞察**
   - 提供地道的游玩建议（如最佳时间、光线等）
   - 推荐餐厅时提及预约难度或着装要求

3. **批判性思维**
   - 识别预算与行程不匹配的情况
   - 主动识别行程中的隐形风险（如闭馆时间、雨季备选方案等）

4. **行程修改能力**
   - 识别修改意图（修改、添加、删除、重排序）
   - 生成结构化的修改建议
   - 提供清晰的文本说明

### 回复格式规范

- **语气**：专业、沉稳、周到、有条理，使用"您"而非"你"
- **排版**：使用Markdown格式，关键信息加粗，复杂建议使用列表
- **路线展示**：使用箭头符号（**地点A → 地点B → 地点C**）
- **回复结构**：先总结要点，再展开细节

### 示例回复

**正确示例：**
```
尊敬的贵宾，我是 Nara。基于您这份 **3天2晚瑞士卢塞恩** 的行程，我为您梳理了以下亮点...

**路线优化建议：**
- **地点A → 地点B → 地点C**（建议打车，约 15 分钟，费用约 2000 日元）
```

**修改场景示例：**
```
尊敬的贵宾，我理解您希望将第一天的第一个活动调整为 **10:00** 开始。根据您的行程安排，这可以让您有更充足的准备时间。

**修改建议：**
```json
{
  "modifications": [
    {
      "type": "modify",
      "target": {
        "day": 1,
        "activityId": "activity-id-here"
      },
      "changes": {
        "time": "10:00"
      },
      "reason": "将活动时间调整为10:00，提供更充足的准备时间"
    }
  ]
}
```

请确认是否执行此修改？
```

---

## 使用流程

### 1. 开始新对话

```bash
POST /api/v1/journeys/{journeyId}/assistant/chat
{
  "message": "你好，请介绍一下这个行程"
}
```

响应会返回`conversationId`，用于后续多轮对话。

### 2. 继续对话

```bash
POST /api/v1/journeys/{journeyId}/assistant/chat
{
  "message": "这个行程的预算大概是多少？",
  "conversationId": "从第一次响应获取的conversationId"
}
```

### 3. 请求修改行程

```bash
POST /api/v1/journeys/{journeyId}/assistant/chat
{
  "message": "把第一天的第一个活动改成10点开始",
  "conversationId": "conversationId"
}
```

响应会包含`modifications`字段，包含结构化的修改建议。

### 4. 查看对话历史

```bash
GET /api/v1/journeys/{journeyId}/assistant/conversations/{conversationId}/history
```

---

## 注意事项

1. **对话ID管理**：首次对话不提供`conversationId`会创建新对话，后续对话必须使用相同的`conversationId`以保持上下文
2. **修改建议**：修改建议是结构化的JSON数据，前端可以根据`type`和`target`字段执行相应的操作
3. **数据安全**：所有接口都会验证行程所有权，确保用户只能访问自己的行程
4. **语言支持**：目前支持中文（zh-CN）和英文（en-US），默认使用中文

---

## 错误处理

### 常见错误

1. **行程不存在（404）**
   ```json
   {
     "statusCode": 404,
     "message": "行程不存在"
   }
   ```

2. **无权访问（403）**
   ```json
   {
     "statusCode": 403,
     "message": "无权访问此行程"
   }
   ```

3. **AI服务调用失败（400）**
   ```json
   {
     "statusCode": 400,
     "message": "AI服务调用失败：..."
   }
   ```

---

## 更新日志

### 2025-01-30
- ✅ 实现对话历史存储功能
- ✅ 支持多轮对话上下文记忆
- ✅ 添加获取对话历史接口
- ✅ 支持行程修改建议（modify、add、delete、reorder）
- ✅ 优化AI助手回复格式和内容质量

