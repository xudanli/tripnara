# AI生成旅程接口 - 景点介绍生成思路

## 概述

AI生成旅程接口在生成行程时，会为每个活动（特别是景点）生成基本的介绍信息。本文档说明当前的生成思路和实现方式。

## 生成流程

### 1. 初始生成阶段（AI生成行程时）

在 `generateItinerary` 方法中，AI会一次性生成完整的行程，包括所有活动的基本信息。

#### 系统提示词（System Message）

```typescript
'你是一个专业的旅行规划师和创意文案师，擅长制定详细、实用的旅行行程，并为每个活动设计生动有趣的标题。请始终以纯JSON格式返回数据，不要添加任何额外的文字说明或解释，确保标题富有创意和吸引力。'
```

#### 用户提示词要求

AI在生成活动时，需要满足以下要求：

1. **活动标题要求**：
   - 要生动有趣，避免"经典景点游览"、"当地特色美食"等通用词汇
   - 景点标题要具体化，如"探秘千年古寺"、"漫步胡杨林金色海洋"、"登顶观日出云海"
   - 美食标题要有诱惑力，如"品味正宗手扒羊肉"、"邂逅蒙古奶茶的醇香"、"寻味街头巷尾小吃"

2. **活动描述（notes字段）**：
   - 要求：**每个活动的notes要详细描述体验内容和实用建议**
   - 这是AI在初始生成时提供的主要介绍内容

3. **返回格式**：

```json
{
  "days": [
    {
      "day": 1,
      "date": "2024-06-01",
      "activities": [
        {
          "time": "09:00",
          "title": "富有创意的活动标题",
          "type": "attraction",
          "duration": 120,
          "location": {"lat": 34.9949, "lng": 135.7850},
          "notes": "详细的游览建议和体验描述",
          "cost": 400
        }
      ]
    }
  ],
  "totalCost": 8000,
  "summary": "行程摘要"
}
```

### 2. 详细信息生成（可选，异步）

在初始生成后，系统还支持通过 `LocationService` 生成更详细的位置信息，但**这不是自动的**，需要前端或用户主动触发。

#### LocationService 功能

`LocationService.generateLocationInfo` 可以为活动生成详细的位置信息，包括：

1. **基本信息**：
   - 中文名称和当地语言名称
   - 具体街道地址（包含门牌号或地标建筑）
   - 交通方式（地铁站名、公交线路、步行路线）

2. **实用信息**：
   - 开放时间和最佳游览时间
   - 门票价格和优惠政策
   - 游览建议和注意事项
   - 周边推荐和联系方式

3. **深度信息**：
   - **穿搭建议**：根据活动类型、目的地气候和当地文化
   - **当地文化提示**：习俗、禁忌、礼仪要求、小费习惯、拍照限制等
   - **预订信息**：是否需要提前预订，如何预订，建议提前多久预订等

#### 生成提示词示例

```typescript
`你是一个专业的旅行助手，请为以下活动生成详细且具体的位置信息：

活动名称：${activityName}
目的地：${destination}
活动类型：${activityType}
坐标：${coordinates.lat}, ${coordinates.lng}
区域：${coordinates.region || '市中心区域'}
主要语言：${languageText}

**重要提醒：位置信息必须与活动名称完全匹配！**

请提供以下详细信息：
1. 准确的中文名称和当地语言名称（必须与活动内容匹配）
2. 具体的街道地址（包含门牌号或地标建筑）
3. 详细的交通方式（地铁站名、公交线路、步行路线）
4. 准确的开放时间和最佳游览时间
5. 详细的门票价格和优惠政策
6. 实用的游览建议和注意事项
7. 周边推荐和联系方式
8. **穿搭建议**：根据活动类型、目的地气候和当地文化，提供具体的穿着建议
9. **当地文化提示和特殊注意事项**：包括当地习俗、禁忌、礼仪要求、小费习惯、拍照限制、宗教场所注意事项等
10. **预订信息**：是否需要提前预订，如何预订（官网、电话、APP等），建议提前多久预订，是否有优惠政策等`
```

## 数据结构

### 活动基本信息（初始生成）

```typescript
{
  time: string;              // 时间（HH:mm格式）
  title: string;            // 活动标题（生动有趣）
  type: 'attraction' | 'meal' | 'hotel' | 'shopping' | 'transport' | 'ocean';
  duration: number;         // 持续时间（分钟）
  location: { lat: number; lng: number };  // 坐标
  notes: string;            // 详细的游览建议和体验描述 ⭐ 主要介绍内容
  cost: number;             // 预估费用
  details?: Record<string, unknown>;  // 详细信息（可选）
}
```

### 详细信息结构（LocationDetails）

```typescript
{
  chineseName?: string;           // 中文名称
  localName?: string;             // 当地语言名称
  chineseAddress?: string;        // 中文地址
  localAddress?: string;          // 当地语言地址
  transportInfo?: string;         // 交通信息
  openingHours?: string;          // 开放时间
  ticketPrice?: string;           // 门票价格
  visitTips?: string;             // 游览建议
  nearbyAttractions?: string;     // 周边推荐
  contactInfo?: string;           // 联系方式
  category?: string;              // 景点类型
  rating?: number;                // 评分（1-5）
  visitDuration?: number;         // 建议游览时长（分钟）
  bestTimeToVisit?: string;       // 最佳游览时间
  accessibility?: string;         // 无障碍设施信息
  dressingTips?: string;          // 穿搭建议
  culturalTips?: string;          // 当地文化提示
  bookingInfo?: string;           // 预订信息
}
```

## 当前实现特点

### ✅ 已实现

1. **初始生成**：
   - AI在生成行程时，会为每个活动生成 `notes` 字段
   - `notes` 包含"详细的游览建议和体验描述"
   - 标题要求生动有趣、具体化

2. **详细信息生成能力**：
   - `LocationService` 支持生成详细的位置信息
   - 支持缓存机制，相同活动的详细信息会被缓存
   - 支持批量生成

3. **数据存储**：
   - 基本信息存储在 `itinerary_activities` 表的 `notes` 字段
   - 详细信息可以存储在 `details` JSONB 字段中（通过 `locationDetails`）

### ⚠️ 当前限制

1. **详细信息不是自动生成的**：
   - 初始生成时，只包含基本的 `notes` 描述
   - 详细信息需要前端或用户主动调用 `LocationService` 生成
   - 不会在生成行程时自动为所有活动生成详细信息

2. **生成时机**：
   - 详细信息通常在以下场景生成：
     - 用户点击查看活动详情时
     - 用户编辑活动时
     - 前端主动调用位置信息生成接口

## 优化建议

### 方案1：异步批量生成详细信息（推荐）

在生成行程后，后台异步为所有景点生成详细信息：

```typescript
// 伪代码
async generateItinerary(dto) {
  // 1. 生成基本行程
  const itinerary = await this.generateBasicItinerary(dto);
  
  // 2. 异步生成详细信息（不阻塞响应）
  this.generateDetailsInBackground(itinerary);
  
  return itinerary;
}

async generateDetailsInBackground(itinerary) {
  for (const day of itinerary.days) {
    for (const activity of day.activities) {
      if (activity.type === 'attraction') {
        try {
          const details = await this.locationService.generateLocationInfo({
            activityName: activity.title,
            destination: itinerary.destination,
            activityType: activity.type,
            coordinates: activity.location,
          });
          
          // 更新活动的 details 字段
          await this.updateActivityDetails(activity.id, details);
        } catch (error) {
          // 失败不影响主流程
          this.logger.warn(`Failed to generate details for ${activity.title}`);
        }
      }
    }
  }
}
```

### 方案2：增强初始生成的提示词

在初始生成时，要求AI生成更详细的信息：

```typescript
prompt += `
6. 每个活动的notes要详细描述体验内容和实用建议，包括：
   - 景点的历史背景或特色亮点
   - 最佳游览时间和季节
   - 游览路线建议
   - 注意事项和实用提示
   - 周边推荐（如附近的美食、购物等）

7. 对于景点类型（attraction）的活动，notes应该包含：
   - 景点的核心特色和亮点
   - 游览时长建议
   - 最佳拍照位置或时间
   - 是否需要提前预订
   - 交通方式和到达建议
`;
```

### 方案3：混合方案

1. **初始生成**：AI生成包含较详细 `notes` 的基本信息
2. **异步增强**：后台异步生成更详细的结构化信息（地址、开放时间、预订信息等）
3. **用户触发**：用户查看详情时，如果详细信息未生成，则实时生成

## 相关接口

### 生成行程接口

- **接口**：`POST /api/v1/journeys/generate`
- **功能**：生成基本行程，包含 `notes` 字段

### 生成位置信息接口

- **接口**：`POST /api/v1/location/generate`（如果存在）
- **功能**：为活动生成详细的位置信息
- **使用场景**：用户查看活动详情时，或编辑活动时

### 创建活动接口

- **接口**：`POST /api/v1/journeys/:journeyId/days/:dayId/slots`
- **功能**：创建活动时，可以传入 `locationDetails` 字段
- **说明**：`locationDetails` 会被存储到 `details.locationDetails` 中

## 总结

**当前思路**：
1. AI在生成行程时，为每个活动生成基本的 `notes` 描述
2. 详细信息通过 `LocationService` 按需生成，不是自动的
3. 详细信息存储在 `details` 字段中，可以包含 `locationDetails`

**优化方向**：
- 考虑在生成行程后异步批量生成详细信息
- 或者增强初始生成的提示词，要求AI生成更详细的 `notes`
- 或者采用混合方案，初始生成较详细的 `notes`，后台异步生成结构化详细信息

