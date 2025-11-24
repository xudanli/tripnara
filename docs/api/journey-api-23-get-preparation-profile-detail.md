# 行程接口文档 - 23. 获取准备任务模板详情

## 接口信息

**接口路径：** `GET /api/v1/journeys/preparation-profiles/{id}`

**接口描述：** 根据ID获取准备任务模板的详细信息

**认证：** 需要 JWT Token（Bearer Token）

---

## 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `id` | string | 是 | 模板ID（UUID） |

---

## 请求示例

### cURL

```bash
curl -X GET "http://localhost:3000/api/v1/journeys/preparation-profiles/profile-id-1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 响应数据

### 成功响应（200 OK）

```json
{
  "id": "profile-id-1",
  "code": "iceland-general",
  "title": "冰岛通用准备任务",
  "tasks": [
    {
      "title": "确认护照有效期及前往冰岛是否需要签证/入境许可",
      "completed": false,
      "category": "preparation",
      "destination": "冰岛",
      "links": [
        {
          "label": "IATA 入境政策查询",
          "url": "https://www.iatatravelcentre.com/"
        }
      ]
    },
    {
      "title": "预订往返冰岛的核心交通（机票/火车），并关注托运行李政策",
      "completed": false,
      "category": "preparation",
      "destination": "冰岛",
      "links": [
        {
          "label": "OAG 行李政策汇总",
          "url": "https://www.oag.com/baggage-allowance"
        }
      ]
    }
  ],
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T10:00:00.000Z"
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 模板ID |
| `code` | string | 模板代码（唯一标识） |
| `title` | string | 模板标题 |
| `tasks` | array | 任务列表 |
| `tasks[].title` | string | 任务标题 |
| `tasks[].completed` | boolean | 是否完成（模板中通常为 false） |
| `tasks[].category` | string | 任务类别 |
| `tasks[].destination` | string | 目的地 |
| `tasks[].links` | array | 相关链接列表 |
| `tasks[].links[].label` | string | 链接标签 |
| `tasks[].links[].url` | string | 链接URL |
| `createdAt` | string | 创建时间（ISO 8601格式） |
| `updatedAt` | string | 更新时间（ISO 8601格式） |

---

## 错误响应

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "准备任务模板不存在: profile-id-1",
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

---

## 使用示例

### JavaScript/TypeScript

```typescript
const profileId = 'profile-id-1';

const response = await fetch(`/api/v1/journeys/preparation-profiles/${profileId}`, {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const profile = await response.json();
console.log('模板详情:', profile);
console.log('任务数量:', profile.tasks.length);

// 遍历任务
profile.tasks.forEach((task) => {
  console.log(`- ${task.title}`);
});
```

---

## 注意事项

1. **权限**：需要登录认证，但当前未实现管理员权限验证

2. **任务数据**：返回的任务列表是模板的完整任务数据，可用于同步到行程

3. **用途**：获取模板详情后，可以使用 `POST /api/v1/journeys/:journeyId/tasks/sync` 接口将模板任务同步到行程

