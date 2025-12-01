# 准确地理编码 API 文档

## 概述

准确地理编码接口结合了 **AI 意图识别** 和 **Mapbox Geocoding API**，支持自然语言描述的地点查询。该接口可以处理标准地名查询，也可以理解复杂的自然语言描述（如"那个有很多鹿的日本公园"），并自动提取标准地名后进行地理编码。

**基础路径**: `/api/v1/destinations` (注意：应用已设置全局前缀 `api`)

**认证**: 不需要（公开接口）

**后端调用**: 
- Mapbox Geocoding API: `GET https://api.mapbox.com/geocoding/v5/mapbox.places/{query}.json`
- AI 服务: DeepSeek LLM（用于复杂查询的意图识别）

---

## 准确地理编码接口

### 接口信息

- **URL**: `POST /api/v1/destinations/geocode/accurate`
- **认证**: 不需要
- **Content-Type**: `application/json`

### 请求参数

#### 请求体 (Request Body)

```json
{
  "query": "那个有很多鹿的日本公园",
  "useAI": false
}
```

#### 参数说明

| 参数 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `query` | string | 是 | 地点查询文本（支持自然语言描述，最少2个字符） | `"那个有很多鹿的日本公园"` 或 `"奈良公园"` |
| `useAI` | boolean | 否 | 是否强制使用 AI 辅助（默认 `false`，自动判断） | `false` |

**`useAI` 参数说明**：
- `false`（默认）：智能模式，先尝试直接 Mapbox 查询，失败则自动使用 AI 辅助
- `true`：强制使用 AI 辅助，跳过直接查询步骤

### 响应格式

#### 成功响应 (200 OK)

```json
{
  "success": true,
  "name": "奈良公园",
  "address": "奈良公园, 奈良县, 日本",
  "location": {
    "latitude": 34.6851,
    "longitude": 135.8388
  },
  "countryCode": "JP",
  "placeType": "poi",
  "usedAI": true
}
```

#### 失败响应 (200 OK)

```json
{
  "success": false
}
```

#### 响应字段说明

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `success` | boolean | 是否成功 | `true` |
| `name` | string | 地点名称（可选，成功时提供） | `"奈良公园"` |
| `address` | string | 完整地址（可选，成功时提供） | `"奈良公园, 奈良县, 日本"` |
| `location` | object | 坐标信息（可选，成功时提供） | `{ "latitude": 34.6851, "longitude": 135.8388 }` |
| `location.latitude` | number | 纬度 (-90 到 90) | `34.6851` |
| `location.longitude` | number | 经度 (-180 到 180) | `135.8388` |
| `countryCode` | string | 国家代码（可选，ISO 3166-1 alpha-2） | `"JP"` |
| `placeType` | string | 地点类型（可选） | `"poi"`（兴趣点）、`"place"`（地点）、`"address"`（地址）等 |
| `usedAI` | boolean | 是否使用了 AI 辅助（可选，成功时提供） | `true` |

### 请求示例

#### cURL

```bash
# 标准地名查询（智能模式）
curl -X POST "http://localhost:3000/api/v1/destinations/geocode/accurate" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "奈良公园"
  }'

# 自然语言查询（智能模式）
curl -X POST "http://localhost:3000/api/v1/destinations/geocode/accurate" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "那个有很多鹿的日本公园"
  }'

# 强制使用 AI 辅助
curl -X POST "http://localhost:3000/api/v1/destinations/geocode/accurate" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "哈佛大学附近的那个有名的红砖美术馆",
    "useAI": true
  }'
```

#### JavaScript (Fetch)

```javascript
async function accurateGeocode(query, useAI = false) {
  const response = await fetch(
    'http://localhost:3000/api/v1/destinations/geocode/accurate',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        useAI,
      }),
    }
  );

  if (!response.ok) {
    throw new Error('地理编码请求失败');
  }

  const result = await response.json();
  
  if (!result.success) {
    return null; // 未找到匹配的地点
  }

  return result;
}

// 使用示例
try {
  // 标准地名查询
  const result1 = await accurateGeocode('奈良公园');
  if (result1) {
    console.log('地点名称:', result1.name); // 奈良公园
    console.log('坐标:', result1.location); // { latitude: 34.6851, longitude: 135.8388 }
    console.log('是否使用AI:', result1.usedAI); // false
  }

  // 自然语言查询
  const result2 = await accurateGeocode('那个有很多鹿的日本公园');
  if (result2) {
    console.log('AI提取的地点:', result2.name); // 奈良公园
    console.log('是否使用AI:', result2.usedAI); // true
  }
} catch (error) {
  console.error('错误:', error.message);
}
```

#### TypeScript (Axios)

```typescript
import axios from 'axios';

interface AccurateGeocodeRequest {
  query: string;
  useAI?: boolean;
}

interface AccurateGeocodeResponse {
  success: boolean;
  name?: string;
  address?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  countryCode?: string;
  placeType?: string;
  usedAI?: boolean;
}

async function accurateGeocode(
  query: string,
  useAI: boolean = false
): Promise<AccurateGeocodeResponse | null> {
  try {
    const response = await axios.post<AccurateGeocodeResponse>(
      'http://localhost:3000/api/v1/destinations/geocode/accurate',
      {
        query,
        useAI,
      } as AccurateGeocodeRequest
    );

    if (!response.data.success) {
      return null; // 未找到匹配的地点
    }

    return response.data;
  } catch (error) {
    console.error('地理编码失败:', error);
    return null;
  }
}

// 使用示例
const result = await accurateGeocode('那个有很多鹿的日本公园');
if (result) {
  console.log('地点信息:', result);
  // {
  //   success: true,
  //   name: '奈良公园',
  //   address: '奈良公园, 奈良县, 日本',
  //   location: { latitude: 34.6851, longitude: 135.8388 },
  //   countryCode: 'JP',
  //   placeType: 'poi',
  //   usedAI: true
  // }
}
```

### 错误处理

#### 错误响应格式

接口在失败时会返回 `{ success: false }`，不会抛出 HTTP 错误。但以下情况可能返回 HTTP 错误：

```json
{
  "statusCode": 400,
  "message": [
    "query must be longer than or equal to 2 characters"
  ],
  "error": "Bad Request"
}
```

#### 常见错误

| 状态码 | 错误信息 | 说明 |
|--------|---------|------|
| 400 | `query must be longer than or equal to 2 characters` | 查询文本太短（少于2个字符） |
| 400 | `query must be a string` | 查询参数类型错误 |
| 500 | 内部服务器错误 | Mapbox API 调用失败或 AI 服务异常 |

**注意**：即使 Mapbox API 或 AI 服务调用失败，接口也会返回 `{ success: false }` 而不是抛出异常，保证接口的稳定性。

### 工作原理

#### 智能搜索模式（`useAI: false`，默认）

1. **第一步**：直接调用 Mapbox Geocoding API 查询
   - 如果成功，直接返回结果（`usedAI: false`）
   - 如果失败，进入第二步

2. **第二步**：使用 AI 提取标准地名
   - 调用 DeepSeek LLM，从自然语言描述中提取标准地点名称
   - 例如："那个有很多鹿的日本公园" → "奈良公园"

3. **第三步**：使用提取的标准地名再次调用 Mapbox API
   - 如果成功，返回结果（`usedAI: true`）
   - 如果失败，返回 `{ success: false }`

#### 强制 AI 模式（`useAI: true`）

1. **直接使用 AI 提取标准地名**
2. **使用提取的标准地名调用 Mapbox API**
3. **返回结果**（`usedAI: true`）

### 使用场景

1. **行程规划中的地点搜索**：
   - 用户输入自然语言描述的地点，系统自动识别并获取坐标
   - 例如："巴黎那个铁塔" → 埃菲尔铁塔的坐标

2. **智能地点补全**：
   - 当用户输入模糊描述时，系统自动理解并补全为标准地名
   - 例如："东京那个看樱花的地方" → 上野公园

3. **多语言地点查询**：
   - 支持中文自然语言描述，自动转换为标准地名
   - 适用于中文用户界面

4. **地点坐标获取**：
   - 无论是标准地名还是自然语言描述，都能获取准确的经纬度坐标
   - 用于地图标记、距离计算等场景

### 前端对接建议

1. **错误处理**：
   - 当 `success: false` 时，提示用户"未找到匹配的地点"
   - 可以建议用户使用更标准的地名或更详细的描述

2. **性能优化**：
   - 对于标准地名（如"奈良公园"），智能模式会直接查询，速度较快
   - 对于自然语言描述，需要 AI 处理，可能需要 1-3 秒
   - 建议在输入框添加防抖（debounce），避免频繁请求

3. **用户体验**：
   - 显示加载状态，特别是使用 AI 时
   - 可以通过 `usedAI` 字段判断是否使用了 AI，用于统计或提示
   - 建议在输入框下方显示提示："支持自然语言描述，如'那个有很多鹿的日本公园'"

4. **缓存策略**：
   - 相同查询的结果可以本地缓存
   - 标准地名的查询结果可以长期缓存（如 24 小时）
   - AI 辅助的查询结果可以短期缓存（如 1 小时）

5. **降级方案**：
   - 如果接口返回 `success: false`，可以：
     - 提示用户使用更标准的地名
     - 提供地点名称建议
     - 允许用户手动输入坐标

### 示例：在行程规划中使用

```typescript
// 用户输入自然语言描述，获取地点坐标
async function addActivityFromDescription(description: string) {
  // 调用准确地理编码接口
  const geocodeResult = await accurateGeocode(description);
  
  if (!geocodeResult || !geocodeResult.success) {
    // 提示用户
    alert('未找到匹配的地点，请尝试使用更标准的地名');
    return;
  }

  // 使用获取的坐标创建活动
  const activity = {
    name: geocodeResult.name || description,
    address: geocodeResult.address,
    coordinates: {
      lat: geocodeResult.location!.latitude,
      lng: geocodeResult.location!.longitude,
    },
    countryCode: geocodeResult.countryCode,
    placeType: geocodeResult.placeType,
  };

  // 添加到行程
  await addActivityToItinerary(activity);
  
  // 显示提示
  if (geocodeResult.usedAI) {
    console.log(`AI 识别出地点：${geocodeResult.name}`);
  }
}
```

### 配置要求

**后端环境变量**：
- `MAPBOX_ACCESS_TOKEN`：Mapbox API 访问令牌（必需）
- `MAPBOX_BASE_URL`：Mapbox API 基础 URL（可选，默认：`https://api.mapbox.com`）
- `DEEPSEEK_API_KEY`：DeepSeek LLM API 密钥（AI 功能需要）
- `DEEPSEEK_BASE_URL`：DeepSeek API 基础 URL（可选）

**注意**：如果未配置 `MAPBOX_ACCESS_TOKEN`，接口会返回错误。如果未配置 `DEEPSEEK_API_KEY`，AI 辅助功能将不可用，但标准地名查询仍可正常工作。

### AI 意图识别示例

以下是一些 AI 可以识别的自然语言描述示例：

| 用户输入 | AI 提取的标准地名 | 说明 |
|---------|-----------------|------|
| "那个有很多鹿的日本公园" | 奈良公园 | 著名景点特征识别 |
| "哈佛大学附近的那个有名的红砖美术馆" | 哈佛艺术博物馆 | 相对位置 + 特征识别 |
| "巴黎那个铁塔" | 埃菲尔铁塔 | 城市 + 地标识别 |
| "东京那个看樱花的地方" | 上野公园 | 城市 + 活动特征识别 |
| "瑞士那个最高的山峰" | 马特洪峰 | 国家 + 特征识别 |

### 注意事项

1. **查询文本长度**：最少需要 2 个字符
2. **AI 处理时间**：使用 AI 辅助时，响应时间可能较长（1-3 秒）
3. **准确性**：标准地名查询准确性高，自然语言描述依赖于 AI 的理解能力
4. **成本考虑**：AI 辅助查询会消耗 LLM API 配额，建议合理使用
5. **语言支持**：目前主要支持中文自然语言描述，其他语言可能需要调整 AI 提示词

