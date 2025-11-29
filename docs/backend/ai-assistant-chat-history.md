# AI助手聊天历史存储功能

## 概述

实现了AI助手（Nara）与用户的对话历史存储功能，支持多轮对话的上下文记忆。

## 实现内容

### 1. 数据库实体

**文件**: `src/modules/persistence/entities/conversation.entity.ts`

创建了 `ConversationMessageEntity` 实体，包含以下字段：
- `id`: UUID主键
- `conversationId`: 对话ID（同一对话的所有消息共享此ID）
- `journeyId`: 行程ID
- `userId`: 用户ID
- `role`: 消息角色（'user' 或 'assistant'）
- `content`: 消息内容
- `sequence`: 消息序号（在同一对话中的顺序）
- `metadata`: 元数据（JSON格式，可存储修改建议等额外信息）
- `createdAt`: 创建时间
- `updatedAt`: 更新时间

### 2. 数据库迁移

**文件**: `src/migrations/20250130000000-create-conversation-messages.ts`

创建了 `conversation_messages` 表，包含：
- 主键和索引
- 外键约束（关联到 `itineraries` 和 `users` 表）
- 角色检查约束
- 复合索引用于快速查询

### 3. Repository层方法

**文件**: `src/modules/persistence/repositories/itinerary/itinerary.repository.ts`

添加了以下方法：
- `saveConversationMessage()`: 保存对话消息
- `getConversationHistory()`: 获取对话历史（支持限制数量）
- `getConversationIdsByJourney()`: 获取行程的所有对话ID列表
- `deleteConversation()`: 删除对话的所有消息

### 4. Service层功能

**文件**: `src/modules/itinerary/itinerary.service.ts`

#### 修改了 `journeyAssistantChat` 方法：

1. **保存用户消息**：在调用LLM之前保存用户消息
2. **加载对话历史**：从数据库加载最近的20条历史消息
3. **构建消息上下文**：将系统提示、历史消息和当前消息组合传递给LLM
4. **保存AI回复**：在生成回复后保存AI的回复（包括修改建议元数据）
5. **保存欢迎消息**：首次对话时保存欢迎消息

#### 新增了 `getConversationHistory` 方法：

- 验证行程所有权
- 获取并返回对话历史
- 转换为DTO格式

### 5. Controller层接口

**文件**: `src/modules/itinerary/journey-v1.controller.ts`

#### 现有接口（已更新）：
- `POST /api/v1/journeys/:journeyId/assistant/chat`: 聊天接口（现在会保存历史）

#### 新增接口：
- `GET /api/v1/journeys/:journeyId/assistant/conversations/:conversationId/history`: 获取对话历史

### 6. DTO定义

**文件**: `src/modules/itinerary/dto/itinerary.dto.ts`

新增了以下DTO：
- `ConversationMessageDto`: 对话消息DTO
- `GetConversationHistoryResponseDto`: 获取对话历史响应DTO

## 功能特性

### 1. 对话历史存储
- ✅ 所有用户消息和AI回复都会自动保存到数据库
- ✅ 支持多轮对话的上下文记忆
- ✅ 每个对话有唯一的 `conversationId`

### 2. 上下文记忆
- ✅ LLM调用时会自动加载最近20条历史消息
- ✅ 历史消息按时间顺序传递给LLM，保持对话连贯性
- ✅ 系统提示词始终在最前面

### 3. 欢迎消息
- ✅ 首次对话时自动生成并保存欢迎消息
- ✅ 欢迎消息会根据行程数据动态调整内容

### 4. 修改建议存储
- ✅ AI生成的修改建议会保存在消息的 `metadata` 字段中
- ✅ 方便后续查询和分析

### 5. 数据安全
- ✅ 所有操作都验证行程所有权
- ✅ 对话历史只能由行程所有者访问

## API使用示例

### 1. 发送消息（自动保存）

```bash
POST /api/v1/journeys/{journeyId}/assistant/chat
Authorization: Bearer {token}
Content-Type: application/json

{
  "message": "这个行程的预算大概是多少？",
  "conversationId": "existing-conversation-id" // 可选，不提供会创建新对话
}
```

响应：
```json
{
  "success": true,
  "response": "根据您的行程安排...",
  "conversationId": "conversation-id",
  "message": "回复成功"
}
```

### 2. 获取对话历史

```bash
GET /api/v1/journeys/{journeyId}/assistant/conversations/{conversationId}/history
Authorization: Bearer {token}
```

响应：
```json
{
  "success": true,
  "conversationId": "conversation-id",
  "messages": [
    {
      "id": "message-id-1",
      "role": "assistant",
      "content": "欢迎消息...",
      "sequence": 1,
      "createdAt": "2025-01-30T10:00:00Z"
    },
    {
      "id": "message-id-2",
      "role": "user",
      "content": "这个行程的预算大概是多少？",
      "sequence": 2,
      "createdAt": "2025-01-30T10:01:00Z"
    },
    {
      "id": "message-id-3",
      "role": "assistant",
      "content": "根据您的行程安排...",
      "sequence": 3,
      "metadata": {
        "modifications": [...]
      },
      "createdAt": "2025-01-30T10:01:05Z"
    }
  ],
  "totalCount": 3
}
```

## 数据库表结构

```sql
CREATE TABLE "conversation_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id" uuid NOT NULL,
  "journey_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" varchar(20) NOT NULL CHECK ("role" IN ('user', 'assistant')),
  "content" text NOT NULL,
  "sequence" int NOT NULL,
  "metadata" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY ("journey_id") REFERENCES "itineraries"("id") ON DELETE CASCADE,
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- 索引
CREATE INDEX "IDX_conversation_id_created_at" ON "conversation_messages" ("conversation_id", "created_at");
CREATE INDEX "IDX_conversation_journey_id" ON "conversation_messages" ("journey_id", "conversation_id");
CREATE INDEX "IDX_conversation_user_id" ON "conversation_messages" ("user_id");
```

## 注意事项

1. **对话历史限制**：默认加载最近20条消息，避免上下文过长
2. **级联删除**：删除行程时会自动删除所有相关对话消息
3. **性能考虑**：大量对话历史可能影响查询性能，建议定期归档旧数据
4. **隐私保护**：对话内容包含用户敏感信息，需要妥善保管

## 后续优化建议

1. **对话列表接口**：添加获取行程所有对话列表的接口
2. **消息搜索**：支持在对话历史中搜索关键词
3. **对话归档**：支持将旧对话归档，减少数据库压力
4. **统计功能**：添加对话统计（消息数量、对话时长等）
5. **导出功能**：支持导出对话历史为文本或PDF

