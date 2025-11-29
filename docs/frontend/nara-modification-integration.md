# Nara 行程修改功能 - 前端集成文档

## 概述

Nara（AI旅行管家）现在支持识别用户的行程修改需求，并生成结构化的修改建议。前端需要解析这些建议并调用相应的API执行修改操作。

## 功能说明

当用户向 Nara 提出修改行程的需求时（如："把第一天的第一个活动改成10点开始"、"优化第一天的路线"、"删除某个活动"等），Nara 会：

1. 识别修改意图
2. 理解修改内容
3. 生成文本回复和结构化的修改建议（JSON格式）
4. 在响应中返回 `modifications` 字段

## API 响应格式

### 响应结构

```typescript
interface JourneyAssistantChatResponse {
  success: boolean;
  response: string;                    // Nara的文本回复
  conversationId: string;
  message?: string;
  modifications?: ModificationSuggestion[];  // 修改建议（可选）
}
```

### 修改建议数据结构

```typescript
interface ModificationSuggestion {
  type: 'modify' | 'add' | 'delete' | 'reorder';
  target: {
    day?: number;           // 天数（1-based）
    dayId?: string;         // 天数ID
    activityId?: string;    // 活动ID
    slotId?: string;        // 时间段ID（前端使用）
  };
  changes?: {               // 修改内容（用于 modify 类型）
    time?: string;
    title?: string;
    type?: 'attraction' | 'meal' | 'hotel' | 'shopping' | 'transport' | 'ocean';
    duration?: number;
    location?: { lat: number; lng: number };
    notes?: string;
    cost?: number;
  };
  newActivity?: {           // 新活动数据（用于 add 类型）
    time: string;
    title: string;
    type: 'attraction' | 'meal' | 'hotel' | 'shopping' | 'transport' | 'ocean';
    duration: number;
    location: { lat: number; lng: number };
    notes?: string;
    cost?: number;
  };
  newOrder?: string[];       // 新的活动顺序（用于 reorder 类型）
  reason?: string;           // 修改原因（给用户看的说明）
}
```

## 修改类型说明

### 1. modify - 修改现有活动

**场景**：修改活动的时间、标题、地点等属性

**示例**：
```json
{
  "type": "modify",
  "target": {
    "day": 1,
    "activityId": "activity-id-here",
    "slotId": "slot-id-here"
  },
  "changes": {
    "time": "10:00"
  },
  "reason": "将活动时间调整为10:00，提供更充足的准备时间"
}
```

**前端操作**：
- 调用 `PATCH /api/v1/journeys/:journeyId/days/:dayId/slots/:slotId`
- 传入 `changes` 中的字段

### 2. add - 添加新活动

**场景**：在指定天数添加新活动

**示例**：
```json
{
  "type": "add",
  "target": {
    "day": 1,
    "dayId": "day-id-here"
  },
  "newActivity": {
    "time": "14:00",
    "title": "新活动",
    "type": "attraction",
    "duration": 90,
    "location": { "lat": 46.7704, "lng": 8.4050 }
  },
  "reason": "在第一天下午添加新活动，丰富行程内容"
}
```

**前端操作**：
- 调用 `POST /api/v1/journeys/:journeyId/days/:dayId/slots`
- 传入 `newActivity` 中的数据

### 3. delete - 删除活动

**场景**：删除指定活动

**示例**：
```json
{
  "type": "delete",
  "target": {
    "day": 1,
    "activityId": "activity-id-here",
    "slotId": "slot-id-here"
  },
  "reason": "删除该活动以优化行程安排"
}
```

**前端操作**：
- 调用 `DELETE /api/v1/journeys/:journeyId/days/:dayId/slots/:slotId`

### 4. reorder - 重新排序活动

**场景**：优化路线，重新排列活动顺序

**示例**：
```json
{
  "type": "reorder",
  "target": {
    "day": 1,
    "dayId": "day-id-here"
  },
  "newOrder": ["activity-id-1", "activity-id-2", "activity-id-3"],
  "reason": "优化路线顺序，减少交通时间"
}
```

**前端操作**：
- 调用 `POST /api/v1/journeys/:journeyId/days/:dayId/slots/reorder`
- 传入 `{ activityIds: newOrder }`

## 前端实现步骤

### 步骤1：解析响应

```typescript
// 调用AI助手接口
const response = await fetch('/api/v1/journeys/:journeyId/assistant/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    message: userMessage,
    conversationId: conversationId,
    language: 'zh-CN'
  })
});

const data: JourneyAssistantChatResponse = await response.json();

// 检查是否有修改建议
if (data.modifications && data.modifications.length > 0) {
  // 处理修改建议
  await handleModifications(data.modifications, journeyId);
}
```

### 步骤2：处理修改建议

```typescript
async function handleModifications(
  modifications: ModificationSuggestion[],
  journeyId: string
) {
  for (const mod of modifications) {
    try {
      switch (mod.type) {
        case 'modify':
          await handleModify(mod, journeyId);
          break;
        case 'add':
          await handleAdd(mod, journeyId);
          break;
        case 'delete':
          await handleDelete(mod, journeyId);
          break;
        case 'reorder':
          await handleReorder(mod, journeyId);
          break;
      }
    } catch (error) {
      console.error(`处理修改建议失败: ${mod.type}`, error);
      // 可以显示错误提示给用户
    }
  }
}
```

### 步骤3：实现各种修改操作

#### 修改活动

```typescript
async function handleModify(
  mod: ModificationSuggestion,
  journeyId: string
) {
  const { target, changes } = mod;
  
  if (!target.dayId || !target.slotId) {
    throw new Error('缺少必要的目标信息');
  }
  
  const response = await fetch(
    `/api/v1/journeys/${journeyId}/days/${target.dayId}/slots/${target.slotId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(changes)
    }
  );
  
  if (!response.ok) {
    throw new Error('修改活动失败');
  }
  
  return await response.json();
}
```

#### 添加活动

```typescript
async function handleAdd(
  mod: ModificationSuggestion,
  journeyId: string
) {
  const { target, newActivity } = mod;
  
  if (!target.dayId || !newActivity) {
    throw new Error('缺少必要的目标信息或新活动数据');
  }
  
  const response = await fetch(
    `/api/v1/journeys/${journeyId}/days/${target.dayId}/slots`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(newActivity)
    }
  );
  
  if (!response.ok) {
    throw new Error('添加活动失败');
  }
  
  return await response.json();
}
```

#### 删除活动

```typescript
async function handleDelete(
  mod: ModificationSuggestion,
  journeyId: string
) {
  const { target } = mod;
  
  if (!target.dayId || !target.slotId) {
    throw new Error('缺少必要的目标信息');
  }
  
  const response = await fetch(
    `/api/v1/journeys/${journeyId}/days/${target.dayId}/slots/${target.slotId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  if (!response.ok) {
    throw new Error('删除活动失败');
  }
  
  return await response.json();
}
```

#### 重新排序活动

```typescript
async function handleReorder(
  mod: ModificationSuggestion,
  journeyId: string
) {
  const { target, newOrder } = mod;
  
  if (!target.dayId || !newOrder) {
    throw new Error('缺少必要的目标信息或新顺序');
  }
  
  const response = await fetch(
    `/api/v1/journeys/${journeyId}/days/${target.dayId}/slots/reorder`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        activityIds: newOrder
      })
    }
  );
  
  if (!response.ok) {
    throw new Error('重新排序活动失败');
  }
  
  return await response.json();
}
```

## 用户体验建议

### 1. 确认机制

在自动执行修改前，建议先向用户确认：

```typescript
if (data.modifications && data.modifications.length > 0) {
  // 显示修改建议摘要
  const summary = data.modifications
    .map(m => m.reason || `${m.type} 操作`)
    .join('\n');
  
  const confirmed = await showConfirmDialog({
    title: '确认执行修改',
    message: `Nara 建议进行以下修改：\n\n${summary}\n\n是否确认执行？`,
    confirmText: '确认执行',
    cancelText: '取消'
  });
  
  if (confirmed) {
    await handleModifications(data.modifications, journeyId);
    // 刷新行程数据
    await refreshItinerary(journeyId);
  }
}
```

### 2. 进度提示

在执行修改时显示进度：

```typescript
async function handleModifications(
  modifications: ModificationSuggestion[],
  journeyId: string
) {
  const total = modifications.length;
  let completed = 0;
  
  showProgress({
    message: `正在执行修改 (${completed}/${total})...`
  });
  
  for (const mod of modifications) {
    try {
      await executeModification(mod, journeyId);
      completed++;
      updateProgress({
        message: `正在执行修改 (${completed}/${total})...`
      });
    } catch (error) {
      console.error(`修改失败: ${mod.type}`, error);
      // 可以选择继续或中断
    }
  }
  
  hideProgress();
  showSuccessMessage('修改完成！');
}
```

### 3. 错误处理

```typescript
async function handleModifications(
  modifications: ModificationSuggestion[],
  journeyId: string
) {
  const results: Array<{
    modification: ModificationSuggestion;
    success: boolean;
    error?: string;
  }> = [];
  
  for (const mod of modifications) {
    try {
      await executeModification(mod, journeyId);
      results.push({ modification: mod, success: true });
    } catch (error) {
      results.push({
        modification: mod,
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }
  
  // 显示结果摘要
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  if (failCount > 0) {
    showWarningMessage(
      `完成 ${successCount} 项修改，${failCount} 项失败`
    );
  } else {
    showSuccessMessage(`成功完成 ${successCount} 项修改`);
  }
}
```

## 数据映射说明

### ID 映射

Nara 返回的修改建议中可能包含以下ID：

- `dayId`: 天数ID，对应后端的 `ItineraryDayEntity.id`
- `activityId`: 活动ID，对应后端的 `ItineraryActivityEntity.id`
- `slotId`: 时间段ID（前端使用），通常与 `activityId` 相同

**注意**：如果 Nara 只提供了 `day` 序号而没有 `dayId`，前端需要：
1. 根据 `day` 序号查找对应的 `dayId`
2. 或者使用现有的行程数据结构进行映射

### 示例：根据 day 序号查找 dayId

```typescript
function findDayIdByDayNumber(
  itinerary: ItineraryDetail,
  dayNumber: number
): string | undefined {
  const day = itinerary.days?.find(d => d.day === dayNumber);
  return day?.id;
}

function findSlotIdByActivityId(
  day: ItineraryDay,
  activityId: string
): string | undefined {
  // 如果前端使用 slotId，需要从活动数据中获取
  // 或者直接使用 activityId
  return activityId;
}
```

## 完整示例

```typescript
// 完整的处理流程示例
async function handleNaraModificationResponse(
  response: JourneyAssistantChatResponse,
  journeyId: string,
  itinerary: ItineraryDetail
) {
  // 1. 显示 Nara 的文本回复
  displayNaraMessage(response.response);
  
  // 2. 检查是否有修改建议
  if (!response.modifications || response.modifications.length === 0) {
    return;
  }
  
  // 3. 补充缺失的ID信息
  const enrichedModifications = response.modifications.map(mod => {
    // 如果只有 day 序号，查找对应的 dayId
    if (mod.target.day && !mod.target.dayId) {
      const day = itinerary.days?.find(d => d.day === mod.target.day);
      if (day) {
        mod.target.dayId = day.id;
      }
    }
    
    // 如果只有 activityId，补充 slotId（如果需要）
    if (mod.target.activityId && !mod.target.slotId) {
      mod.target.slotId = mod.target.activityId;
    }
    
    return mod;
  });
  
  // 4. 显示确认对话框
  const confirmed = await showModificationConfirmDialog(
    enrichedModifications
  );
  
  if (!confirmed) {
    return;
  }
  
  // 5. 执行修改
  try {
    await handleModifications(enrichedModifications, journeyId);
    
    // 6. 刷新行程数据
    await refreshItinerary(journeyId);
    
    // 7. 显示成功提示
    showSuccessMessage('修改已成功应用！');
  } catch (error) {
    console.error('执行修改失败:', error);
    showErrorMessage('部分修改执行失败，请查看详情');
  }
}
```

## 注意事项

1. **ID 映射**：确保正确映射 `dayId`、`activityId` 和 `slotId`
2. **权限验证**：所有API调用都需要JWT认证
3. **错误处理**：妥善处理API调用失败的情况
4. **用户体验**：在执行修改前向用户确认，执行后刷新数据
5. **批量操作**：如果有多项修改，建议逐个执行并显示进度
6. **数据一致性**：修改完成后及时刷新行程数据，确保UI与后端数据一致

## API 端点参考

- `PATCH /api/v1/journeys/:journeyId/days/:dayId/slots/:slotId` - 修改活动
- `POST /api/v1/journeys/:journeyId/days/:dayId/slots` - 添加活动
- `DELETE /api/v1/journeys/:journeyId/days/:dayId/slots/:slotId` - 删除活动
- `POST /api/v1/journeys/:journeyId/days/:dayId/slots/reorder` - 重新排序活动

详细API文档请参考：
- [Journey API 文档](../api/journey-api-44-assistant.md)

## 测试建议

1. **测试各种修改类型**：确保每种修改类型都能正确执行
2. **测试错误场景**：测试缺少ID、API调用失败等情况
3. **测试用户体验**：确保确认对话框、进度提示等正常工作
4. **测试数据一致性**：确保修改后数据正确刷新

## 更新日志

- 2025-11-29: 初始版本，支持基本的修改建议解析和执行

