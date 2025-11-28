# 货币和国家代码数据导入指南

## 概述

本指南说明如何将代码中硬编码的货币和国家代码数据导入到数据库中。

## 前提条件

1. 数据库已创建并运行
2. 已运行数据库迁移（创建 `currencies` 和 `country_currency_mappings` 表）
3. 环境变量已正确配置（`DATABASE_URL`）

## 运行导入脚本

### 方法一：使用 npm 脚本（推荐）

```bash
npm run seed:currency
```

### 方法二：直接运行 TypeScript 文件

```bash
npx ts-node --transpile-only scripts/seed-currency-data.ts
```

## 导入内容

脚本会导入以下数据：

### 1. 货币数据（currencies 表）

从 `COUNTRY_CURRENCY_MAP` 中提取所有唯一的货币，包括：
- 货币代码（如：CNY, USD, EUR）
- 货币符号（如：¥, $, €）
- 中文名称（如：人民币、美元、欧元）
- 英文名称（如：CNY, USD, EUR）

**预计导入数量：** 约 30-40 个唯一货币

### 2. 国家货币映射数据（country_currency_mappings 表）

从 `COUNTRY_CURRENCY_MAP` 和 `COUNTRY_NAME_TO_CODE` 中创建国家代码与货币的映射关系，包括：
- 国家代码（ISO 3166-1 alpha-2，如：CN, US, GB）
- 对应的货币ID和货币代码
- 国家名称映射（中文和英文名称列表）

**预计导入数量：** 约 50+ 个国家映射

## 脚本特性

1. **幂等性**：脚本可以安全地多次运行，已存在的数据会被跳过
2. **自动去重**：相同货币代码只会创建一次
3. **国家名称映射**：自动从 `COUNTRY_NAME_TO_CODE` 构建国家名称映射
4. **详细日志**：显示每个创建/跳过的记录

## 输出示例

```
开始导入货币和国家代码数据...

开始导入 35 个货币...
  ✓ 创建货币: CNY - 人民币
  ✓ 创建货币: JPY - 日元
  ✓ 创建货币: USD - 美元
  ...
货币导入完成: 创建 35 个, 跳过 0 个

开始导入 50 个国家货币映射...
  ✓ 创建映射: CN -> CNY (人民币)
  ✓ 创建映射: US -> USD (美元)
  ...
国家货币映射导入完成: 创建 50 个, 跳过 0 个

✅ 数据导入完成！
提示: 如果 CurrencyService 正在运行，请重启服务以刷新缓存。
```

## 注意事项

1. **首次运行**：如果是首次导入，所有数据都会被创建
2. **重复运行**：如果数据已存在，脚本会跳过已存在的记录，只创建新数据
3. **缓存刷新**：导入完成后，如果 `CurrencyService` 正在运行，需要重启服务以刷新内存缓存
4. **数据来源**：数据来自 `src/modules/currency/currency.service.ts` 中的硬编码常量

## 验证导入结果

导入完成后，可以通过以下方式验证：

### 1. 查询货币数量

```sql
SELECT COUNT(*) FROM currencies;
-- 应该返回约 30-40 条记录
```

### 2. 查询国家映射数量

```sql
SELECT COUNT(*) FROM country_currency_mappings;
-- 应该返回约 50+ 条记录
```

### 3. 查看具体数据

```sql
-- 查看所有货币
SELECT code, symbol, "nameZh", "nameEn" FROM currencies ORDER BY code;

-- 查看所有国家映射
SELECT "countryCode", "currencyCode" FROM country_currency_mappings ORDER BY "countryCode";
```

### 4. 通过 API 验证

```bash
# 获取货币列表
curl http://localhost:3000/api/v1/admin/currency/currencies

# 获取国家映射列表
curl http://localhost:3000/api/v1/admin/currency/country-mappings
```

## 故障排除

### 问题1：表不存在

**错误信息**：`relation "currencies" does not exist`

**解决方法**：
```bash
npm run migration:run
```

### 问题2：数据库连接失败

**错误信息**：`ECONNREFUSED` 或连接超时

**解决方法**：
1. 检查数据库是否运行
2. 检查 `DATABASE_URL` 环境变量是否正确
3. 检查数据库连接权限

### 问题3：数据已存在但想重新导入

**解决方法**：
1. 手动删除数据（谨慎操作）：
```sql
DELETE FROM country_currency_mappings;
DELETE FROM currencies;
```
2. 重新运行导入脚本

## 更新数据

如果需要更新数据：

1. **通过管理接口更新**（推荐）：
   - 使用 `PUT /api/v1/admin/currency/currencies/:id` 更新货币
   - 使用 `PUT /api/v1/admin/currency/country-mappings/:id` 更新映射

2. **直接修改数据库**：
   - 修改后需要重启服务以刷新 `CurrencyService` 缓存

3. **重新运行导入脚本**：
   - 脚本会跳过已存在的记录，只创建新数据

## 相关文件

- **导入脚本**：`scripts/seed-currency-data.ts`
- **数据源**：`src/modules/currency/currency.service.ts`（硬编码常量）
- **数据库实体**：`src/modules/persistence/entities/reference.entity.ts`
- **迁移文件**：`src/migrations/20250129000000-create-currency-tables.ts`

