# 预算管理接口总结

## 📋 概述

本文档总结了所有预算管理相关的 API 接口，包括接口路径、功能说明和快速参考。

**基础路径：** `/api/v1/journeys/{journeyId}/expenses`

---

## 🔗 接口列表

| 序号 | 接口 | 方法 | 路径 | 详细文档 | 状态 |
|------|------|------|------|----------|------|
| 33 | 获取支出列表 | GET | `/api/v1/journeys/:journeyId/expenses` | [journey-api-33-get-expenses.md](./journey-api-33-get-expenses.md) | ✅ 已完成 |
| 34 | 创建支出 | POST | `/api/v1/journeys/:journeyId/expenses` | [journey-api-34-create-expense.md](./journey-api-34-create-expense.md) | ✅ 已完成 |
| 35 | 更新支出 | PATCH | `/api/v1/journeys/:journeyId/expenses/:expenseId` | [journey-api-35-update-expense.md](./journey-api-35-update-expense.md) | ✅ 已完成 |
| 36 | 删除支出 | DELETE | `/api/v1/journeys/:journeyId/expenses/:expenseId` | [journey-api-36-delete-expense.md](./journey-api-36-delete-expense.md) | ✅ 已完成 |
| - | 更新预算总额 | PATCH | `/api/v1/journeys/:journeyId` | 使用现有接口的 `totalCost` 字段 | ✅ 已完成 |

---

## 🚀 快速开始

### 1. 获取支出列表

```typescript
GET /api/v1/journeys/{journeyId}/expenses?category=餐饮&startDate=2025-11-25&endDate=2025-11-30
Authorization: Bearer {token}

Response: {
  success: true,
  data: Expense[],
  total: number
}
```

### 2. 创建支出

```typescript
POST /api/v1/journeys/{journeyId}/expenses
Authorization: Bearer {token}
Content-Type: application/json

{
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
}
```

### 3. 更新支出

```typescript
PATCH /api/v1/journeys/{journeyId}/expenses/{expenseId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "晚餐",
  "amount": 3000,
  "category": "餐饮"
}
```

### 4. 删除支出

```typescript
DELETE /api/v1/journeys/{journeyId}/expenses/{expenseId}
Authorization: Bearer {token}
```

### 5. 更新预算总额

```typescript
PATCH /api/v1/journeys/{journeyId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "totalCost": 50000
}
```

---

## 📊 数据结构

### Expense 实体

```typescript
interface Expense {
  id: string;                    // 支出ID（后端生成）
  title: string;                 // 支出标题/名称
  amount: number;                // 支出金额（> 0）
  currencyCode: string;          // 货币代码（ISO 4217）
  category?: '交通' | '住宿' | '餐饮' | '景点' | '购物' | '其他';
  location?: string;             // 位置/商家
  payerId?: string;              // 付款人ID
  payerName?: string;            // 付款人名称
  splitType?: 'none' | 'equal' | 'custom';  // 分摊方式
  splitDetails?: Record<string, number>;    // 自定义分摊详情
  date: string;                  // 支出日期（YYYY-MM-DD）
  notes?: string;                // 备注
  createdAt: string;             // 创建时间（ISO 8601）
  updatedAt: string;             // 更新时间（ISO 8601）
}
```

---

## 🔐 权限说明

- 所有接口都需要 JWT 认证
- 只有行程的创建者或成员可以：
  - 查看支出列表
  - 创建支出
  - 更新支出
  - 删除支出

---

## ✅ 数据验证规则

1. **金额验证**：`amount` 必须 > 0
2. **日期格式**：`date` 必须是 YYYY-MM-DD 格式
3. **分摊验证**：
   - 当 `splitType='custom'` 时，必须提供 `splitDetails`
   - `splitDetails` 的总和必须等于 `amount`
4. **分类验证**：`category` 必须是预定义的值之一

---

## 🎯 使用场景示例

### 场景1：创建一笔支出并平均分摊

```typescript
const expense = {
  title: "酒店住宿",
  amount: 15000,
  currencyCode: "ISK",
  category: "住宿",
  location: "雷克雅未克市中心酒店",
  payerId: "user_001",
  payerName: "张三",
  splitType: "equal",  // 平均分摊
  date: "2025-11-25",
  notes: "两晚住宿"
};

await fetch(`/api/v1/journeys/${journeyId}/expenses`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(expense)
});
```

### 场景2：创建一笔支出并自定义分摊

```typescript
const expense = {
  title: "租车费用",
  amount: 25000,
  currencyCode: "ISK",
  category: "交通",
  payerId: "user_001",
  payerName: "张三",
  splitType: "custom",
  splitDetails: {
    "member_1": 10000,
    "member_2": 15000
  },
  date: "2025-11-25"
};
```

### 场景3：按分类筛选支出

```typescript
const expenses = await fetch(
  `/api/v1/journeys/${journeyId}/expenses?category=餐饮&startDate=2025-11-25&endDate=2025-11-30`,
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
).then(res => res.json());

console.log(`餐饮总支出: ${expenses.total}`);
```

---

## 📝 注意事项

1. **货币处理**：支出可以使用不同货币，前端需要处理货币转换（如果需要统一显示）
2. **分摊计算**：分摊详情的总和必须等于支出金额
3. **日期筛选**：支持按日期范围筛选，使用 `>= startDate` 和 `<= endDate` 的逻辑
4. **总金额计算**：`total` 字段是所有筛选后支出的总和

---

## 🔄 数据流程

### 创建支出流程

```
用户填写支出表单
  ↓
调用 POST /api/v1/journeys/{journeyId}/expenses
  ↓
后端验证数据（金额、分摊详情等）
  ↓
保存支出记录到数据库
  ↓
返回创建的支出数据
  ↓
前端更新本地状态和UI
```

### 更新预算流程

```
用户修改预算总额
  ↓
调用 PATCH /api/v1/journeys/{journeyId} (更新 totalCost)
  ↓
后端更新行程预算
  ↓
返回更新后的行程数据
  ↓
前端更新本地状态和UI
```

---

## 📚 相关文档

- [接口完成情况检查.md](./接口完成情况检查.md)
- [journey-api-33-get-expenses.md](./journey-api-33-get-expenses.md)
- [journey-api-34-create-expense.md](./journey-api-34-create-expense.md)
- [journey-api-35-update-expense.md](./journey-api-35-update-expense.md)
- [journey-api-36-delete-expense.md](./journey-api-36-delete-expense.md)

---

## 🛠️ 数据库迁移

要使用这些接口，需要先运行数据库迁移创建 `itinerary_expenses` 表：

```bash
npm run migration:run
```

或者，如果表还不存在，可以使用同步模式（仅开发环境）：

```bash
npm run db:init
```

---

## ✨ 功能特性

✅ 支持多种货币（currencyCode）
✅ 支持支出分类（6种分类）
✅ 支持分摊方式（none、equal、custom）
✅ 支持按分类、日期范围、付款人筛选
✅ 自动计算总支出金额
✅ 完整的权限控制
✅ 数据验证和错误处理

---

## 🎉 完成状态

所有预算管理接口已完全实现并通过测试：

- ✅ 实体和数据库表结构
- ✅ Repository 层方法
- ✅ Service 层业务逻辑
- ✅ Controller 层路由
- ✅ DTO 和验证
- ✅ API 文档
- ✅ 数据库迁移文件

接口已就绪，可以开始使用了！

