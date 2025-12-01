# 文化红黑榜 API 文档

## 接口概述

文化红黑榜功能为旅行者提供目的地的文化指南，包括推荐做法、禁忌行为和实用建议。内容由 AI 生成，并使用 Redis 缓存 30 天以提升性能。

---

## 获取目的地文化红黑榜

### 基本信息

- **接口路径**: `GET /v1/journeys/:journeyId/cultural-guide`
- **请求方法**: `GET`
- **认证方式**: Bearer Token (JWT)
- **权限要求**: 必须是行程的所有者

### 路径参数

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| journeyId | string | 是 | 行程ID | `"550e8400-e29b-41d4-a716-446655440000"` |

### 请求头

```
Authorization: Bearer {your_jwt_token}
Content-Type: application/json
```

### 响应格式

#### 成功响应 (200 OK)

```json
{
  "success": true,
  "destination": "冰岛",
  "content": "# 冰岛文化红黑榜\n\n## ✅ 推荐做法（红榜）\n\n### 文化礼仪\n- **小费文化**：冰岛没有强制小费文化，但如果你对服务满意，可以给 10-15% 的小费。\n- **问候方式**：冰岛人比较直接，握手即可，不需要过度热情。\n\n### 用餐礼仪\n- **用餐时间**：晚餐通常在 18:00-20:00 之间，建议提前预订餐厅。\n- **着装要求**：大部分餐厅对着装没有严格要求，但高级餐厅建议商务休闲。\n\n## ❌ 禁忌行为（黑榜）\n\n### 文化禁忌\n- **不要**在温泉中穿泳衣进入（需要裸体或穿泳裤）。\n- **不要**在公共场所大声喧哗，冰岛人喜欢安静。\n- **不要**在自然环境中留下任何垃圾，冰岛非常重视环境保护。\n\n### 拍照限制\n- **禁止**在教堂内使用闪光灯拍照。\n- **尊重隐私**：不要随意拍摄当地人的照片，特别是儿童。\n\n## 💡 实用建议\n\n### 小费文化\n冰岛没有强制小费，但如果你对服务满意，可以给 10-15% 的小费。\n\n### 着装要求\n- 冬季：必须穿防寒服、防水鞋\n- 夏季：轻便衣物，但建议带一件外套\n\n### 时间观念\n冰岛人非常守时，建议提前 5-10 分钟到达约定地点。\n\n### 沟通方式\n- 冰岛人英语很好，可以直接用英语交流\n- 保持礼貌和尊重\n\n### 紧急联系方式\n- 紧急电话：112\n- 中国驻冰岛大使馆：+354 552 6758",
  "fromCache": false,
  "generatedAt": "2025-12-01T13:00:00.000Z"
}
```

#### 响应字段说明

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| success | boolean | 请求是否成功 | `true` |
| destination | string | 目的地名称 | `"冰岛"` |
| content | string | 文化红黑榜内容（Markdown格式） | `"# 冰岛文化红黑榜\n\n..."` |
| fromCache | boolean | 是否来自缓存 | `false` 或 `true` |
| generatedAt | string | 生成时间（ISO 8601格式） | `"2025-12-01T13:00:00.000Z"` |

### 错误响应

#### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**原因**: 未提供有效的 JWT Token 或 Token 已过期

#### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "行程不存在: {journeyId}"
}
```

或

```json
{
  "statusCode": 404,
  "message": "无权访问此行程"
}
```

**原因**: 
- 行程不存在
- 用户不是该行程的所有者

#### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "AI服务调用失败: {error_message}"
}
```

**原因**: AI 服务调用失败（网络错误、超时等）

### 请求示例

#### cURL

```bash
curl -X GET \
  'https://api.example.com/v1/journeys/550e8400-e29b-41d4-a716-446655440000/cultural-guide' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json'
```

#### JavaScript (Fetch)

```javascript
const response = await fetch(
  'https://api.example.com/v1/journeys/550e8400-e29b-41d4-a716-446655440000/cultural-guide',
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  }
);

const data = await response.json();
console.log(data);
```

#### TypeScript (Axios)

```typescript
import axios from 'axios';

const response = await axios.get<CulturalGuideResponseDto>(
  `/v1/journeys/${journeyId}/cultural-guide`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

console.log(response.data);
```

### 内容格式说明

返回的 `content` 字段是 Markdown 格式的文本，包含以下结构：

1. **✅ 推荐做法（红榜）**
   - 文化礼仪和最佳实践
   - 推荐的社交行为
   - 值得体验的文化活动
   - 推荐的用餐礼仪
   - 购物和讨价还价建议

2. **❌ 禁忌行为（黑榜）**
   - 文化禁忌和不当行为
   - 需要避免的社交错误
   - 宗教和习俗注意事项
   - 拍照和摄影限制
   - 其他重要禁忌

3. **💡 实用建议**
   - 小费文化
   - 着装要求
   - 时间观念
   - 沟通方式
   - 紧急联系方式

### 缓存机制

- **缓存键**: `cultural-guide:{destination}` (小写)
- **缓存时间**: 30 天
- **缓存策略**: 
  - 首次请求：调用 AI 生成内容，存入 Redis
  - 后续请求：直接从 Redis 读取，`fromCache: true`
  - Redis 不可用时：自动回退，不影响功能

### 性能优化

- **首次生成**: 约 5-10 秒（取决于 AI 响应时间）
- **缓存命中**: < 100ms（从 Redis 读取）
- **性能提升**: 缓存命中时性能提升 50-100 倍

### 注意事项

1. **权限要求**: 只有行程的所有者才能访问该行程的文化红黑榜
2. **缓存策略**: 相同目的地的所有行程共享同一个缓存（基于目的地名称）
3. **内容个性化**: 内容基于完整行程数据生成，包含行程中的活动信息
4. **格式**: 返回的内容是 Markdown 格式，前端需要支持 Markdown 渲染

### 业务逻辑

1. 验证行程是否存在
2. 检查用户权限（必须是行程所有者）
3. 从 Redis 缓存读取（如果存在）
4. 如果缓存未命中，调用 AI 生成内容
5. 将生成的内容存入 Redis（30天）
6. 返回结果

### 相关接口

- `GET /v1/journeys/:journeyId` - 获取行程详情
- `GET /v1/journeys/:journeyId/safety-notice` - 获取安全提示
- `POST /v1/journeys/:journeyId/assistant/chat` - 与旅行助手对话

---

## 更新日志

- **2025-12-01**: 初始版本发布
  - 支持获取目的地文化红黑榜
  - 实现 Redis 缓存机制
  - 支持权限验证

