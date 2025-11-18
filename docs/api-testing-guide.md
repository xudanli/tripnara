# API 接口测试指南

## 快速开始

### 1. 运行单元测试（无需服务器）

```bash
# 测试所有新接口的单元测试
npm test -- --testPathPatterns="itinerary|location|travel-summary"

# 测试特定模块
npm test -- itinerary.service.spec.ts
npm test -- location.service.spec.ts
npm test -- travel-summary.service.spec.ts
```

**结果**: ✅ 21 个测试全部通过

### 2. 运行 API 端点测试（需要服务器运行）

#### 步骤 1: 启动服务器

```bash
# 开发模式（带热重载）
npm run start:dev

# 或生产模式
npm run start
```

服务器将在 `http://localhost:3000` 启动

#### 步骤 2: 获取认证 Token

这些接口需要 JWT 认证。您需要：

1. **登录获取 token**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "user@example.com", "password": "password"}'
   ```

2. **设置环境变量**:
   ```bash
   export API_TOKEN="your-jwt-token-here"
   ```

#### 步骤 3: 运行 API 测试

```bash
# 使用默认配置 (http://localhost:3000)
npm run test:api

# 或指定服务器地址
API_BASE_URL="http://localhost:3000" API_TOKEN="your-token" npm run test:api
```

## 测试的接口

### 1. POST /api/itinerary/generate
**功能**: 生成旅行行程

**请求示例**:
```bash
curl -X POST http://localhost:3000/api/itinerary/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "destination": "瑞士琉森",
    "days": 5,
    "preferences": {
      "interests": ["自然风光", "户外活动"],
      "budget": "medium",
      "travelStyle": "relaxed"
    },
    "startDate": "2024-06-01"
  }'
```

**预期响应**:
```json
{
  "success": true,
  "data": {
    "days": [...],
    "totalCost": 8000,
    "summary": "行程摘要"
  },
  "generatedAt": "2024-01-01T00:00:00Z"
}
```

### 2. POST /api/location/generate
**功能**: 生成单个活动的位置信息

**请求示例**:
```bash
curl -X POST http://localhost:3000/api/location/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "activityName": "铁力士峰云端漫步",
    "destination": "瑞士琉森",
    "activityType": "attraction",
    "coordinates": {
      "lat": 46.7704,
      "lng": 8.4050,
      "region": "市中心区域"
    }
  }'
```

**预期响应**:
```json
{
  "success": true,
  "data": {
    "chineseName": "铁力士峰云端漫步",
    "localName": "Titlis Cliff Walk",
    "transportInfo": "...",
    "openingHours": "...",
    "ticketPrice": "...",
    ...
  }
}
```

### 3. POST /api/location/generate-batch
**功能**: 批量生成活动位置信息

**请求示例**:
```bash
curl -X POST http://localhost:3000/api/location/generate-batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "activities": [
      {
        "activityName": "活动1",
        "destination": "瑞士",
        "activityType": "attraction",
        "coordinates": {"lat": 46.7704, "lng": 8.4050}
      }
    ]
  }'
```

### 4. POST /api/travel/summary
**功能**: 生成旅行摘要

**请求示例**:
```bash
curl -X POST http://localhost:3000/api/travel/summary \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "destination": "瑞士琉森",
    "itinerary": {
      "days": [
        {
          "day": 1,
          "date": "2024-06-01",
          "activities": [
            {
              "time": "09:00",
              "title": "铁力士峰云端漫步",
              "type": "attraction",
              "notes": "详细的游览建议"
            }
          ]
        }
      ]
    }
  }'
```

**预期响应**:
```json
{
  "success": true,
  "data": {
    "summary": "5天琉森文化探索之旅...",
    "generatedAt": "2024-01-01T00:00:00Z"
  }
}
```

## 使用 Swagger UI 测试

1. 启动服务器后，访问: `http://localhost:3000/api/docs`
2. 在 Swagger UI 中：
   - 点击 "Authorize" 按钮
   - 输入 JWT token
   - 选择要测试的接口
   - 点击 "Try it out"
   - 输入请求参数
   - 点击 "Execute"

## 测试结果示例

### 成功输出

```
🧪 开始测试 API 端点...

📍 服务器地址: http://localhost:3000
🔑 Token: 已设置

📝 测试 1: POST /api/itinerary/generate
   ✅ 成功 (200, 1234ms)

📍 测试 2: POST /api/location/generate
   ✅ 成功 (200, 567ms)

📍 测试 3: POST /api/location/generate-batch
   ✅ 成功 (200, 890ms)

📄 测试 4: POST /api/travel/summary
   ✅ 成功 (200, 345ms)

📊 测试总结
==================================================
✅ 行程生成 [200] (1234ms)
✅ 位置信息生成 [200] (567ms)
✅ 批量位置信息生成 [200] (890ms)
✅ 旅行摘要生成 [200] (345ms)
==================================================
总计: 4 个测试 | ✅ 成功: 4 | ❌ 失败: 0 | ⏱️  总耗时: 3036ms

🎉 所有测试通过！
```

### 失败输出

```
❌ 失败: Request failed with status code 401

⚠️  部分测试失败，请检查：
   1. 服务器是否正在运行 (npm run start:dev)
   2. API token 是否正确设置
   3. 数据库连接是否正常
   4. 相关服务（如 LLM API）是否可用
```

## 常见问题

### 1. 401 Unauthorized

**原因**: 缺少或无效的 JWT token

**解决**:
```bash
# 确保设置了正确的 token
export API_TOKEN="your-valid-token"

# 或直接在命令中指定
API_TOKEN="your-token" npm run test:api
```

### 2. ECONNREFUSED

**原因**: 服务器未运行

**解决**:
```bash
# 启动服务器
npm run start:dev
```

### 3. 超时错误

**原因**: AI 服务响应慢或不可用

**解决**:
- 检查 LLM API 配置（DEEPSEEK_API_KEY）
- 增加超时时间（修改脚本中的 timeout 值）

### 4. 数据库连接错误

**原因**: DATABASE_URL 配置错误

**解决**:
```bash
# 测试数据库连接
npm run db:test

# 修复配置
# 参考 docs/database-connection-test.md
```

## 性能测试

### 测试单个接口性能

```bash
# 使用 time 命令
time curl -X POST http://localhost:3000/api/itinerary/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{...}'
```

### 批量测试

```bash
# 运行多次测试
for i in {1..10}; do
  echo "测试 $i:"
  npm run test:api
done
```

## 相关文档

- [数据库连接测试](./database-connection-test.md)
- [测试总结](../TEST_SUMMARY.md)
- [API 文档](http://localhost:3000/api/docs)

