# 更新安全提示

## 接口信息

- **URL**: `PUT /api/v1/alerts/:id` 或 `PATCH /api/v1/alerts/:id`
- **方法**: `PUT` 或 `PATCH`
- **认证**: 不需要（公开接口）
- **Content-Type**: `application/json`

## 接口描述

更新指定的安全提示。这是一个公开接口，无需认证。所有字段都是可选的，只更新提供的字段（部分更新）。

## 请求参数

### 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `id` | string | 是 | 安全提示 ID |

### 请求体

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `title` | string | 否 | 通知标题（最大长度 255） |
| `content` | string | 否 | 通知内容 |
| `destination` | string | 否 | 目的地（最大长度 255） |
| `countryCode` | string | 否 | 国家代码（ISO 3166-1 alpha-3，最大长度 3） |
| `severity` | string | 否 | 严重程度：`low`、`medium`、`high`、`critical` |
| `status` | string | 否 | 状态：`active`、`expired`、`archived` |
| `startDate` | string | 否 | 生效开始日期（ISO 8601格式） |
| `endDate` | string \| null | 否 | 生效结束日期（ISO 8601格式），null 表示长期有效 |
| `metadata` | object | 否 | 元数据（用于存储额外信息） |

**注意：** 所有字段都是可选的，只更新提供的字段（部分更新）。

## 请求示例

### 完整更新示例

```bash
curl -X PUT "http://localhost:3000/api/v1/alerts/alert-id-123" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "冰岛火山活动预警（已更新）",
    "content": "近期冰岛火山活动频繁，请游客注意安全，避免前往危险区域。建议关注官方通知。",
    "destination": "冰岛",
    "countryCode": "ISL",
    "severity": "critical",
    "status": "active",
    "startDate": "2025-01-15T00:00:00.000Z",
    "endDate": "2025-03-15T00:00:00.000Z",
    "metadata": {
      "source": "government",
      "region": "south",
      "updatedBy": "admin"
    }
  }'
```

### 部分更新示例

```bash
curl -X PATCH "http://localhost:3000/api/v1/alerts/alert-id-123" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "冰岛火山活动预警（已更新）",
    "severity": "critical",
    "status": "active"
  }'
```

## 响应数据

### 成功响应（200 OK）

```json
{
  "success": true,
  "data": {
    "id": "alert-id-123",
    "title": "冰岛火山活动预警（已更新）",
    "content": "近期冰岛火山活动频繁，请游客注意安全，避免前往危险区域。建议关注官方通知。",
    "destination": "冰岛",
    "countryCode": "ISL",
    "severity": "critical",
    "status": "active",
    "startDate": "2025-01-15T00:00:00.000Z",
    "endDate": "2025-03-15T00:00:00.000Z",
    "metadata": {
      "source": "government",
      "region": "south",
      "updatedBy": "admin"
    },
    "createdAt": "2025-01-15T12:00:00.000Z",
    "updatedAt": "2025-01-15T15:30:00.000Z"
  },
  "message": "更新成功"
}
```

### 错误响应（400 Bad Request）

```json
{
  "statusCode": 400,
  "message": [
    "severity must be one of the following values: low, medium, high, critical",
    "结束日期不能早于开始日期"
  ],
  "error": "Bad Request"
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
| `data` | object | 更新后的安全提示数据 |
| `data.id` | string | 安全提示 ID |
| `data.title` | string | 通知标题 |
| `data.content` | string | 通知内容 |
| `data.destination` | string | 目的地 |
| `data.countryCode` | string | 国家代码 |
| `data.severity` | string | 严重程度 |
| `data.status` | string | 状态 |
| `data.startDate` | string | 生效开始日期 |
| `data.endDate` | string \| null | 生效结束日期 |
| `data.metadata` | object \| null | 元数据 |
| `data.createdAt` | string | 创建时间 |
| `data.updatedAt` | string | 更新时间 |
| `message` | string | 响应消息 |

## 验证规则

1. **日期验证**：
   - `startDate` 和 `endDate` 必须是有效的 ISO 8601 格式日期
   - `endDate` 不能早于 `startDate`
   - 如果不提供 `endDate` 或设置为 `null`，通知将长期有效

2. **严重程度枚举值**：
   - `low`：低风险，一般提醒
   - `medium`：中等风险，需要注意
   - `high`：高风险，建议谨慎
   - `critical`：严重风险，强烈建议避免

3. **状态枚举值**：
   - `active`：活跃状态，会显示在查询结果中
   - `expired`：已过期，不会显示在默认查询中
   - `archived`：已归档，不会显示在默认查询中

4. **字段长度限制**：
   - `title`：最大长度 255 字符
   - `destination`：最大长度 255 字符
   - `countryCode`：最大长度 3 字符

## 注意事项

1. 这是一个公开接口，不需要认证
2. 如果指定的 ID 不存在，将返回 404 错误
3. 所有字段都是可选的，只更新提供的字段
4. `PUT` 和 `PATCH` 方法功能相同，都支持部分更新
5. 日期验证会在服务端进行，确保数据的有效性

