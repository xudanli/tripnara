# 前端集成异步位置信息生成接口指南

## 概述

后端已实现异步任务队列和持久化缓存优化，前端可以选择使用新的异步接口来提升用户体验，避免长时间等待。

## 接口变化

### 保留的同步接口（向后兼容）

以下接口保持不变，可以继续使用：

1. **生成单个活动位置信息**（同步）
   ```
   POST /api/location/generate
   ```
   - 适用于：单个活动，快速响应（< 5秒）
   - 返回：立即返回位置信息

2. **批量生成活动位置信息**（同步）
   ```
   POST /api/location/generate-batch
   ```
   - 适用于：少量活动（< 5个），可以等待
   - 返回：等待所有活动生成完成后返回结果
   - ⚠️ 注意：如果活动数量多，可能需要等待较长时间

### 新增的异步接口

1. **异步批量生成活动位置信息**
   ```
   POST /api/location/generate-batch-async
   ```
   - 适用于：大量活动（> 5个），需要更好的用户体验
   - 返回：立即返回 `jobId`，不等待任务完成
   - 优势：前端可以显示进度，用户可以继续其他操作

2. **查询任务状态**
   ```
   GET /api/location/job/:jobId
   ```
   - 用途：轮询任务状态
   - 返回：任务状态、进度、结果（如果完成）

3. **获取任务结果**
   ```
   GET /api/location/job/:jobId/result
   ```
   - 用途：获取已完成任务的结果
   - 返回：位置信息生成结果数组

## 前端改动方案

### 方案 A：使用异步接口（推荐）

适用于：大量活动（> 5个）或需要显示进度的场景

#### 1. 创建异步任务生成 Hook/Service

**TypeScript 类型定义**：

```typescript
// types/location.ts
export interface BatchActivity {
  activityName: string;
  destination: string;
  activityType: string;
  coordinates: {
    lat: number;
    lng: number;
    region?: string;
  };
}

export interface LocationInfo {
  // ... 位置信息结构
}

export interface JobStatus {
  id: string;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused' | 'not_found';
  progress?: number;
  result?: LocationInfo[];
  error?: string;
  data?: {
    activities: BatchActivity[];
  };
}

export interface EnqueueResponse {
  success: boolean;
  jobId: string;
}

export interface JobStatusResponse {
  success: boolean;
  data: JobStatus;
}
```

#### 2. 实现异步任务生成函数

**React Hook 示例**：

```typescript
// hooks/useLocationGeneration.ts
import { useState, useCallback, useRef } from 'react';
import { apiClient } from '@/utils/api';

interface UseLocationGenerationOptions {
  onProgress?: (progress: number) => void;
  onComplete?: (results: LocationInfo[]) => void;
  onError?: (error: string) => void;
  pollInterval?: number; // 轮询间隔（毫秒），默认 2000ms
}

export function useLocationGeneration(options: UseLocationGenerationOptions = {}) {
  const { onProgress, onComplete, onError, pollInterval = 2000 } = options;
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 停止轮询
  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  // 轮询任务状态
  const pollJobStatus = useCallback(async (jobId: string) => {
    try {
      const response = await apiClient.get<JobStatusResponse>(
        `/api/location/job/${jobId}`
      );
      const { data: jobStatus } = response.data;

      // 更新进度
      if (jobStatus.progress !== undefined) {
        setProgress(jobStatus.progress);
        onProgress?.(jobStatus.progress);
      }

      // 任务完成
      if (jobStatus.status === 'completed') {
        stopPolling();
        setIsGenerating(false);
        
        // 获取结果
        const resultResponse = await apiClient.get(
          `/api/location/job/${jobId}/result`
        );
        const results = resultResponse.data.data;
        
        onComplete?.(results);
        return results;
      }

      // 任务失败
      if (jobStatus.status === 'failed') {
        stopPolling();
        setIsGenerating(false);
        const error = jobStatus.error || '任务执行失败';
        onError?.(error);
        throw new Error(error);
      }

      // 继续轮询（如果任务还在进行中）
      if (['waiting', 'active'].includes(jobStatus.status)) {
        pollTimerRef.current = setTimeout(() => {
          pollJobStatus(jobId);
        }, pollInterval);
      }
    } catch (error) {
      stopPolling();
      setIsGenerating(false);
      const errorMessage = error instanceof Error ? error.message : '查询任务状态失败';
      onError?.(errorMessage);
      throw error;
    }
  }, [onProgress, onComplete, onError, pollInterval, stopPolling]);

  // 发起异步生成任务
  const generateAsync = useCallback(async (activities: BatchActivity[]) => {
    try {
      setIsGenerating(true);
      setProgress(0);

      // 1. 发起异步任务
      const response = await apiClient.post<EnqueueResponse>(
        '/api/location/generate-batch-async',
        { activities }
      );
      const { jobId: newJobId } = response.data;
      setJobId(newJobId);

      // 2. 开始轮询
      return await pollJobStatus(newJobId);
    } catch (error) {
      setIsGenerating(false);
      throw error;
    }
  }, [pollJobStatus]);

  // 取消任务（停止轮询，但无法取消后端任务）
  const cancel = useCallback(() => {
    stopPolling();
    setIsGenerating(false);
  }, [stopPolling]);

  return {
    generateAsync,
    cancel,
    isGenerating,
    progress,
    jobId,
  };
}
```

#### 3. 在组件中使用

**React 组件示例**：

```tsx
// components/LocationGenerationButton.tsx
import React from 'react';
import { useLocationGeneration } from '@/hooks/useLocationGeneration';
import { BatchActivity } from '@/types/location';

interface Props {
  activities: BatchActivity[];
  onComplete: (results: LocationInfo[]) => void;
}

export function LocationGenerationButton({ activities, onComplete }: Props) {
  const {
    generateAsync,
    cancel,
    isGenerating,
    progress,
  } = useLocationGeneration({
    onProgress: (progress) => {
      console.log(`生成进度: ${progress}%`);
    },
    onComplete: (results) => {
      console.log('生成完成:', results);
      onComplete(results);
    },
    onError: (error) => {
      console.error('生成失败:', error);
      // 显示错误提示
    },
  });

  const handleGenerate = async () => {
    try {
      await generateAsync(activities);
    } catch (error) {
      // 错误已在 onError 回调中处理
    }
  };

  return (
    <div>
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
      >
        {isGenerating ? `生成中... ${progress}%` : '生成位置信息'}
      </button>
      
      {isGenerating && (
        <div>
          <progress value={progress} max={100} />
          <button onClick={cancel}>取消</button>
        </div>
      )}
    </div>
  );
}
```

### 方案 B：继续使用同步接口（简单场景）

适用于：少量活动（< 5个）或不需要显示进度的场景

**无需改动**，继续使用现有代码：

```typescript
// 同步批量生成（保持不变）
const response = await apiClient.post(
  '/api/location/generate-batch',
  { activities }
);
const results = response.data.data;
```

## 迁移建议

### 渐进式迁移

1. **第一阶段**：保持现有同步接口调用不变
2. **第二阶段**：对于活动数量 > 5 的场景，切换到异步接口
3. **第三阶段**：全面使用异步接口，提供更好的用户体验

### 判断使用哪个接口

```typescript
// 根据活动数量选择接口
const shouldUseAsync = activities.length > 5;

if (shouldUseAsync) {
  // 使用异步接口
  const results = await generateAsync(activities);
} else {
  // 使用同步接口
  const response = await apiClient.post(
    '/api/location/generate-batch',
    { activities }
  );
  const results = response.data.data;
}
```

## 错误处理

### 任务状态说明

- `waiting`: 任务在队列中等待
- `active`: 任务正在执行
- `completed`: 任务完成
- `failed`: 任务失败
- `delayed`: 任务延迟
- `paused`: 任务暂停
- `not_found`: 任务不存在

### 错误处理示例

```typescript
const pollJobStatus = async (jobId: string) => {
  try {
    const response = await apiClient.get(`/api/location/job/${jobId}`);
    const { data: jobStatus } = response.data;

    if (jobStatus.status === 'failed') {
      // 处理失败情况
      const error = jobStatus.error || '未知错误';
      throw new Error(`任务失败: ${error}`);
    }

    if (jobStatus.status === 'not_found') {
      throw new Error('任务不存在，可能已过期');
    }

    // ... 其他状态处理
  } catch (error) {
    // 网络错误或其他错误
    if (error.response?.status === 404) {
      throw new Error('任务不存在');
    }
    throw error;
  }
};
```

## 性能优化建议

### 1. 轮询间隔优化

- 初始阶段（0-50%）：可以设置较长的轮询间隔（3-5秒）
- 后期阶段（50-100%）：可以设置较短的轮询间隔（1-2秒）

```typescript
const getPollInterval = (progress: number) => {
  if (progress < 50) {
    return 3000; // 3秒
  } else {
    return 1000; // 1秒
  }
};
```

### 2. 使用 WebSocket（可选，未来优化）

如果后端支持 WebSocket，可以使用 WebSocket 接收任务完成通知，避免轮询：

```typescript
// 未来优化：使用 WebSocket
const ws = new WebSocket(`ws://api/location/job/${jobId}/stream`);
ws.onmessage = (event) => {
  const { status, progress, result } = JSON.parse(event.data);
  // 更新 UI
};
```

### 3. 任务结果缓存

前端可以缓存已完成的任务结果，避免重复请求：

```typescript
const taskCache = new Map<string, LocationInfo[]>();

const getJobResult = async (jobId: string) => {
  if (taskCache.has(jobId)) {
    return taskCache.get(jobId)!;
  }
  
  const response = await apiClient.get(`/api/location/job/${jobId}/result`);
  const results = response.data.data;
  taskCache.set(jobId, results);
  return results;
};
```

## 测试建议

### 1. 单元测试

```typescript
describe('useLocationGeneration', () => {
  it('should generate location info asynchronously', async () => {
    const { result } = renderHook(() => useLocationGeneration());
    
    const activities = [/* ... */];
    await act(async () => {
      await result.current.generateAsync(activities);
    });
    
    expect(result.current.isGenerating).toBe(false);
  });
});
```

### 2. 集成测试

- 测试任务状态轮询
- 测试任务完成回调
- 测试错误处理
- 测试取消功能

## 总结

### 必须改动（如果使用异步接口）

1. ✅ 添加异步任务生成 Hook/Service
2. ✅ 实现任务状态轮询逻辑
3. ✅ 更新 UI 显示进度
4. ✅ 处理任务完成和错误情况

### 可选改动

1. ⚪ 根据活动数量自动选择同步/异步接口
2. ⚪ 添加任务结果缓存
3. ⚪ 优化轮询间隔
4. ⚪ 添加 WebSocket 支持（如果后端支持）

### 向后兼容

- ✅ 同步接口保持不变，现有代码无需修改
- ✅ 可以渐进式迁移，不影响现有功能
- ✅ 新功能是可选的，不影响现有用户体验

## 相关文档

- [后端异步任务队列实现文档](../backend/async-queue-and-cache-optimization.md)
- [位置信息生成 API 文档](../api/location-api.md)

