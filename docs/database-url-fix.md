# DATABASE_URL 配置错误分析

## 您提供的配置

```env
DATABASE_URL=postgresql://postgres:jnppwm76@triprana-db-postgresql.ns-50nmw0i7.svc:5432/triprana
```

## 发现的错误

### ❌ 错误 1: 主机名拼写错误

**错误**: `triprana-db-postgresql`  
**正确**: `tripnara-db-postgresql` (少了一个 'n')

**验证**:
- `triprana-db-postgresql` → `getaddrinfo ENOTFOUND` (无法解析主机名)
- `tripnara-db-postgresql` → 可以连接

### ❌ 错误 2: 数据库名称可能不存在

**测试结果**:
- `tripnara` 数据库 → `database "tripnara" does not exist`
- `triprana` 数据库 → `database "triprana" does not exist`

## 正确的配置

### 选项 1: 使用默认 postgres 数据库（推荐用于测试）

```env
DATABASE_URL=postgresql://postgres:jnppwm76@tripnara-db-postgresql.ns-50nmw0i7.svc:5432/postgres
```

或者不指定数据库名（连接到默认数据库）：

```env
DATABASE_URL=postgresql://postgres:jnppwm76@tripnara-db-postgresql.ns-50nmw0i7.svc:5432
```

### 选项 2: 创建并使用专用数据库

```sql
-- 连接到 PostgreSQL
psql -U postgres -h tripnara-db-postgresql.ns-50nmw0i7.svc

-- 创建数据库
CREATE DATABASE tripmind;
-- 或
CREATE DATABASE tripnara;
```

然后使用：

```env
DATABASE_URL=postgresql://postgres:jnppwm76@tripnara-db-postgresql.ns-50nmw0i7.svc:5432/tripmind
```

## 修复步骤

### 1. 修正主机名拼写

```bash
# 将 triprana 改为 tripnara
sed -i 's/triprana-db-postgresql/tripnara-db-postgresql/g' .env
```

### 2. 检查数据库是否存在

```bash
# 测试连接（使用默认 postgres 数据库）
DATABASE_URL="postgresql://postgres:jnppwm76@tripnara-db-postgresql.ns-50nmw0i7.svc:5432/postgres" npm run db:test
```

### 3. 如果需要，创建数据库

```bash
# 连接到数据库服务器
psql -U postgres -h tripnara-db-postgresql.ns-50nmw0i7.svc

# 列出所有数据库
\l

# 创建新数据库（如果需要）
CREATE DATABASE your_database_name;
```

## 配置对比

| 配置项 | 您的配置 | 正确配置 | 说明 |
|--------|---------|---------|------|
| 主机名 | `triprana-db-postgresql` ❌ | `tripnara-db-postgresql` ✅ | 少了一个 'n' |
| 数据库名 | `triprana` ❓ | `postgres` 或已存在的数据库 ✅ | 需要确认是否存在 |

## 快速修复命令

```bash
# 修复主机名并测试连接
sed -i 's/triprana-db-postgresql/tripnara-db-postgresql/g' .env
sed -i 's|:5432/triprana|:5432/postgres|g' .env
npm run db:test
```

