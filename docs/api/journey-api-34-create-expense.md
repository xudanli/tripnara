# 行程接口文档 - 34. 创建支出

## 接口信息

**接口路径：** `POST /api/v1/journeys/{journeyId}/expenses`

**接口描述：** 为行程添加新的支出记录

**认证：** 需要 JWT Token（Bearer Token）

**Content-Type：** `application/json`

---

## 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `journeyId` | string | 是 | 行程ID（UUID） |

---

## 请求参数

### 请求体结构

```json
{
  "title": "午餐",
  "amount": 2500,
  "currencyCode": "ISK",
  "category": "餐饮",
  "location": "雷克雅未克市中心餐厅",
  "payerId": "user_001",
  "payerName": "张三",
  "splitType": "equal",
  "splitDetails": null,
  "date": "2025-11-25",
  "notes": "四人AA"
}
```

### 字段说明

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `title` | string | 是 | 支出标题/名称 |
| `amount` | number | 是 | 支出金额，必须 > 0 |
| `currencyCode` | string | 否 | 货币代码（ISO 4217），如 'ISK', 'USD', 'CNY'，默认 'USD' |
| `category` | string | 否 | 分类：`交通`、`住宿`、`餐饮`、`景点`、`购物`、`其他` |
| `location` | string | 否 | 位置/商家名称 |
| `payerId` | string | 否 | 付款人ID（成员ID或用户ID） |
| `payerName` | string | 否 | 付款人名称（用于显示） |
| `splitType` | string | 否 | 分摊方式：`none`（不分摊，默认）、`equal`（平均分摊）、`custom`（自定义分摊） |
| `splitDetails` | object | 否 | 自定义分摊详情，格式：`{ memberId: amount }`，当 `splitType='custom'` 时必填 |
| `date` | string | 否 | 支出日期（YYYY-MM-DD格式），默认今天 |
| `notes` | string | 否 | 备注信息 |

---

## 请求示例

### cURL

```bash
curl -X POST "http://localhost:3000/api/v1/journeys/b8b8626a-b914-4109-9a95-6441676df252/expenses" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "午餐",
    "amount": 2500,
    "currencyCode": "ISK",
    "category": "餐饮",
    "location": "雷克雅未克市中心餐厅",
    "payerId": "user_001",
    "payerName": "张三",
    "splitType": "equal",
    "date": "2025-11-25",
    "notes": "四人AA"
  }'
```

### JavaScript/TypeScript

```typescript
const journeyId = 'b8b8626a-b914-4109-9a95-6441676df252';

const newExpense = {
  title: '午餐',
  amount: 2500,
  currencyCode: 'ISK',
  category: '餐饮',
  location: '雷克雅未克市中心餐厅',
  payerId: 'user_001',
  payerName: '张三',
  splitType: 'equal',
  date: '2025-11-25',
  notes: '四人AA',
};

const response = await fetch(`/api/v1/journeys/${journeyId}/expenses`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(newExpense),
});

const result = await response.json();
console.log('创建成功:', result);
```

### 自定义分摊示例

```json
{
  "title": "酒店住宿",
  "amount": 15000,
  "currencyCode": "ISK",
  "category": "住宿",
  "location": "雷克雅未克市中心酒店",
  "payerId": "user_001",
  "payerName": "张三",
  "splitType": "custom",
  "splitDetails": {
    "member_1": 7500,
    "member_2": 7500
  },
  "date": "2025-11-25",
  "notes": "两晚住宿，每人一晚"
}
```

---

## 响应数据

### 成功响应（200 OK）

```json
{
  "success": true,
  "data": {
    "id": "exp_123456",
    "title": "午餐",
    "amount": 2500,
    "currencyCode": "ISK",
    "category": "餐饮",
    "location": "雷克雅未克市中心餐厅",
    "payerId": "user_001",
    "payerName": "张三",
    "splitType": "equal",
    "splitDetails": null,
    "date": "2025-11-25",
    "notes": "四人AA",
    "createdAt": "2025-11-25T12:00:00.000Z",
    "updatedAt": "2025-11-25T12:00:00.000Z"
  },
  "message": "支出创建成功"
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 是否成功 |
| `data` | object | 创建的支出数据 |
| `data.id` | string | 支出ID（后端自动生成） |
| `data.*` | - | 其他字段与请求体相同 |
| `message` | string | 提示消息 |

---

## 错误响应

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": [
    "支出金额必须大于0",
    "当分摊方式为custom时，必须提供splitDetails"
  ],
  "error": "Bad Request"
}
```

### 400 Bad Request - 分摊验证失败

```json
{
  "statusCode": 400,
  "message": "分摊详情的总和必须等于支出金额",
  "error": "Bad Request"
}
```

### 403 Forbidden

```json
{
  "statusCode": 403,
  "message": "无权为此行程添加支出",
  "error": "Forbidden"
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "行程不存在: b8b8626a-b914-4109-9a95-6441676df252",
  "error": "Not Found"
}
```

---

## 使用说明

1. **必填字段**：`title` 和 `amount` 是必填的
2. **金额验证**：`amount` 必须大于 0
3. **日期格式**：如果不提供 `date`，默认使用当前日期
4. **货币代码**：如果不提供 `currencyCode`，默认使用 'USD'
5. **分摊方式**：
   - `none`：不分摊，付款人独自承担
   - `equal`：平均分摊给所有成员（成员信息需要前端维护）
   - `custom`：必须提供 `splitDetails`，且总和必须等于 `amount`

---

## 注意事项

1. 当 `splitType='custom'` 时，必须提供 `splitDetails`，且所有成员的分摊金额总和必须等于 `amount`
2. 支出创建后会自动关联到指定的行程
3. 只有行程的创建者或成员可以添加支出
4. 支出日期不能早于行程开始日期（建议前端进行验证）

