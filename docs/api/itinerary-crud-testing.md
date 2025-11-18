# 行程增删改查接口测试指南

## 快速开始

### 1. 启动服务器

```bash
npm run start:dev
```

服务器将在 `http://localhost:3000` 启动

### 2. 获取认证 Token

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

### 3. 运行测试

```bash
# 使用 npm 脚本
npm run test:itinerary-crud

# 或直接运行
npx ts-node scripts/test-itinerary-crud.ts

# 或指定服务器地址和 token
API_BASE_URL="http://localhost:3000" API_TOKEN="your-token" npm run test:itinerary-crud
```

## 测试的接口

### 1. POST /api/itinerary - 创建行程

**功能**: 创建并保存行程到数据库

**请求示例**:
```bash
curl -X POST http://localhost:3000/api/itinerary \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "destination": "瑞士琉森",
    "startDate": "2024-06-01",
    "days": 3,
    "data": {
      "days": [
        {
          "day": 1,
          "date": "2024-06-01",
          "activities": [
            {
              "time": "09:00",
              "title": "铁力士峰云端漫步",
              "type": "attraction",
              "duration": 120,
              "location": {"lat": 46.7704, "lng": 8.4050},
              "notes": "详细的游览建议",
              "cost": 400
            }
          ]
        }
      ],
      "totalCost": 700,
      "summary": "3天琉森文化探索之旅"
    },
    "preferences": {
      "interests": ["自然风光", "户外活动"],
      "budget": "medium",
      "travelStyle": "relaxed"
    },
    "status": "draft"
  }'
```

**预期响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "destination": "瑞士琉森",
    "startDate": "2024-06-01",
    "daysCount": 3,
    "summary": "3天琉森文化探索之旅",
    "totalCost": 700,
    "status": "draft",
    "days": [...],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### 2. GET /api/itinerary - 获取行程列表

**功能**: 获取当前用户的行程列表，支持分页和状态筛选

**请求示例**:
```bash
# 获取所有行程
curl -X GET "http://localhost:3000/api/itinerary?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 按状态筛选
curl -X GET "http://localhost:3000/api/itinerary?status=draft&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**查询参数**:
- `status` (可选): 筛选状态 (`draft` | `published` | `archived`)
- `page` (可选): 页码，默认 1
- `limit` (可选): 每页数量，默认 10

**预期响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "destination": "瑞士琉森",
      "startDate": "2024-06-01",
      "days": 3,
      "summary": "3天琉森文化探索之旅",
      "totalCost": 700,
      "status": "draft",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 10
}
```

### 3. GET /api/itinerary/:id - 获取行程详情

**功能**: 获取指定行程的完整详情

**请求示例**:
```bash
curl -X GET "http://localhost:3000/api/itinerary/{itinerary-id}" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**预期响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "destination": "瑞士琉森",
    "startDate": "2024-06-01",
    "daysCount": 3,
    "summary": "3天琉森文化探索之旅",
    "totalCost": 700,
    "status": "draft",
    "preferences": {...},
    "days": [
      {
        "day": 1,
        "date": "2024-06-01",
        "activities": [...]
      }
    ],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### 4. PATCH /api/itinerary/:id - 更新行程

**功能**: 更新行程的部分字段

**请求示例**:
```bash
curl -X PATCH "http://localhost:3000/api/itinerary/{itinerary-id}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "summary": "更新后的行程摘要",
    "totalCost": 800,
    "status": "published"
  }'
```

**可更新字段**:
- `destination`: 目的地
- `startDate`: 开始日期
- `days`: 天数
- `summary`: 摘要
- `totalCost`: 总费用
- `preferences`: 用户偏好
- `status`: 状态 (`draft` | `published` | `archived`)

**预期响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "summary": "更新后的行程摘要",
    "totalCost": 800,
    "status": "published",
    ...
  }
}
```

### 5. DELETE /api/itinerary/:id - 删除行程

**功能**: 删除指定的行程

**请求示例**:
```bash
curl -X DELETE "http://localhost:3000/api/itinerary/{itinerary-id}" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**预期响应**:
```json
{
  "success": true,
  "message": "行程已删除"
}
```

## 测试结果示例

### 成功输出

```
🧪 开始测试行程增删改查接口...

📍 服务器地址: http://localhost:3000
🔑 Token: 已设置

📝 测试 1: POST /api/itinerary - 创建行程
   ✅ 成功 (201, 234ms)
   📌 创建的行程ID: abc123-def456-...

📋 测试 2: GET /api/itinerary - 获取行程列表
   ✅ 成功 (200, 45ms)
   📊 返回 1 条记录，总计 1 条

🔍 测试 3: GET /api/itinerary/abc123... - 获取行程详情
   ✅ 成功 (200, 38ms)
   📍 目的地: 瑞士琉森
   📅 开始日期: 2024-06-01
   📆 天数: 3
   💰 总费用: 700

✏️  测试 4: PATCH /api/itinerary/abc123... - 更新行程
   ✅ 成功 (200, 42ms)
   📝 更新后的摘要: 更新后的行程摘要
   💰 更新后的费用: 800
   📌 更新后的状态: published

🗑️  测试 5: DELETE /api/itinerary/abc123... - 删除行程
   ✅ 成功 (200, 35ms)
   💬 消息: 行程已删除

🔍 测试 6: GET /api/itinerary/abc123... - 验证删除后无法获取
   ✅ 成功 (404, 28ms) - 行程已正确删除

📊 测试总结
==================================================
✅ 创建行程 [201] (234ms)
✅ 获取行程列表 [200] (45ms)
✅ 获取行程详情 [200] (38ms)
✅ 更新行程 [200] (42ms)
✅ 删除行程 [200] (35ms)
✅ 验证删除 [404] (28ms)
==================================================
总计: 6 个测试 | ✅ 成功: 6 | ❌ 失败: 0 | ⏱️  总耗时: 422ms

🎉 所有测试通过！
```

## 常见问题

### 1. 401 Unauthorized

**原因**: 缺少或无效的 JWT token

**解决**:
```bash
# 确保设置了正确的 token
export API_TOKEN="your-valid-token"

# 或直接在命令中指定
API_TOKEN="your-token" npm run test:itinerary-crud
```

### 2. 403 Forbidden

**原因**: 尝试访问或修改其他用户的行程

**解决**: 确保使用正确的用户 token，只能访问自己的行程

### 3. 404 Not Found

**原因**: 行程不存在或已被删除

**解决**: 检查行程 ID 是否正确

### 4. 数据库连接错误

**原因**: DATABASE_URL 配置错误或数据库未运行

**解决**:
```bash
# 测试数据库连接
npm run db:test

# 检查数据库配置
echo $DATABASE_URL
```

### 5. 实体未找到错误

**原因**: 数据库表未创建

**解决**: 运行数据库迁移或同步
```bash
# 如果使用 synchronize: true，重启服务器即可
# 如果需要迁移，运行迁移脚本
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

## 工作流程示例

### 完整流程：生成 → 保存 → 查看 → 更新 → 删除

```bash
# 1. 生成行程（AI）
curl -X POST http://localhost:3000/api/itinerary/generate \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"destination": "瑞士琉森", "days": 5, "startDate": "2024-06-01"}'

# 2. 保存生成的行程
curl -X POST http://localhost:3000/api/itinerary \
  -H "Authorization: Bearer $TOKEN" \
  -d '{...生成的行程数据...}'

# 3. 查看所有行程
curl -X GET "http://localhost:3000/api/itinerary" \
  -H "Authorization: Bearer $TOKEN"

# 4. 查看特定行程
curl -X GET "http://localhost:3000/api/itinerary/{id}" \
  -H "Authorization: Bearer $TOKEN"

# 5. 更新行程
curl -X PATCH "http://localhost:3000/api/itinerary/{id}" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status": "published"}'

# 6. 删除行程
curl -X DELETE "http://localhost:3000/api/itinerary/{id}" \
  -H "Authorization: Bearer $TOKEN"
```

