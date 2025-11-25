# 行程接口文档 - 33. 获取支出列表

## 接口信息

**接口路径：** `GET /api/v1/journeys/{journeyId}/expenses`

**接口描述：** 获取行程的所有支出记录，支持按分类、日期、付款人筛选

**认证：** 需要 JWT Token（Bearer Token）

**Content-Type：** `application/json`

---

## 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `journeyId` | string | 是 | 行程ID（UUID） |

---

## 查询参数

| 参数名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| `category` | string | 否 | 按分类筛选：`交通`、`住宿`、`餐饮`、`景点`、`购物`、`其他` | `餐饮` |
| `startDate` | string | 否 | 开始日期（YYYY-MM-DD格式） | `2025-11-25` |
| `endDate` | string | 否 | 结束日期（YYYY-MM-DD格式） | `2025-11-30` |
| `payerId` | string | 否 | 按付款人ID筛选 | `user_001` |

---

## 请求示例

### cURL

```bash
curl -X GET "http://localhost:3000/api/v1/journeys/b8b8626a-b914-4109-9a95-6441676df252/expenses?category=餐饮&startDate=2025-11-25&endDate=2025-11-30" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript/TypeScript

```typescript
const journeyId = 'b8b8626a-b914-4109-9a95-6441676df252';
const params = new URLSearchParams({
  category: '餐饮',
  startDate: '2025-11-25',
  endDate: '2025-11-30',
});

const response = await fetch(`/api/v1/journeys/${journeyId}/expenses?${params}`, {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const result = await response.json();
console.log('支出列表:', result);
```

---

## 响应数据

### 成功响应（200 OK）

```json
{
  "success": true,
  "data": [
    {
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
    {
      "id": "exp_123457",
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
      "notes": "两晚住宿",
      "createdAt": "2025-11-25T14:00:00.000Z",
      "updatedAt": "2025-11-25T14:00:00.000Z"
    }
  ],
  "total": 17500
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 是否成功 |
| `data` | array | 支出列表 |
| `data[].id` | string | 支出ID |
| `data[].title` | string | 支出标题/名称 |
| `data[].amount` | number | 支出金额 |
| `data[].currencyCode` | string | 货币代码（ISO 4217），如 'ISK', 'USD', 'CNY' |
| `data[].category` | string | 分类：`交通`、`住宿`、`餐饮`、`景点`、`购物`、`其他` |
| `data[].location` | string | 位置/商家名称 |
| `data[].payerId` | string | 付款人ID |
| `data[].payerName` | string | 付款人名称（用于显示） |
| `data[].splitType` | string | 分摊方式：`none`（不分摊）、`equal`（平均分摊）、`custom`（自定义分摊） |
| `data[].splitDetails` | object | 自定义分摊详情，格式：`{ memberId: amount }` |
| `data[].date` | string | 支出日期（YYYY-MM-DD格式） |
| `data[].notes` | string | 备注信息 |
| `data[].createdAt` | string | 创建时间（ISO 8601格式） |
| `data[].updatedAt` | string | 更新时间（ISO 8601格式） |
| `total` | number | 总支出金额（所有支出的总和） |

---

## 错误响应

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "行程不存在: b8b8626a-b914-4109-9a95-6441676df252",
  "error": "Not Found"
}
```

### 403 Forbidden

```json
{
  "statusCode": 403,
  "message": "无权访问此行程的支出",
  "error": "Forbidden"
}
```

---

## 使用说明

1. **筛选功能**：可以组合使用多个查询参数进行筛选
2. **日期范围**：`startDate` 和 `endDate` 可以单独使用或组合使用
3. **排序**：支出列表默认按日期倒序、创建时间倒序排列
4. **总金额计算**：`total` 字段是所有筛选后支出的总和

---

## 分摊方式说明

- **none（不分摊）**：支出由付款人独自承担
- **equal（平均分摊）**：支出平均分配给所有成员
- **custom（自定义分摊）**：通过 `splitDetails` 指定每个成员的分摊金额

---

## 注意事项

1. 所有查询参数都是可选的，不提供参数将返回该行程的所有支出
2. 日期筛选使用 `>= startDate` 和 `<= endDate` 的逻辑
3. 总金额计算不包括未筛选到的支出
4. 支出列表按日期倒序排列，最新的支出在前面

