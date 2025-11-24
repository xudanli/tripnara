# 行程接口文档 - 22. 获取准备任务模板列表

## 接口信息

**接口路径：** `GET /api/v1/journeys/preparation-profiles`

**接口描述：** 获取所有准备任务模板列表（后台维护）

**认证：** 需要 JWT Token（Bearer Token）

---

## 请求示例

### cURL

```bash
curl -X GET "http://localhost:3000/api/v1/journeys/preparation-profiles" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 响应数据

### 成功响应（200 OK）

```json
{
  "data": [
    {
      "id": "profile-id-1",
      "code": "iceland-general",
      "title": "冰岛通用准备任务",
      "taskCount": 5,
      "createdAt": "2025-01-15T10:00:00.000Z",
      "updatedAt": "2025-01-15T10:00:00.000Z"
    },
    {
      "id": "profile-id-2",
      "code": "europe-general",
      "title": "欧洲通用准备任务",
      "taskCount": 8,
      "createdAt": "2025-01-14T09:00:00.000Z",
      "updatedAt": "2025-01-14T09:00:00.000Z"
    }
  ],
  "total": 2
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `data` | array | 模板列表 |
| `data[].id` | string | 模板ID |
| `data[].code` | string | 模板代码（唯一标识） |
| `data[].title` | string | 模板标题 |
| `data[].taskCount` | number | 任务数量 |
| `data[].createdAt` | string | 创建时间（ISO 8601格式） |
| `data[].updatedAt` | string | 更新时间（ISO 8601格式） |
| `total` | number | 总数量 |

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

---

## 使用示例

### JavaScript/TypeScript

```typescript
const response = await fetch('/api/v1/journeys/preparation-profiles', {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const result = await response.json();
console.log('模板列表:', result.data);
console.log('总数量:', result.total);

// 遍历模板
result.data.forEach((profile) => {
  console.log(`${profile.code}: ${profile.title} (${profile.taskCount} 个任务)`);
});
```

---

## 注意事项

1. **权限**：需要登录认证，但当前未实现管理员权限验证（未来可能需要）

2. **排序**：模板列表按创建时间倒序排列（最新的在前）

3. **用途**：这些模板可用于在同步任务时作为参考或直接应用

4. **模板代码**：`code` 字段是唯一标识，用于区分不同的模板

