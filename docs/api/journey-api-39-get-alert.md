# 获取单个安全提示详情

## 接口信息

- **URL**: `GET /api/v1/alerts/:id`
- **方法**: `GET`
- **认证**: 不需要（公开接口）
- **Content-Type**: `application/json`

## 接口描述

根据 ID 获取单个安全提示的详细信息。这是一个公开接口，无需认证。

## 请求参数

### 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `id` | string | 是 | 安全提示 ID |

## 请求示例

```bash
curl -X GET "http://localhost:3000/api/v1/alerts/alert-id-123" \
  -H "Content-Type: application/json"
```

## 响应数据

### 成功响应（200 OK）

```json
{
  "success": true,
  "data": {
    "id": "alert-id-123",
    "title": "冰岛火山活动预警",
    "content": "近期冰岛火山活动频繁，请游客注意安全，避免前往危险区域。",
    "destination": "冰岛",
    "countryCode": "ISL",
    "severity": "high",
    "status": "active",
    "startDate": "2025-01-15T00:00:00.000Z",
    "endDate": "2025-02-15T00:00:00.000Z",
    "metadata": null,
    "createdAt": "2025-01-15T12:00:00.000Z",
    "updatedAt": "2025-01-15T12:00:00.000Z"
  },
  "message": "获取成功"
}
```

### 错误响应（404 Not Found）

```json
{
  "statusCode": 404,
  "message": "安全提示不存在",
  "error": "Not Found"
}
```

## 响应字段说明

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `success` | boolean | 是否成功 |
| `data` | object | 安全提示数据 |
| `data.id` | string | 安全提示 ID |
| `data.title` | string | 通知标题 |
| `data.content` | string | 通知内容 |
| `data.destination` | string | 目的地 |
| `data.countryCode` | string | 国家代码（ISO 3166-1 alpha-3） |
| `data.severity` | string | 严重程度：`low`、`medium`、`high`、`critical` |
| `data.status` | string | 状态：`active`、`expired`、`archived` |
| `data.startDate` | string | 生效开始日期（ISO 8601格式） |
| `data.endDate` | string \| null | 生效结束日期（ISO 8601格式），null 表示长期有效 |
| `data.metadata` | object \| null | 元数据（用于存储额外信息） |
| `data.createdAt` | string | 创建时间（ISO 8601格式） |
| `data.updatedAt` | string | 更新时间（ISO 8601格式） |
| `message` | string | 响应消息 |

## 注意事项

1. 这是一个公开接口，不需要认证
2. 如果指定的 ID 不存在，将返回 404 错误
3. 所有日期字段都使用 ISO 8601 格式

