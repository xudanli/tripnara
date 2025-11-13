# 签证管理 API 接口文档

## 基础信息

- **Base URL**: `http://localhost:3000/api`
- **API 版本**: v1
- **数据格式**: JSON
- **字符编码**: UTF-8

## 接口列表

### 1. 查询签证信息

查询指定目的地的签证信息。

**接口地址**: `GET /api/visa/info`

**请求参数** (Query Parameters):

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| destinationCountry | string | 是 | 目的地国家代码（ISO 3166-1 alpha-2） | `JP` |
| nationalityCode | string | 否 | 用户国籍代码（ISO 3166-1 alpha-2） | `CN` |
| permanentResidencyCode | string | 否 | 永久居民身份国家代码（ISO 3166-1 alpha-2） | `US` |

**请求示例**:
```bash
GET /api/visa/info?destinationCountry=JP&nationalityCode=CN
```

**响应格式**:
```json
{
  "success": true,
  "data": [
    {
      "destinationCountry": "JP",
      "destinationName": "日本",
      "visaType": "visa-required",
      "applicableTo": "中国护照",
      "description": "需要提前申请旅游签证",
      "duration": null,
      "applicationUrl": "https://www.cn.emb-japan.go.jp/consular/visa.htm"
    }
  ]
}
```

**响应字段说明**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| success | boolean | 请求是否成功 |
| data | array | 签证信息列表 |
| data[].destinationCountry | string | 目的地国家代码 |
| data[].destinationName | string | 目的地国家名称 |
| data[].visaType | string | 签证类型：`visa-free`（免签）、`visa-on-arrival`（落地签）、`e-visa`（电子签）、`visa-required`（需要签证）、`permanent-resident-benefit`（永久居民优惠） |
| data[].applicableTo | string | 适用对象描述 |
| data[].description | string | 详细说明 |
| data[].duration | number | 停留期限（天数） |
| data[].applicationUrl | string | 申请链接 |

**错误响应**:
```json
{
  "statusCode": 400,
  "message": ["destinationCountry should not be empty"],
  "error": "Bad Request"
}
```

---

### 2. 多目的地签证分析

分析多个目的地的签证需求。

**接口地址**: `POST /api/visa/multi-destination-analysis`

**请求参数** (Request Body):

```json
{
  "destinationCountries": ["JP", "TH", "SG"],
  "nationalityCode": "CN",
  "permanentResidencyCode": "US"
}
```

**请求字段说明**:

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| destinationCountries | string[] | 是 | 目的地国家代码数组 |
| nationalityCode | string | 否 | 用户国籍代码 |
| permanentResidencyCode | string | 否 | 永久居民身份国家代码 |

**响应格式**:
```json
{
  "success": true,
  "data": {
    "allCountries": ["JP", "TH", "SG"],
    "requiredVisas": [
      {
        "name": "落地签",
        "description": "可以在抵达时办理签证",
        "countries": ["TH"],
        "visaInfo": [
          {
            "destinationCountry": "TH",
            "destinationName": "泰国",
            "visaType": "visa-on-arrival",
            "applicableTo": "中国护照",
            "description": "落地签停留30天",
            "duration": 30
          }
        ]
      },
      {
        "name": "需要提前办理签证",
        "description": "需要提前在使领馆或签证中心办理签证",
        "countries": ["JP"],
        "visaInfo": [...]
      }
    ],
    "groupedByUnion": {
      "asean": {
        "unionName": "东盟",
        "description": "东南亚国家联盟",
        "countries": ["TH", "SG"]
      }
    },
    "summary": "1个国家免签：SG；1个国家可落地签：TH；1个国家需要提前办理签证：JP"
  }
}
```

**响应字段说明**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| allCountries | string[] | 所有目的地国家代码 |
| requiredVisas | array | 需要签证的列表 |
| requiredVisas[].name | string | 签证类型名称 |
| requiredVisas[].description | string | 描述 |
| requiredVisas[].countries | string[] | 需要该类型签证的国家 |
| requiredVisas[].visaInfo | array | 签证详细信息 |
| groupedByUnion | object | 按签证联盟分组的信息 |
| summary | string | 分析摘要 |

---

### 3. 获取签证政策列表（管理接口）

获取所有签证政策，支持分页和筛选。

**接口地址**: `GET /api/visa/admin/policies`

**请求参数** (Query Parameters):

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| page | number | 否 | 页码，默认 1 | `1` |
| limit | number | 否 | 每页数量，默认 20 | `20` |
| destinationCountryCode | string | 否 | 目的地国家代码 | `JP` |
| applicantType | string | 否 | 申请人类型：`nationality` 或 `permanent_resident` | `nationality` |
| applicantCountryCode | string | 否 | 申请人国家代码 | `CN` |
| visaType | string | 否 | 签证类型 | `visa-required` |
| isActive | boolean | 否 | 是否生效 | `true` |

**请求示例**:
```bash
GET /api/visa/admin/policies?page=1&limit=20&destinationCountryCode=JP
```

**响应格式**:
```json
{
  "data": [
    {
      "id": 1,
      "destinationCountryCode": "JP",
      "destinationCountryName": "日本",
      "applicantType": "nationality",
      "applicantCountryCode": "CN",
      "applicantDescription": "中国护照",
      "visaType": "visa-required",
      "description": "需要提前申请旅游签证",
      "durationDays": null,
      "applicationUrl": "https://www.cn.emb-japan.go.jp/consular/visa.htm",
      "isActive": true,
      "effectiveDate": "2024-01-01",
      "expiryDate": null,
      "updatedBy": "admin",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "lastUpdatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

---

### 4. 创建签证政策（管理接口）

创建新的签证政策。

**接口地址**: `POST /api/visa/admin/policies`

**请求参数** (Request Body):

```json
{
  "destinationCountryCode": "JP",
  "destinationCountryName": "日本",
  "applicantType": "nationality",
  "applicantCountryCode": "CN",
  "applicantDescription": "中国护照",
  "visaType": "visa-required",
  "description": "需要提前申请旅游签证",
  "durationDays": 15,
  "applicationUrl": "https://www.cn.emb-japan.go.jp/consular/visa.htm",
  "isActive": true,
  "effectiveDate": "2024-01-01",
  "expiryDate": null,
  "updatedBy": "admin"
}
```

**请求字段说明**:

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| destinationCountryCode | string | 是 | 目的地国家代码（2位） |
| destinationCountryName | string | 是 | 目的地国家名称 |
| applicantType | string | 是 | 申请人类型：`nationality` 或 `permanent_resident` |
| applicantCountryCode | string | 是 | 申请人国家代码（2位） |
| applicantDescription | string | 是 | 申请人描述 |
| visaType | string | 是 | 签证类型 |
| description | string | 否 | 详细说明 |
| durationDays | number | 否 | 停留期限（天数） |
| applicationUrl | string | 否 | 申请链接 |
| isActive | boolean | 否 | 是否生效，默认 true |
| effectiveDate | string | 否 | 生效日期（YYYY-MM-DD） |
| expiryDate | string | 否 | 失效日期（YYYY-MM-DD） |
| updatedBy | string | 否 | 更新人 |

**响应格式**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "destinationCountryCode": "JP",
    "destinationCountryName": "日本",
    ...
  }
}
```

---

### 5. 更新签证政策（管理接口）

更新现有的签证政策。

**接口地址**: `PATCH /api/visa/admin/policies/:id`

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | number | 是 | 政策 ID |

**请求参数** (Request Body):

所有字段都是可选的，只传需要更新的字段：

```json
{
  "description": "更新后的说明",
  "durationDays": 30,
  "isActive": false
}
```

**响应格式**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    ...
  }
}
```

---

### 6. 删除签证政策（管理接口）

删除签证政策（软删除，设置 isActive 为 false）。

**接口地址**: `DELETE /api/visa/admin/policies/:id`

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | number | 是 | 政策 ID |

**响应格式**:
```json
{
  "success": true,
  "message": "签证政策已删除"
}
```

---

### 7. 获取政策变更历史（管理接口）

获取指定政策的变更历史记录。

**接口地址**: `GET /api/visa/admin/policies/:id/history`

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | number | 是 | 政策 ID |

**响应格式**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "policyId": 1,
      "action": "created",
      "oldData": null,
      "newData": {...},
      "changedBy": "admin",
      "changedAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "policyId": 1,
      "action": "updated",
      "oldData": {...},
      "newData": {...},
      "changedBy": "admin",
      "changedAt": "2024-01-02T00:00:00.000Z"
    }
  ]
}
```

---

## 签证类型枚举值

| 值 | 说明 |
|----|------|
| `visa-free` | 免签 |
| `visa-on-arrival` | 落地签 |
| `e-visa` | 电子签 |
| `visa-required` | 需要提前办理签证 |
| `permanent-resident-benefit` | 永久居民优惠 |

## 申请人类型枚举值

| 值 | 说明 |
|----|------|
| `nationality` | 国籍 |
| `permanent_resident` | 永久居民 |

## 错误码说明

| HTTP 状态码 | 说明 |
|------------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

**错误响应格式**:
```json
{
  "statusCode": 400,
  "message": ["destinationCountry should not be empty"],
  "error": "Bad Request"
}
```

## 前端集成示例

### JavaScript/TypeScript 示例

```typescript
// 查询签证信息
async function getVisaInfo(destinationCountry: string, nationalityCode?: string) {
  const params = new URLSearchParams({
    destinationCountry,
  });
  if (nationalityCode) {
    params.append('nationalityCode', nationalityCode);
  }
  
  const response = await fetch(`/api/visa/info?${params}`);
  const result = await response.json();
  
  if (result.success) {
    return result.data;
  }
  throw new Error('查询失败');
}

// 多目的地分析
async function analyzeMultiDestination(
  destinationCountries: string[],
  nationalityCode?: string
) {
  const response = await fetch('/api/visa/multi-destination-analysis', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      destinationCountries,
      nationalityCode,
    }),
  });
  
  const result = await response.json();
  
  if (result.success) {
    return result.data;
  }
  throw new Error('分析失败');
}

// 获取政策列表
async function getPolicies(page = 1, limit = 20, filters = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...filters,
  });
  
  const response = await fetch(`/api/visa/admin/policies?${params}`);
  return await response.json();
}
```

### React 示例

```tsx
import { useState, useEffect } from 'react';

function VisaInfoComponent() {
  const [visaInfo, setVisaInfo] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchVisaInfo = async (destination: string, nationality?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ destinationCountry: destination });
      if (nationality) params.append('nationalityCode', nationality);
      
      const response = await fetch(`/api/visa/info?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setVisaInfo(data.data);
      }
    } catch (error) {
      console.error('查询失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={() => fetchVisaInfo('JP', 'CN')}>
        查询日本签证信息
      </button>
      {loading && <p>加载中...</p>}
      {visaInfo.map((info, index) => (
        <div key={index}>
          <h3>{info.destinationName}</h3>
          <p>类型: {info.visaType}</p>
          <p>说明: {info.description}</p>
        </div>
      ))}
    </div>
  );
}
```

## Swagger 文档

如果后端启用了 Swagger，可以通过以下地址访问交互式 API 文档：

```
http://localhost:3000/api/docs
```

在 Swagger 文档中，可以：
- 查看所有接口的详细说明
- 直接测试接口
- 查看请求和响应的数据结构

## 注意事项

1. **国家代码格式**: 使用 ISO 3166-1 alpha-2 标准（2位大写字母），如 `CN`、`JP`、`US`
2. **日期格式**: 使用 ISO 8601 格式（YYYY-MM-DD），如 `2024-01-01`
3. **时区**: 所有时间戳使用 UTC 时区
4. **分页**: 默认每页 20 条，最大建议不超过 100 条
5. **错误处理**: 建议前端统一处理错误响应，显示友好的错误提示

## 更新日志

- 2024-01-01: 初始版本，包含基础查询和管理接口

