# Nara 行程修改功能设计

## 需求分析

当用户告诉 Nara 想要修改行程时，需要实现以下功能：
1. **识别修改意图**：Nara 能够识别用户想要修改行程的意图
2. **理解修改内容**：Nara 理解用户想要修改什么（活动、时间、地点、顺序等）
3. **生成修改建议**：Nara 生成结构化的修改建议
4. **执行修改**：后端或前端执行修改操作
5. **确认修改**：向用户确认修改结果

## 实现方案

### 方案A：结构化回复 + 前端执行（推荐）

**流程：**
1. 用户向 Nara 提出修改需求（如："把第一天的第一个活动改成10点开始"）
2. Nara 识别意图，理解修改内容，生成结构化的修改建议（JSON格式）
3. 前端解析 JSON，调用相应的 API 执行修改
4. Nara 向用户确认修改结果

**优点：**
- 实现简单，不需要给 Nara 工具调用能力
- 前端可以灵活处理修改逻辑
- 安全性好，前端可以验证修改内容

**缺点：**
- 需要前端配合解析和执行
- 修改操作分散在前端

### 方案B：统一执行接口（推荐用于复杂修改）

**流程：**
1. 用户向 Nara 提出修改需求
2. Nara 识别意图，生成结构化的修改指令（JSON格式）
3. 前端调用统一的"执行 Nara 建议"接口
4. 后端解析并执行所有修改操作
5. Nara 向用户确认修改结果

**优点：**
- 集中处理，逻辑清晰
- 可以批量执行多个修改操作
- 安全性好，后端可以验证和校验

**缺点：**
- 需要定义统一的指令格式
- 后端需要实现指令解析和执行逻辑

### 方案C：Nara 直接调用 API（最智能但最复杂）

**流程：**
1. 用户向 Nara 提出修改需求
2. Nara 识别意图，直接调用后端 API 执行修改
3. Nara 向用户确认修改结果

**优点：**
- 用户体验最好，一步到位
- 最智能，Nara 可以直接操作

**缺点：**
- 实现复杂，需要支持 Function Calling 或工具调用
- 安全性需要考虑（权限验证、操作验证等）

## 推荐实现：混合方案

结合方案A和方案B：

1. **简单修改**（单个活动的时间、标题等）：使用方案A，Nara 返回结构化建议，前端直接调用现有 API
2. **复杂修改**（批量修改、路线优化等）：使用方案B，Nara 返回修改指令，后端统一执行

## 数据结构设计

### 修改建议格式（方案A）

```typescript
interface ModificationSuggestion {
  type: 'modify' | 'add' | 'delete' | 'reorder';
  target: {
    day?: number;           // 天数（1-based）
    dayId?: string;          // 天数ID
    activityId?: string;     // 活动ID
    slotId?: string;        // 时间段ID（前端使用）
  };
  changes?: {
    time?: string;
    title?: string;
    type?: 'attraction' | 'meal' | 'hotel' | 'shopping' | 'transport' | 'ocean';
    duration?: number;
    location?: { lat: number; lng: number };
    notes?: string;
    cost?: number;
  };
  newActivity?: {
    time: string;
    title: string;
    type: 'attraction' | 'meal' | 'hotel' | 'shopping' | 'transport' | 'ocean';
    duration: number;
    location: { lat: number; lng: number };
    notes?: string;
    cost?: number;
  };
  reason?: string;          // 修改原因（给用户看的）
}
```

### 修改指令格式（方案B）

```typescript
interface ModificationInstruction {
  journeyId: string;
  operations: Array<{
    type: 'update_activity' | 'create_activity' | 'delete_activity' | 'reorder_activities' | 'update_day';
    target: {
      dayId?: string;
      activityId?: string;
    };
    data?: Record<string, unknown>;
  }>;
  summary: string;          // 修改摘要（给用户看的）
}
```

## API 设计

### 1. 修改建议响应格式

在 `JourneyAssistantChatResponseDto` 中添加可选字段：

```typescript
export class JourneyAssistantChatResponseDto {
  success!: boolean;
  response!: string;                    // AI 的文本回复
  conversationId!: string;
  message?: string;
  modifications?: ModificationSuggestion[];  // 修改建议（可选）
}
```

### 2. 执行修改指令接口（方案B）

```typescript
POST /api/v1/journeys/:journeyId/assistant/apply-modifications

Request Body:
{
  instructions: ModificationInstruction;
  confirm?: boolean;  // 是否需要确认
}

Response:
{
  success: boolean;
  message: string;
  applied: number;     // 成功应用的操作数
  failed: number;      // 失败的操作数
  details?: Array<{
    operation: string;
    success: boolean;
    message?: string;
  }>;
}
```

## 系统提示词更新

在 Nara 的系统提示词中添加修改行程的能力：

```
6. **行程修改能力 (Itinerary Modification)**：
   - 当用户提出修改行程的需求时，你需要：
     a. 识别用户想要修改的内容（活动、时间、地点、顺序等）
     b. 理解修改的意图和原因
     c. 生成结构化的修改建议（JSON格式）
     d. 在文本回复中说明修改内容和原因
   
   - 修改建议格式：
     - 单个活动修改：更新活动的时间、标题、地点等
     - 添加活动：在指定天数添加新活动
     - 删除活动：删除指定活动
     - 调整顺序：重新排列活动的顺序
     - 路线优化：基于地理位置优化活动顺序
   
   - 回复格式：
     - 先说明修改内容和原因
     - 然后提供结构化的修改建议（JSON格式，放在代码块中）
     - 询问用户是否确认执行修改
```

## 实现步骤

1. **第一阶段**：更新系统提示词，让 Nara 能够识别修改意图并生成修改建议
2. **第二阶段**：在响应 DTO 中添加 `modifications` 字段
3. **第三阶段**：前端解析修改建议，调用现有 API 执行简单修改
4. **第四阶段**：实现统一的修改指令接口，支持复杂修改
5. **第五阶段**：优化 Nara 的修改建议生成逻辑，提高准确性

## 示例场景

### 场景1：修改活动时间

**用户：** "把第一天的第一个活动改成10点开始"

**Nara 回复：**
```
尊敬的贵宾，我理解您希望将第一天的第一个活动调整为 **10:00** 开始。

根据您的行程安排，这可以让您有更充足的准备时间。

**修改建议：**
\`\`\`json
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
\`\`\`

请确认是否执行此修改？
```

### 场景2：路线优化

**用户：** "第一天的路线合理吗？"

**Nara 回复：**
```
尊敬的贵宾，我分析了您第一天的行程安排，发现存在路线不够优化的问题。

**当前路线：**
地点A → 地点C → 地点B

**优化建议：**
地点A → 地点B → 地点C

**原因：**
- 地点B和地点C距离较近，当前路线存在折返
- 优化后可以减少约 **20分钟** 的交通时间
- 建议使用 **地铁**，约 **15分钟**，费用约 **500日元**

**修改建议：**
\`\`\`json
{
  "modifications": [
    {
      "type": "reorder",
      "target": {
        "day": 1
      },
      "changes": {
        "newOrder": ["activity-id-1", "activity-id-2", "activity-id-3"]
      },
      "reason": "优化路线顺序，减少交通时间"
    }
  ]
}
\`\`\`

请确认是否执行此优化？
```

## 注意事项

1. **权限验证**：所有修改操作都需要验证用户权限
2. **数据验证**：修改内容需要验证数据格式和合理性
3. **错误处理**：修改失败时需要给出明确的错误信息
4. **用户确认**：重要修改需要用户确认后再执行
5. **日志记录**：记录所有修改操作，便于追踪和回滚

