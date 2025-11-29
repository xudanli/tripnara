# 生成每日概要 API

## 概述

本文档描述了为具体行程生成每日概要的接口。该接口使用 AI 为行程的每一天生成生动有趣的概要，突出当天的亮点和特色活动。

**接口路径**: `POST /api/v1/journeys/{journeyId}/daily-summaries`

**认证**: 需要 JWT 认证（Bearer Token）

**Content-Type**: `application/json`

---

## 接口详情

### 请求

#### 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `journeyId` | string | 是 | 行程ID（UUID） |

#### 请求体

```json
{
  "day": 1
}
```

**字段说明**:

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `day` | number | 否 | 指定要生成概要的日期（第几天）。如果不提供，则生成所有天的概要。最小值为 1 |

#### 请求示例

**生成所有天的概要**:

```bash
curl -X POST "http://localhost:3000/api/v1/journeys/abc123/daily-summaries" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{}'
```

**生成指定天的概要**:

```bash
curl -X POST "http://localhost:3000/api/v1/journeys/abc123/daily-summaries" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "day": 1
  }'
```

---

### 响应

#### 成功响应（200 OK）

```json
{
  "success": true,
  "journeyId": "abc123",
  "destination": "瑞士琉森",
  "data": [
    {
      "day": 1,
      "date": "2024-06-01",
      "summary": "第一天将探索琉森老城区的历史建筑和文化遗产，漫步在卡佩尔桥和狮子纪念碑之间，感受这座中世纪城市的独特魅力。下午前往皮拉图斯山，乘坐世界上最陡峭的齿轮火车，欣赏阿尔卑斯山脉的壮丽景色。",
      "generatedAt": "2024-06-01T12:00:00.000Z"
    },
    {
      "day": 2,
      "date": "2024-06-02",
      "summary": "第二天将前往铁力士峰，登上海拔3020米的观景台，体验云端漫步的刺激。在山顶的冰川公园，您可以尝试各种雪上活动，感受冰雪世界的奇妙。傍晚返回琉森，在湖边享受宁静的时光。",
      "generatedAt": "2024-06-01T12:00:05.000Z"
    }
  ],
  "message": "成功生成 2 天的概要"
}
```

**响应字段说明**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `success` | boolean | 请求是否成功 |
| `journeyId` | string | 行程ID |
| `destination` | string | 目的地名称 |
| `data` | array | 每日概要列表 |
| `data[].day` | number | 第几天 |
| `data[].date` | string | 日期（YYYY-MM-DD格式） |
| `data[].summary` | string | 每日概要内容（80-120字） |
| `data[].generatedAt` | string | 生成时间（ISO 8601格式） |
| `message` | string | 操作消息 |

---

### 错误响应

#### 400 Bad Request

**行程数据为空**:

```json
{
  "statusCode": 400,
  "message": "行程数据为空，无法生成每日概要",
  "error": "Bad Request"
}
```

**指定的天数不存在**:

```json
{
  "statusCode": 400,
  "message": "第 10 天不存在",
  "error": "Bad Request"
}
```

#### 403 Forbidden

**无权访问此行程**:

```json
{
  "statusCode": 403,
  "message": "无权生成每日概要此行程",
  "error": "Forbidden"
}
```

#### 404 Not Found

**行程不存在**:

```json
{
  "statusCode": 404,
  "message": "行程不存在",
  "error": "Not Found"
}
```

---

## 功能特点

### 1. AI 生成概要

- 使用 DeepSeek AI 模型生成每日概要
- 根据当天的活动安排，生成生动有趣的概要
- 突出当天的亮点和特色活动
- 控制长度在 80-120 字之间

### 2. 模板回退机制

- 如果 AI 生成失败，自动使用模板生成概要
- 确保接口的稳定性和可用性

### 3. 灵活的生成选项

- 可以生成所有天的概要
- 也可以只生成指定天的概要
- 支持批量生成，提高效率

---

## 使用场景

1. **行程预览**: 在行程列表页面显示每日概要，让用户快速了解每天的安排
2. **行程分享**: 生成每日概要用于分享给朋友或家人
3. **行程回顾**: 旅行结束后，查看每日概要回顾旅行经历
4. **行程优化**: 通过查看每日概要，发现可以优化的地方

---

## 注意事项

1. **权限要求**: 只有行程的所有者才能生成每日概要
2. **数据要求**: 行程必须包含至少一天的活动数据
3. **AI 生成时间**: 生成概要需要调用 AI 服务，可能需要几秒钟时间
4. **概要长度**: 生成的概要长度控制在 80-120 字之间，确保简洁而富有吸引力
5. **重复调用**: 可以重复调用接口生成概要，每次都会重新生成（不缓存）

---

## 示例代码

### TypeScript/JavaScript

```typescript
import axios from 'axios';

interface GenerateDailySummariesRequest {
  day?: number;
}

interface DailySummary {
  day: number;
  date: string;
  summary: string;
  generatedAt: string;
}

interface GenerateDailySummariesResponse {
  success: boolean;
  journeyId: string;
  destination: string;
  data: DailySummary[];
  message?: string;
}

async function generateDailySummaries(
  journeyId: string,
  token: string,
  day?: number,
): Promise<GenerateDailySummariesResponse> {
  const response = await axios.post<GenerateDailySummariesResponse>(
    `http://localhost:3000/api/v1/journeys/${journeyId}/daily-summaries`,
    { day },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  );
  return response.data;
}

// 使用示例：生成所有天的概要
const allSummaries = await generateDailySummaries(
  'abc123',
  'your-jwt-token',
);

// 使用示例：只生成第1天的概要
const day1Summary = await generateDailySummaries(
  'abc123',
  'your-jwt-token',
  1,
);

console.log('每日概要:', allSummaries.data);
```

### Python

```python
import requests

def generate_daily_summaries(journey_id: str, token: str, day: int = None):
    """
    生成每日概要
    
    Args:
        journey_id: 行程ID
        token: JWT token
        day: 可选，指定要生成概要的日期（第几天）
    
    Returns:
        包含每日概要的响应数据
    """
    url = f"http://localhost:3000/api/v1/journeys/{journey_id}/daily-summaries"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    data = {}
    if day is not None:
        data["day"] = day
    
    response = requests.post(url, json=data, headers=headers)
    response.raise_for_status()
    return response.json()

# 使用示例
summaries = generate_daily_summaries("abc123", "your-jwt-token")
print(f"生成了 {len(summaries['data'])} 天的概要")

# 只生成第1天
day1 = generate_daily_summaries("abc123", "your-jwt-token", day=1)
print(f"第1天概要: {day1['data'][0]['summary']}")
```

---

## 相关接口

- [获取行程详情](./journey-api-02-get-itinerary.md) - 获取完整的行程信息
- [生成行程摘要](./travel-summary-api.md) - 生成整个行程的摘要
- [生成安全提示](./journey-api-38-public-safety-notice.md) - 生成目的地的安全提示

