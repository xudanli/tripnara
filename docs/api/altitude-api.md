# 高海拔地区 API 接口文档

## 基础信息

- **Base URL**: `/travel-advisor/altitude`
- **认证方式**: Bearer Token (JWT)
- **Content-Type**: `application/json`

---

## 接口列表

1. [搜索高海拔地区](#1-搜索高海拔地区)
2. [获取高海拔地区风险报告](#2-获取高海拔地区风险报告)

---

## 1. 搜索高海拔地区

### 接口信息

- **路径**: `GET /travel-advisor/altitude/search`
- **功能**: 根据关键词模糊搜索高海拔地区，支持地区名称、别名、国家名称搜索
- **说明**: 
  - 支持中文和英文搜索
  - 支持地区名称、别名、国家名称的模糊匹配
  - 最多返回 5 条结果
  - 搜索基于静态数据，响应速度快（0 延迟）

### 查询参数

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `q` | string | 是 | 搜索关键词 | `"拉萨"` / `"Lhasa"` / `"中国"` |

### 请求示例

#### cURL

```bash
curl -X GET "http://localhost:3000/travel-advisor/altitude/search?q=拉萨" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### JavaScript/TypeScript

```typescript
const response = await fetch('/travel-advisor/altitude/search?q=拉萨', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const result = await response.json();
```

---

## 响应数据

### 成功响应 (200 OK)

```json
{
  "results": [
    {
      "id": "cn-lasa",
      "name": "拉萨",
      "aliases": ["Lhasa"],
      "country": "中国",
      "region": "西藏",
      "altitudeRange": "约 3650m",
      "category": "extreme",
      "notes": "进藏首站，需注意第一晚睡眠。"
    },
    {
      "id": "cn-kunming",
      "name": "昆明",
      "aliases": ["Kunming"],
      "country": "中国",
      "region": "云南",
      "altitudeRange": "约 1890m",
      "category": "medium",
      "notes": "基本无高反风险。"
    }
  ]
}
```

### 响应字段说明

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `results` | array | 搜索结果列表（最多 5 条） | - |
| `results[].id` | string | 地区唯一标识符 | `"cn-lasa"` |
| `results[].name` | string | 地区名称 | `"拉萨"` |
| `results[].aliases` | string[] | 别名列表（可选） | `["Lhasa", "Lasa"]` |
| `results[].country` | string | 国家名称 | `"中国"` |
| `results[].region` | string | 地区/省份（可选） | `"西藏"` |
| `results[].altitudeRange` | string | 海拔范围描述 | `"约 3650m"` |
| `results[].category` | string | 海拔分类 | `"low"` / `"medium"` / `"high"` / `"extreme"` |
| `results[].notes` | string | 特殊说明（可选） | `"进藏首站，需注意第一晚睡眠。"` |

### 海拔分类说明

| 分类 | 说明 | 典型海拔范围 |
|------|------|-------------|
| `low` | 低海拔 | < 2500m |
| `medium` | 中等海拔 | 2500m - 3500m |
| `high` | 高海拔 | 3500m - 4500m |
| `extreme` | 极高海拔 | > 4500m |

### 空结果响应

```json
{
  "results": []
}
```

---

## 错误响应

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "查询参数 q 不能为空",
  "error": "Bad Request"
}
```

---

## 2. 获取高海拔地区风险报告

### 接口信息

- **路径**: `GET /travel-advisor/altitude/risk`
- **功能**: 获取指定高海拔地区的实时天气和风险评估，包括风险等级、建议、标签等
- **说明**: 
  - 结合实时天气数据（Open-Meteo API）和静态海拔数据
  - 使用智能算法评估高反风险
  - 支持 Redis 缓存（30 分钟），提高响应速度
  - 风险等级会根据海拔、温度、风速等因素动态计算

### 查询参数

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `id` | string | 是 | 地区ID（从搜索接口获取） | `"cn-lasa"` |

### 请求示例

#### cURL

```bash
curl -X GET "http://localhost:3000/travel-advisor/altitude/risk?id=cn-lasa" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### JavaScript/TypeScript

```typescript
const response = await fetch('/travel-advisor/altitude/risk?id=cn-lasa', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const result = await response.json();
```

---

## 响应数据

### 成功响应 (200 OK)

```json
{
  "regionName": "拉萨",
  "elevation": "约 3650m",
  "currentWeather": {
    "temp": "5°C",
    "wind": "15 km/h"
  },
  "riskAssessment": {
    "level": "HIGH",
    "colorCode": "#FF4500",
    "advice": "高海拔地区，建议到达后在酒店休息 2-3 小时再活动。 ⚠️ 当前气温极低，极易诱发失温和肺水肿，请务必保暖！ ⚠️ 外部风力强劲，体感温度会更低。",
    "tags": ["高海拔", "寒冷", "大风"]
  },
  "fromCache": false
}
```

### 响应字段说明

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `regionName` | string | 地区名称 | `"拉萨"` |
| `elevation` | string | 海拔范围 | `"约 3650m"` |
| `currentWeather` | object | 当前天气信息 | - |
| `currentWeather.temp` | string | 温度 | `"5°C"` |
| `currentWeather.wind` | string | 风速 | `"15 km/h"` |
| `riskAssessment` | object | 风险评估 | - |
| `riskAssessment.level` | string | 风险等级 | `"CRITICAL"` / `"HIGH"` / `"MEDIUM"` / `"LOW"` |
| `riskAssessment.colorCode` | string | 风险颜色代码（用于 UI 显示） | `"#FF4500"` |
| `riskAssessment.advice` | string | 风险建议文本 | `"高海拔地区，建议到达后在酒店休息 2-3 小时再活动。"` |
| `riskAssessment.tags` | string[] | 风险标签列表 | `["高海拔", "寒冷", "大风"]` |
| `fromCache` | boolean | 是否来自缓存 | `false` |

### 风险等级说明

| 等级 | 颜色代码 | 说明 | 典型场景 |
|------|---------|------|---------|
| `CRITICAL` | `#FF0000` | 极高风险 | 极高海拔 + 极低温度 |
| `HIGH` | `#FF4500` | 高风险 | 高海拔 + 低温/大风，或开车直达 |
| `MEDIUM` | `#FFA500` | 中等风险 | 高海拔，或中等海拔 + 低温 |
| `LOW` | `#28a745` | 低风险 | 中等海拔，天气良好 |

### 风险标签说明

常见标签包括：
- `极高海拔` / `高海拔` / `中等海拔`
- `极寒` / `寒冷`
- `大风`
- `开车直达`（特别危险，身体缺乏适应时间）

---

## 错误响应

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "高海拔地区不存在: cn-invalid",
  "error": "Not Found"
}
```

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "查询参数 id 不能为空",
  "error": "Bad Request"
}
```

---

## 使用示例

### 完整流程示例

```typescript
// 1. 搜索高海拔地区
async function searchAltitudeRegions(query: string) {
  const response = await fetch(
    `/travel-advisor/altitude/search?q=${encodeURIComponent(query)}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  const result = await response.json();
  return result.results;
}

// 2. 获取风险报告
async function getRiskReport(regionId: string) {
  const response = await fetch(
    `/travel-advisor/altitude/risk?id=${regionId}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`获取风险报告失败: ${response.statusText}`);
  }
  
  return await response.json();
}

// 使用示例
async function checkAltitudeRisk(destination: string) {
  try {
    // 搜索目的地
    const regions = await searchAltitudeRegions(destination);
    
    if (regions.length === 0) {
      console.log('未找到高海拔地区');
      return;
    }
    
    // 获取第一个结果的风险报告
    const riskReport = await getRiskReport(regions[0].id);
    
    console.log(`地区: ${riskReport.regionName}`);
    console.log(`海拔: ${riskReport.elevation}`);
    console.log(`风险等级: ${riskReport.riskAssessment.level}`);
    console.log(`建议: ${riskReport.riskAssessment.advice}`);
    console.log(`标签: ${riskReport.riskAssessment.tags.join(', ')}`);
    
    // 根据风险等级显示不同颜色
    const color = riskReport.riskAssessment.colorCode;
    // 在 UI 中使用 color 设置背景色或边框色
    
  } catch (error) {
    console.error('获取高海拔风险信息失败:', error);
  }
}
```

---

## 注意事项

### 1. 数据来源

- **搜索接口**：基于静态数据（`high-altitude.data.ts`），包含 75+ 个高海拔地区
- **风险报告接口**：
  - 静态数据：海拔信息、地区信息
  - 实时数据：天气信息（Open-Meteo API）
  - 缓存：Redis 缓存 30 分钟，提高响应速度

### 2. 性能优化

- **搜索接口**：0 延迟，基于内存数据，响应极快
- **风险报告接口**：
  - 首次请求：需要调用天气 API，响应时间约 1-3 秒
  - 缓存命中：响应时间 < 100ms
  - 缓存失效：30 分钟后自动刷新

### 3. 风险算法说明

风险等级由以下因素综合计算：

1. **海拔高度**（主要因素）
   - `extreme` (> 4500m) → HIGH
   - `high` (3500-4500m) → MEDIUM
   - `medium` (2500-3500m) → LOW

2. **温度影响**（加成因素）
   - 温度 < 0°C → 升级为 CRITICAL
   - 温度 < 10°C → 添加"寒冷"标签，可能升级风险

3. **风力影响**（加成因素）
   - 风速 > 20 km/h → 添加"大风"标签，可能升级风险

4. **特殊说明**（重要因素）
   - 包含"开车直达" → 升级为 HIGH（身体缺乏适应时间）

### 4. 错误处理

- 如果天气 API 调用失败，系统会使用默认值（温度 10°C，风速 0 km/h），不会导致接口报错
- 地区不存在时返回 404 错误
- 建议前端实现错误处理和用户提示

### 5. 缓存机制

- 风险报告使用 Redis 缓存，缓存时间 30 分钟
- 如果 Redis 不可用，系统会正常工作，但每次请求都会调用天气 API
- `fromCache` 字段可以用于调试和性能监控

### 6. 使用建议

- **搜索阶段**：用户在输入框输入时，实时调用搜索接口（建议防抖处理）
- **详情阶段**：用户点击某个地区时，调用风险报告接口
- **UI 展示**：根据 `riskAssessment.colorCode` 显示不同颜色的风险提示
- **标签展示**：使用 `tags` 数组显示风险标签，帮助用户快速了解风险因素

---

## 典型使用场景

### 场景 1: 行程规划时检查高海拔风险

```typescript
// 在行程生成或编辑时，检查目的地是否有高海拔风险
const destination = "拉萨";
const regions = await searchAltitudeRegions(destination);

if (regions.length > 0) {
  const riskReport = await getRiskReport(regions[0].id);
  
  // 在行程中显示高海拔警告
  if (riskReport.riskAssessment.level === 'HIGH' || 
      riskReport.riskAssessment.level === 'CRITICAL') {
    showAltitudeWarning(riskReport);
  }
}
```

### 场景 2: 实时天气监控

```typescript
// 定期刷新风险报告，获取最新天气信息
setInterval(async () => {
  const riskReport = await getRiskReport(regionId);
  
  // 如果风险等级变化，通知用户
  if (riskReport.riskAssessment.level !== previousLevel) {
    notifyUser('风险等级已更新', riskReport);
  }
}, 30 * 60 * 1000); // 每 30 分钟检查一次
```

---

## 技术支持

如有问题，请参考：
- Swagger 文档: `http://localhost:3000/api/docs`（搜索 "Travel Advisor - Altitude"）
- 数据源文件: `src/modules/altitude/data/high-altitude.data.ts`
- 服务实现: `src/modules/altitude/altitude.service.ts`

