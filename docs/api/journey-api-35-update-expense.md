# 行程接口文档 - 35. 更新支出

## 接口信息

**接口路径：** `PATCH /api/v1/journeys/{journeyId}/expenses/{expenseId}`

**接口描述：** 更新指定的支出记录，所有字段可选，只传入需要更新的字段

**认证：** 需要 JWT Token（Bearer Token）

**Content-Type：** `application/json`

---

## 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `journeyId` | string | 是 | 行程ID（UUID） |
| `expenseId` | string | 是 | 支出ID（UUID） |

---

## 请求参数

### 请求体结构

所有字段都是可选的，只传入需要更新的字段：

```json
{
  "title": "晚餐",
  "amount": 3000,
  "currencyCode": "ISK",
  "category": "餐饮",
  "location": "雷克雅未克市中心餐厅",
  "payerId": "user_002",
  "payerName": "李四",
  "splitType": "equal",
  "splitDetails": null,
  "date": "2025-11-26",
  "notes": "五人AA"
}
```

### 字段说明

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `title` | string | 否 | 支出标题/名称 |
| `amount` | number | 否 | 支出金额，必须 > 0 |
| `currencyCode` | string | 否 | 货币代码（ISO 4217），如 'ISK', 'USD', 'CNY' |
| `category` | string | 否 | 分类：`交通`、`住宿`、`餐饮`、`景点`、`购物`、`其他` |
| `location` | string | 否 | 位置/商家名称 |
| `payerId` | string | 否 | 付款人ID（成员ID或用户ID） |
| `payerName` | string | 否 | 付款人名称（用于显示） |
| `splitType` | string | 否 | 分摊方式：`none`（不分摊）、`equal`（平均分摊）、`custom`（自定义分摊） |
| `splitDetails` | object | 否 | 自定义分摊详情，格式：`{ memberId: amount }`，当 `splitType='custom'` 时必填 |
| `date` | string | 否 | 支出日期（YYYY-MM-DD格式） |
| `notes` | string | 否 | 备注信息 |

---

## 请求示例

### cURL

```bash
curl -X PATCH "http://localhost:3000/api/v1/journeys/b8b8626a-b914-4109-9a95-6441676df252/expenses/exp_123456" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "晚餐",
    "amount": 3000,
    "category": "餐饮",
    "notes": "五人AA"
  }'
```

### JavaScript/TypeScript

```typescript
const journeyId = 'b8b8626a-b914-4109-9a95-6441676df252';
const expenseId = 'exp_123456';

const updateData = {
  title: '晚餐',
  amount: 3000,
  category: '餐饮',
  notes: '五人AA',
};

const response = await fetch(`/api/v1/journeys/${journeyId}/expenses/${expenseId}`, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(updateData),
});

const result = await response.json();
console.log('更新成功:', result);
```

### 部分更新示例

只更新金额和备注：

```json
{
  "amount": 3500,
  "notes": "更新后的备注"
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
    "title": "晚餐",
    "amount": 3000,
    "currencyCode": "ISK",
    "category": "餐饮",
    "location": "雷克雅未克市中心餐厅",
    "payerId": "user_002",
    "payerName": "李四",
    "splitType": "equal",
    "splitDetails": null,
    "date": "2025-11-26",
    "notes": "五人AA",
    "createdAt": "2025-11-25T12:00:00.000Z",
    "updatedAt": "2025-11-26T10:30:00.000Z"
  },
  "message": "支出更新成功"
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 是否成功 |
| `data` | object | 更新后的支出数据 |
| `data.id` | string | 支出ID |
| `data.*` | - | 其他字段与创建支出接口相同 |
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
  "message": "无权修改此行程的支出",
  "error": "Forbidden"
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "支出不存在或不属于此行程: exp_123456",
  "error": "Not Found"
}
```

---

## 使用说明

1. **部分更新**：所有字段都是可选的，只传入需要更新的字段即可
2. **金额验证**：如果更新 `amount`，必须大于 0
3. **分摊验证**：
   - 如果更新 `splitType` 为 `custom`，必须提供 `splitDetails`
   - `splitDetails` 的总和必须等于 `amount`
4. **日期格式**：如果更新 `date`，必须符合 YYYY-MM-DD 格式

---

## 注意事项

1. 只有行程的创建者或成员可以更新支出
2. 支出必须属于指定的行程
3. 更新 `splitType` 为 `custom` 时，必须同时提供 `splitDetails`，且总和必须等于 `amount`
4. 更新后的 `updatedAt` 字段会自动更新为当前时间
