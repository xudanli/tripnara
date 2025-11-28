# 货币和国家代码数据格式说明

## 数据格式要求

为了便于批量导入 ISO 3166-1 alpha-2 国家代码和货币映射数据，请按照以下格式提供数据。

## 推荐格式：JSON

### 格式 1：完整格式（包含货币和国家映射）

```json
{
  "currencies": [
    {
      "code": "CNY",
      "symbol": "¥",
      "nameZh": "人民币",
      "nameEn": "CNY"
    },
    {
      "code": "USD",
      "symbol": "$",
      "nameZh": "美元",
      "nameEn": "USD"
    }
  ],
  "countryMappings": [
    {
      "countryCode": "CN",
      "currencyCode": "CNY",
      "countryNames": {
        "zh": ["中国", "中华人民共和国"],
        "en": ["China", "PRC", "People's Republic of China"]
      }
    },
    {
      "countryCode": "US",
      "currencyCode": "USD",
      "countryNames": {
        "zh": ["美国", "美利坚合众国"],
        "en": ["United States", "USA", "United States of America"]
      }
    }
  ]
}
```

### 格式 2：简化格式（仅国家映射，货币代码自动匹配）

如果货币已存在，可以使用简化格式：

```json
[
  {
    "countryCode": "CN",
    "currencyCode": "CNY",
    "countryNames": {
      "zh": ["中国", "中华人民共和国"],
      "en": ["China", "PRC"]
    }
  },
  {
    "countryCode": "US",
    "currencyCode": "USD",
    "countryNames": {
      "zh": ["美国"],
      "en": ["United States", "USA"]
    }
  }
]
```

### 格式 3：CSV 格式（可选）

如果数据是 CSV 格式，可以使用以下列：

```csv
countryCode,currencyCode,countryNameZh,countryNameEn,currencySymbol
CN,CNY,中国,China,¥
US,USD,美国,United States,$
GB,GBP,英国,United Kingdom,£
```

**CSV 列说明：**
- `countryCode`: 国家代码（ISO 3166-1 alpha-2），必填
- `currencyCode`: 货币代码（ISO 4217），必填
- `countryNameZh`: 国家中文名称（多个用分号分隔），可选
- `countryNameEn`: 国家英文名称（多个用分号分隔），可选
- `currencySymbol`: 货币符号，可选（如果货币不存在会自动创建）

## 字段说明

### 货币字段（currencies）

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `code` | string | 是 | 货币代码（ISO 4217） | `"CNY"` |
| `symbol` | string | 是 | 货币符号 | `"¥"` |
| `nameZh` | string | 是 | 中文名称 | `"人民币"` |
| `nameEn` | string | 是 | 英文名称 | `"CNY"` |

### 国家映射字段（countryMappings）

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `countryCode` | string | 是 | 国家代码（ISO 3166-1 alpha-2） | `"CN"` |
| `currencyCode` | string | 是 | 货币代码（ISO 4217） | `"CNY"` |
| `countryNames` | object | 否 | 国家名称映射 | 见下方 |
| `countryNames.zh` | string[] | 否 | 中文名称数组 | `["中国", "中华人民共和国"]` |
| `countryNames.en` | string[] | 否 | 英文名称数组 | `["China", "PRC"]` |

## 数据示例

### 完整示例（JSON）

```json
{
  "currencies": [
    {
      "code": "CNY",
      "symbol": "¥",
      "nameZh": "人民币",
      "nameEn": "CNY"
    },
    {
      "code": "USD",
      "symbol": "$",
      "nameZh": "美元",
      "nameEn": "USD"
    },
    {
      "code": "EUR",
      "symbol": "€",
      "nameZh": "欧元",
      "nameEn": "EUR"
    }
  ],
  "countryMappings": [
    {
      "countryCode": "CN",
      "currencyCode": "CNY",
      "countryNames": {
        "zh": ["中国", "中华人民共和国", "中国大陆"],
        "en": ["China", "PRC", "People's Republic of China", "Mainland China"]
      }
    },
    {
      "countryCode": "US",
      "currencyCode": "USD",
      "countryNames": {
        "zh": ["美国", "美利坚合众国"],
        "en": ["United States", "USA", "United States of America", "US"]
      }
    },
    {
      "countryCode": "FR",
      "currencyCode": "EUR",
      "countryNames": {
        "zh": ["法国"],
        "en": ["France", "French Republic"]
      }
    },
    {
      "countryCode": "DE",
      "currencyCode": "EUR",
      "countryNames": {
        "zh": ["德国"],
        "en": ["Germany", "Federal Republic of Germany"]
      }
    }
  ]
}
```

## 注意事项

1. **国家代码格式**：必须是 ISO 3166-1 alpha-2 格式（2个大写字母），如 `CN`, `US`, `GB`
2. **货币代码格式**：必须是 ISO 4217 格式（3个大写字母），如 `CNY`, `USD`, `EUR`
3. **国家名称**：支持多个名称，建议包含常用别名和全称
4. **货币符号**：如果货币不存在，系统会根据 `currencyCode` 自动创建货币记录
5. **重复处理**：已存在的货币和国家映射会被自动跳过

## 导入方式

### 方式 1：使用批量导入 API（推荐）

```bash
# 1. 先导入货币（如果需要）
curl -X POST "http://localhost:3000/api/v1/admin/currency/currencies" \
  -H "Content-Type: application/json" \
  -d '{"code": "CNY", "symbol": "¥", "nameZh": "人民币", "nameEn": "CNY"}'

# 2. 获取货币ID后，批量导入国家映射
curl -X POST "http://localhost:3000/api/v1/admin/currency/country-mappings/batch" \
  -H "Content-Type: application/json" \
  -d '{
    "mappings": [
      {
        "countryCode": "CN",
        "currencyId": "货币ID",
        "countryNames": {
          "zh": ["中国"],
          "en": ["China"]
        }
      }
    ]
  }'
```

### 方式 2：使用导入脚本（待实现）

如果提供 JSON 文件，我可以创建一个脚本来自动导入。

## 数据文件位置

建议将数据文件放在以下位置：
- `data/currency-data.json` - JSON 格式
- `data/currency-data.csv` - CSV 格式（如果使用）

## 推荐格式（最简单）

**使用货币代码格式**，这是最简单的方式：

```json
{
  "mappings": [
    {
      "countryCode": "CN",
      "currencyCode": "CNY",
      "countryNames": {
        "zh": ["中国", "中华人民共和国"],
        "en": ["China", "PRC"]
      }
    },
    {
      "countryCode": "US",
      "currencyCode": "USD",
      "countryNames": {
        "zh": ["美国"],
        "en": ["United States", "USA"]
      }
    }
  ]
}
```

**接口**: `POST /api/v1/admin/currency/country-mappings/batch-by-code`

**优点**:
- 无需提前获取货币ID
- 只需提供货币代码（如 CNY, USD）
- 系统会自动查找对应的货币

## 数据字段说明

### 必需字段
- `countryCode`: 国家代码（ISO 3166-1 alpha-2），2个大写字母，如 `CN`, `US`, `GB`
- `currencyCode`: 货币代码（ISO 4217），3个大写字母，如 `CNY`, `USD`, `EUR`

### 可选字段
- `countryNames`: 国家名称映射
  - `countryNames.zh`: 中文名称数组，如 `["中国", "中华人民共和国"]`
  - `countryNames.en`: 英文名称数组，如 `["China", "PRC"]`
- `isActive`: 是否启用（默认：`true`）
- `metadata`: 元数据（任意对象）

## 下一步

请按照上述格式提供数据，我可以：
1. 创建导入脚本自动处理 JSON 文件
2. 或者直接使用批量导入 API 接口导入数据

**推荐使用格式 2（简化格式）**，直接提供国家映射数组即可。

