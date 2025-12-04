# 路线优化接口 - 前端更新指南

## 概述

路线优化接口 (`POST /api/v1/journeys/optimize-route`) 已更新，确保活动ID在整个优化流程中被正确保留。本文档说明前端需要做的更新。

---

## 关键变更

### 1. **活动ID必须包含在请求中**

**重要**：虽然 `id` 字段是可选的，但**强烈建议前端在请求中包含活动ID**，以便：
- 后端可以正确保留和返回活动ID
- 前端可以根据ID匹配优化前后的活动
- 支持后续的编辑、删除等操作

### 2. **响应中活动ID会被保留**

优化后的活动列表会保留原始的活动ID，前端可以使用ID来：
- 匹配优化前后的活动
- 更新UI显示
- 进行后续操作

---

## 请求格式更新

### 必须包含的字段

```typescript
interface OptimizeRouteRequest {
  activities: Array<{
    id?: string;        // ⚠️ 强烈建议包含，用于匹配活动
    title: string;       // ✅ 必填
    location: {          // ✅ 必填
      lat: number;
      lng: number;
    };
    type?: string;       // 可选
    time?: string;       // 可选
    duration?: number;    // 可选（分钟）
  }>;
  profile?: 'driving' | 'walking' | 'cycling';  // 可选，默认 'driving'
  roundtrip?: boolean;   // 可选，默认 false
  source?: 'first' | 'any';  // 可选，默认 'first'
  destination?: 'last' | 'any';  // 可选，默认 'any'
}
```

### 示例请求

```typescript
const request = {
  activities: [
    {
      id: 'activity-1',  // ⚠️ 强烈建议包含
      title: '琉森湖游船',
      location: {
        lat: 47.0502,
        lng: 8.3093
      },
      type: 'attraction',
      time: '09:00',
      duration: 120
    },
    {
      id: 'activity-2',  // ⚠️ 强烈建议包含
      title: '铁力士峰',
      location: {
        lat: 46.7704,
        lng: 8.4050
      },
      type: 'attraction',
      time: '14:00',
      duration: 180
    }
  ],
  profile: 'driving',
  roundtrip: false,
  source: 'first',
  destination: 'any'
};
```

---

## 响应格式

### 响应结构

```typescript
interface OptimizeRouteResponse {
  success: boolean;
  activities: Array<{
    id?: string;        // ✅ 如果请求中包含ID，响应中会保留
    title: string;
    location: {
      lat: number;
      lng: number;
    };
    type?: string;
    time?: string;
    duration?: number;
    [key: string]: unknown;  // 其他字段会被保留
  }>;
  totalDistance: number;    // 总距离（米）
  totalDuration: number;    // 总时长（秒）
  routeGeometry?: {         // 路线几何形状（可选）
    coordinates: [number, number][];
    type: string;
  };
  legs?: Array<{            // 路线分段信息（可选）
    distance: number;        // 米
    duration: number;        // 秒
    from: number;           // 起点索引
    to: number;             // 终点索引
  }>;
}
```

### 示例响应

```json
{
  "success": true,
  "activities": [
    {
      "id": "activity-2",  // ✅ ID被保留
      "title": "铁力士峰",
      "location": {
        "lat": 46.7704,
        "lng": 8.4050
      },
      "type": "attraction",
      "time": "14:00",
      "duration": 180
    },
    {
      "id": "activity-1",  // ✅ ID被保留，顺序已优化
      "title": "琉森湖游船",
      "location": {
        "lat": 47.0502,
        "lng": 8.3093
      },
      "type": "attraction",
      "time": "09:00",
      "duration": 120
    }
  ],
  "totalDistance": 12500,
  "totalDuration": 1800,
  "routeGeometry": {
    "type": "LineString",
    "coordinates": [
      [8.3093, 47.0502],
      [8.4050, 46.7704]
    ]
  },
  "legs": [
    {
      "distance": 12500,
      "duration": 1800,
      "from": 0,
      "to": 1
    }
  ]
}
```

---

## 前端实现建议

### 1. **TypeScript 类型定义**

```typescript
// 定义请求类型
interface OptimizeRouteActivity {
  id?: string;  // 强烈建议包含
  title: string;
  location: {
    lat: number;
    lng: number;
  };
  type?: string;
  time?: string;
  duration?: number;
}

interface OptimizeRouteRequest {
  activities: OptimizeRouteActivity[];
  profile?: 'driving' | 'walking' | 'cycling';
  roundtrip?: boolean;
  source?: 'first' | 'any';
  destination?: 'last' | 'any';
}

interface OptimizeRouteResponse {
  success: boolean;
  activities: OptimizeRouteActivity[];
  totalDistance: number;
  totalDuration: number;
  routeGeometry?: {
    coordinates: [number, number][];
    type: string;
  };
  legs?: Array<{
    distance: number;
    duration: number;
    from: number;
    to: number;
  }>;
}
```

### 2. **API 调用示例**

```typescript
async function optimizeRoute(
  activities: OptimizeRouteActivity[],
  options?: {
    profile?: 'driving' | 'walking' | 'cycling';
    roundtrip?: boolean;
    source?: 'first' | 'any';
    destination?: 'last' | 'any';
  }
): Promise<OptimizeRouteResponse> {
  try {
    const response = await fetch('/api/v1/journeys/optimize-route', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        activities: activities.map(act => ({
          id: act.id,  // ⚠️ 确保包含ID
          title: act.title,
          location: act.location,
          type: act.type,
          time: act.time,
          duration: act.duration,
        })),
        profile: options?.profile || 'driving',
        roundtrip: options?.roundtrip ?? false,
        source: options?.source || 'first',
        destination: options?.destination || 'any',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '路线优化失败');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('路线优化失败:', error);
    throw error;
  }
}
```

### 3. **使用活动ID匹配优化前后的活动**

```typescript
// 优化前
const originalActivities = [
  { id: 'activity-1', title: '活动A', ... },
  { id: 'activity-2', title: '活动B', ... },
  { id: 'activity-3', title: '活动C', ... },
];

// 调用优化接口
const optimized = await optimizeRoute(originalActivities);

// 使用ID匹配优化后的活动
const activityMap = new Map(
  originalActivities.map(act => [act.id, act])
);

optimized.activities.forEach(optimizedAct => {
  if (optimizedAct.id) {
    const original = activityMap.get(optimizedAct.id);
    // 可以比较或合并数据
    console.log(`活动 ${original?.title} 的新位置:`, optimizedAct);
  }
});
```

### 4. **更新UI显示**

```typescript
// 使用优化后的活动列表更新UI
function updateActivitiesWithOptimizedOrder(
  originalActivities: Activity[],
  optimizedResponse: OptimizeRouteResponse
) {
  // 创建ID到原始活动的映射
  const activityMap = new Map(
    originalActivities.map(act => [act.id, act])
  );

  // 按照优化后的顺序重新排列
  const reorderedActivities = optimizedResponse.activities.map(optAct => {
    if (optAct.id) {
      const original = activityMap.get(optAct.id);
      return {
        ...original,
        ...optAct,  // 保留优化后的顺序和其他信息
      };
    }
    return optAct;
  });

  // 更新UI
  setActivities(reorderedActivities);
  
  // 显示优化信息
  console.log(`总距离: ${(optimizedResponse.totalDistance / 1000).toFixed(2)} 公里`);
  console.log(`总时长: ${Math.round(optimizedResponse.totalDuration / 60)} 分钟`);
}
```

---

## 注意事项

### 1. **活动ID的重要性**

- **强烈建议**在请求中包含活动ID
- 如果请求中没有ID，响应中也不会有ID
- 没有ID时，前端需要通过其他方式（如标题、坐标）匹配活动

### 2. **活动顺序变化**

- 优化后的活动顺序可能与原始顺序不同
- 使用活动ID来匹配优化前后的活动，而不是依赖数组索引

### 3. **坐标要求**

- 所有活动**必须**包含有效的 `location` 坐标（`lat` 和 `lng`）
- 如果活动没有坐标，优化接口会返回 400 错误

### 4. **活动数量限制**

- Mapbox Optimization API 最多支持 **12 个活动点**
- 如果超过 12 个，系统会自动只优化前 12 个
- 前端可以提示用户活动数量限制

### 5. **错误处理**

```typescript
try {
  const result = await optimizeRoute(activities);
  // 处理成功结果
} catch (error) {
  if (error.response?.status === 400) {
    // 参数错误
    console.error('请求参数错误:', error.response.data);
  } else if (error.response?.status === 401) {
    // 未授权
    console.error('请先登录');
  } else {
    // 其他错误
    console.error('路线优化失败:', error);
  }
}
```

---

## 迁移检查清单

- [ ] 确保请求中包含活动ID
- [ ] 更新TypeScript类型定义
- [ ] 使用活动ID匹配优化前后的活动（而不是数组索引）
- [ ] 处理活动顺序变化
- [ ] 添加错误处理
- [ ] 显示优化信息（总距离、总时长）
- [ ] 处理活动数量限制（最多12个）
- [ ] 验证所有活动都有坐标

---

## 相关文档

- [路线优化 API 接口文档](./journey-api-47-optimize-route.md)
- [行程优化接口设计思路](../../design/行程优化接口设计思路)

