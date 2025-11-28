# 货币和国家代码管理 API

## 概述

本文档描述了货币符号和国家代码的后台管理接口。这些接口用于管理货币信息和国家代码与货币的映射关系。

**基础路径**: `/api/v1/admin/currency`

**认证**: 建议添加管理员权限验证（当前为公开接口）

---

## 一、货币管理

### 1. 创建货币

**接口路径**: `POST /api/v1/admin/currency/currencies`

**接口描述**: 创建新的货币信息

**请求体**:

```json
{
  "code": "CNY",
  "symbol": "¥",
  "nameZh": "人民币",
  "nameEn": "CNY",
  "isActive": true,
  "metadata": {}
}
```

**字段说明**:

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `code` | string | 是 | 货币代码（ISO 4217），如 'CNY', 'USD' |
| `symbol` | string | 是 | 货币符号，如 '¥', '$' |
| `nameZh` | string | 是 | 中文名称 |
| `nameEn` | string | 是 | 英文名称 |
| `isActive` | boolean | 否 | 是否启用（默认：true） |
| `metadata` | object | 否 | 元数据 |

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "code": "CNY",
    "symbol": "¥",
    "nameZh": "人民币",
    "nameEn": "CNY",
    "isActive": true,
    "metadata": null,
    "createdAt": "2025-01-29T00:00:00.000Z",
    "updatedAt": "2025-01-29T00:00:00.000Z"
  },
  "message": "创建成功"
}
```

---

### 2. 获取货币列表

**接口路径**: `GET /api/v1/admin/currency/currencies`

**接口描述**: 获取货币列表，支持分页和搜索

**查询参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `page` | number | 否 | 页码（默认：1） |
| `limit` | number | 否 | 每页数量（默认：20） |
| `search` | string | 否 | 搜索关键词（搜索货币代码、中文名称、英文名称） |
| `isActive` | boolean | 否 | 是否只显示启用的货币 |

**响应示例**:

```json
{
  "data": [
    {
      "id": "uuid",
      "code": "CNY",
      "symbol": "¥",
      "nameZh": "人民币",
      "nameEn": "CNY",
      "isActive": true,
      "metadata": null,
      "createdAt": "2025-01-29T00:00:00.000Z",
      "updatedAt": "2025-01-29T00:00:00.000Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

---

### 3. 获取货币详情

**接口路径**: `GET /api/v1/admin/currency/currencies/:id`

**接口描述**: 根据 ID 获取货币详细信息

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `id` | string | 是 | 货币ID |

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "code": "CNY",
    "symbol": "¥",
    "nameZh": "人民币",
    "nameEn": "CNY",
    "isActive": true,
    "metadata": null,
    "createdAt": "2025-01-29T00:00:00.000Z",
    "updatedAt": "2025-01-29T00:00:00.000Z"
  },
  "message": "获取成功"
}
```

---

### 4. 更新货币

**接口路径**: `PUT /api/v1/admin/currency/currencies/:id` 或 `PATCH /api/v1/admin/currency/currencies/:id`

**接口描述**: 更新货币信息（所有字段可选，支持部分更新）

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `id` | string | 是 | 货币ID |

**请求体**（所有字段可选）:

```json
{
  "code": "CNY",
  "symbol": "¥",
  "nameZh": "人民币",
  "nameEn": "CNY",
  "isActive": true,
  "metadata": {}
}
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "code": "CNY",
    "symbol": "¥",
    "nameZh": "人民币",
    "nameEn": "CNY",
    "isActive": true,
    "metadata": null,
    "createdAt": "2025-01-29T00:00:00.000Z",
    "updatedAt": "2025-01-29T01:00:00.000Z"
  },
  "message": "更新成功"
}
```

---

### 5. 删除货币

**接口路径**: `DELETE /api/v1/admin/currency/currencies/:id`

**接口描述**: 删除货币信息（如果存在国家映射则无法删除）

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `id` | string | 是 | 货币ID |

**响应示例**:

```json
{
  "success": true,
  "message": "删除成功"
}
```

**错误响应**（400 Bad Request）:

```json
{
  "statusCode": 400,
  "message": "无法删除货币：仍有 5 个国家映射使用此货币",
  "error": "Bad Request"
}
```

---

## 二、国家货币映射管理

### 0. 批量创建国家货币映射（推荐）

**接口路径**: `POST /api/v1/admin/currency/country-mappings/batch`

**接口描述**: 批量创建国家代码与货币的映射关系，支持一次导入多个映射。这是导入大量数据的高效方式。

**请求体**:

```json
{
  "mappings": [
    {
      "countryCode": "CN",
      "currencyId": "货币ID（UUID）",
      "countryNames": {
        "zh": ["中国", "中华人民共和国"],
        "en": ["China", "PRC"]
      },
      "isActive": true
    },
    {
      "countryCode": "US",
      "currencyId": "货币ID（UUID）",
      "countryNames": {
        "zh": ["美国"],
        "en": ["United States", "USA"]
      },
      "isActive": true
    },
    {
      "countryCode": "GB",
      "currencyId": "货币ID（UUID）",
      "countryNames": {
        "zh": ["英国"],
        "en": ["United Kingdom", "UK"]
      },
      "isActive": true
    }
  ]
}
```

**字段说明**:

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `mappings` | array | 是 | 映射列表（最多建议 100 条） |
| `mappings[].countryCode` | string | 是 | 国家代码（ISO 3166-1 alpha-2） |
| `mappings[].currencyId` | string | 是 | 货币ID（UUID） |
| `mappings[].countryNames` | object | 否 | 国家名称映射 |
| `mappings[].isActive` | boolean | 否 | 是否启用（默认：true） |
| `mappings[].metadata` | object | 否 | 元数据 |

**响应示例**:

```json
{
  "success": true,
  "data": {
    "created": 3,
    "skipped": 0,
    "failed": 0,
    "errors": [],
    "data": [
      {
        "id": "uuid",
        "countryCode": "CN",
        "currencyId": "uuid",
        "currencyCode": "CNY",
        "countryNames": {
          "zh": ["中国", "中华人民共和国"],
          "en": ["China", "PRC"]
        },
        "isActive": true,
        "createdAt": "2025-01-29T00:00:00.000Z",
        "updatedAt": "2025-01-29T00:00:00.000Z"
      }
    ]
  },
  "message": "批量导入完成: 成功 3 个, 跳过 0 个, 失败 0 个"
}
```

**响应字段说明**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `data.created` | number | 成功创建的数量 |
| `data.skipped` | number | 跳过的数量（已存在） |
| `data.failed` | number | 失败的数量 |
| `data.errors` | array | 失败详情列表 |
| `data.errors[].countryCode` | string | 失败的国家代码 |
| `data.errors[].error` | string | 错误信息 |
| `data.data` | array | 成功创建的映射列表 |

**注意事项**:
- 批量导入会自动跳过已存在的映射（基于国家代码）
- 如果货币ID不存在，该映射会失败，但不会影响其他映射
- 建议每次批量导入不超过 100 条，以提高性能
- 批量导入会自动刷新 CurrencyService 缓存

---

### 1. 创建国家货币映射

**接口路径**: `POST /api/v1/admin/currency/country-mappings`

**接口描述**: 创建国家代码与货币的映射关系

**请求体**:

```json
{
  "countryCode": "CN",
  "currencyId": "uuid",
  "countryNames": {
    "zh": ["中国", "中华人民共和国"],
    "en": ["China", "PRC"]
  },
  "isActive": true,
  "metadata": {}
}
```

**字段说明**:

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `countryCode` | string | 是 | 国家代码（ISO 3166-1 alpha-2），如 'CN', 'US' |
| `currencyId` | string | 是 | 货币ID（UUID） |
| `countryNames` | object | 否 | 国家名称映射（支持多个名称） |
| `countryNames.zh` | string[] | 否 | 中文名称数组 |
| `countryNames.en` | string[] | 否 | 英文名称数组 |
| `isActive` | boolean | 否 | 是否启用（默认：true） |
| `metadata` | object | 否 | 元数据 |

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "countryCode": "CN",
    "currencyId": "uuid",
    "currencyCode": "CNY",
    "countryNames": {
      "zh": ["中国", "中华人民共和国"],
      "en": ["China", "PRC"]
    },
    "isActive": true,
    "metadata": null,
    "createdAt": "2025-01-29T00:00:00.000Z",
    "updatedAt": "2025-01-29T00:00:00.000Z"
  },
  "message": "创建成功"
}
```

---

### 2. 获取国家货币映射列表

**接口路径**: `GET /api/v1/admin/currency/country-mappings`

**接口描述**: 获取国家货币映射列表，支持分页和搜索

**查询参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `page` | number | 否 | 页码（默认：1） |
| `limit` | number | 否 | 每页数量（默认：20） |
| `search` | string | 否 | 搜索关键词（搜索国家代码、货币代码） |
| `isActive` | boolean | 否 | 是否只显示启用的映射 |

**响应示例**:

```json
{
  "data": [
    {
      "id": "uuid",
      "countryCode": "CN",
      "currencyId": "uuid",
      "currencyCode": "CNY",
      "countryNames": {
        "zh": ["中国"],
        "en": ["China"]
      },
      "isActive": true,
      "metadata": null,
      "createdAt": "2025-01-29T00:00:00.000Z",
      "updatedAt": "2025-01-29T00:00:00.000Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

---

### 3. 获取国家货币映射详情

**接口路径**: `GET /api/v1/admin/currency/country-mappings/:id`

**接口描述**: 根据 ID 获取国家货币映射详细信息

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `id` | string | 是 | 映射ID |

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "countryCode": "CN",
    "currencyId": "uuid",
    "currencyCode": "CNY",
    "countryNames": {
      "zh": ["中国"],
      "en": ["China"]
    },
    "isActive": true,
    "metadata": null,
    "createdAt": "2025-01-29T00:00:00.000Z",
    "updatedAt": "2025-01-29T00:00:00.000Z"
  },
  "message": "获取成功"
}
```

---

### 4. 更新国家货币映射

**接口路径**: `PUT /api/v1/admin/currency/country-mappings/:id` 或 `PATCH /api/v1/admin/currency/country-mappings/:id`

**接口描述**: 更新国家货币映射信息（所有字段可选，支持部分更新）

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `id` | string | 是 | 映射ID |

**请求体**（所有字段可选）:

```json
{
  "countryCode": "CN",
  "currencyId": "uuid",
  "countryNames": {
    "zh": ["中国", "中华人民共和国"],
    "en": ["China", "PRC"]
  },
  "isActive": true,
  "metadata": {}
}
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "countryCode": "CN",
    "currencyId": "uuid",
    "currencyCode": "CNY",
    "countryNames": {
      "zh": ["中国", "中华人民共和国"],
      "en": ["China", "PRC"]
    },
    "isActive": true,
    "metadata": null,
    "createdAt": "2025-01-29T00:00:00.000Z",
    "updatedAt": "2025-01-29T01:00:00.000Z"
  },
  "message": "更新成功"
}
```

---

### 5. 删除国家货币映射

**接口路径**: `DELETE /api/v1/admin/currency/country-mappings/:id`

**接口描述**: 删除国家货币映射信息

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `id` | string | 是 | 映射ID |

**响应示例**:

```json
{
  "success": true,
  "message": "删除成功"
}
```

---

## 错误响应

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "货币不存在",
  "error": "Not Found"
}
```

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "无法删除货币：仍有 5 个国家映射使用此货币",
  "error": "Bad Request"
}
```

### 409 Conflict

```json
{
  "statusCode": 409,
  "message": "货币代码 CNY 已存在",
  "error": "Conflict"
}
```

---

## 注意事项

1. **认证**: 当前所有接口都是公开的，建议在生产环境中添加管理员权限验证
2. **货币代码**: 会自动转换为大写（如 'cny' -> 'CNY'）
3. **国家代码**: 会自动转换为大写（如 'cn' -> 'CN'）
4. **删除限制**: 如果货币被国家映射使用，则无法删除该货币
5. **唯一性**: 货币代码和国家代码必须唯一
6. **外键关系**: 创建国家货币映射时，必须确保货币ID存在

---

## 使用示例

### 创建货币和国家映射

```bash
# 1. 创建货币
curl -X POST "http://localhost:3000/api/v1/admin/currency/currencies" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "CNY",
    "symbol": "¥",
    "nameZh": "人民币",
    "nameEn": "CNY"
  }'

# 2. 创建单个国家货币映射
curl -X POST "http://localhost:3000/api/v1/admin/currency/country-mappings" \
  -H "Content-Type: application/json" \
  -d '{
    "countryCode": "CN",
    "currencyId": "货币ID",
    "countryNames": {
      "zh": ["中国", "中华人民共和国"],
      "en": ["China", "PRC"]
    }
  }'

# 3. 批量创建国家货币映射（推荐）
curl -X POST "http://localhost:3000/api/v1/admin/currency/country-mappings/batch" \
  -H "Content-Type: application/json" \
  -d '{
    "mappings": [
      {
        "countryCode": "CN",
        "currencyId": "货币ID-1",
        "countryNames": {
          "zh": ["中国"],
          "en": ["China"]
        }
      },
      {
        "countryCode": "US",
        "currencyId": "货币ID-2",
        "countryNames": {
          "zh": ["美国"],
          "en": ["United States", "USA"]
        }
      },
      {
        "countryCode": "GB",
        "currencyId": "货币ID-3",
        "countryNames": {
          "zh": ["英国"],
          "en": ["United Kingdom", "UK"]
        }
      }
    ]
  }'
```

### 批量导入示例（JavaScript/TypeScript）

```typescript
// 准备批量导入数据
const mappings = [
  {
    countryCode: 'CN',
    currencyId: 'cny-currency-id',
    countryNames: {
      zh: ['中国', '中华人民共和国'],
      en: ['China', 'PRC'],
    },
  },
  {
    countryCode: 'US',
    currencyId: 'usd-currency-id',
    countryNames: {
      zh: ['美国'],
      en: ['United States', 'USA'],
    },
  },
  // ... 更多映射
];

// 调用批量导入接口
const response = await fetch('/api/v1/admin/currency/country-mappings/batch', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ mappings }),
});

const result = await response.json();
console.log(`成功: ${result.data.created}, 跳过: ${result.data.skipped}, 失败: ${result.data.failed}`);

if (result.data.errors.length > 0) {
  console.error('失败详情:', result.data.errors);
}
```

