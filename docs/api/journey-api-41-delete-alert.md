# 删除安全提示

## 接口信息

- **URL**: `DELETE /api/v1/alerts/:id`
- **方法**: `DELETE`
- **认证**: 不需要（公开接口）
- **Content-Type**: `application/json`

## 接口描述

删除指定的安全提示。这是一个公开接口，无需认证。

## 请求参数

### 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `id` | string | 是 | 安全提示 ID |

## 请求示例

```bash
curl -X DELETE "http://localhost:3000/api/v1/alerts/alert-id-123" \
  -H "Content-Type: application/json"
```

## 响应数据

### 成功响应（200 OK）

```json
{
  "success": true,
  "message": "删除成功"
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
| `message` | string | 响应消息 |

## 注意事项

1. 这是一个公开接口，不需要认证
2. 如果指定的 ID 不存在，将返回 404 错误
3. 删除操作是不可逆的，请谨慎操作
4. 删除成功后，该安全提示将从数据库中永久删除

## 建议

虽然当前接口是公开的，但建议：
- 未来可能需要添加管理员权限验证（仅限删除操作）
- 可以考虑添加软删除功能，保留历史记录

