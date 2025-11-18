# 数据库连接问题修复

## 问题诊断

### 错误信息
```
Error: getaddrinfo ENOTFOUND base
Unable to connect to the database. Retrying (1)...
```

### 根本原因

`.env` 文件中的 `DATABASE_URL` 配置有误：

**错误配置**:
```env
DATABASE_URL=DATABASE_URL=postgresql://postgres:jnppwm76@tripnara-db-postgresql.ns-50nmw0i7.svc:5432
```

**问题**:
1. ❌ 重复了 `DATABASE_URL=` 前缀
2. ❌ 缺少数据库名称（连接到默认的 `postgres` 数据库）

**正确配置**:
```env
DATABASE_URL=postgresql://postgres:jnppwm76@tripnara-db-postgresql.ns-50nmw0i7.svc:5432/database_name
```

## 修复步骤

### 1. 修复 .env 文件

```bash
# 移除重复的 DATABASE_URL= 前缀
sed -i 's/^DATABASE_URL=DATABASE_URL=/DATABASE_URL=/' .env

# 验证修复
grep "^DATABASE_URL" .env
```

### 2. 添加数据库名称（如果需要）

如果您的应用需要使用特定的数据库，请在连接字符串末尾添加数据库名称：

```bash
# 编辑 .env 文件
DATABASE_URL=postgresql://postgres:jnppwm76@tripnara-db-postgresql.ns-50nmw0i7.svc:5432/tripmind
```

### 3. 测试连接

```bash
# 运行数据库连接测试
npm run db:test
```

## 测试结果

✅ **连接成功！**

```
✅ 数据库连接成功! (耗时: 42ms)
✅ 查询成功:
   PostgreSQL 版本: PostgreSQL 14.17
   当前数据库: postgres
   当前用户: postgres
✅ 找到 52 个表
```

## 当前配置

- **主机**: `tripnara-db-postgresql.ns-50nmw0i7.svc`
- **端口**: `5432`
- **用户**: `postgres`
- **数据库**: `postgres` (默认数据库)

## 建议

### 1. 使用专用数据库

如果应用需要独立的数据库，建议创建专用数据库：

```sql
-- 连接到 PostgreSQL
psql -U postgres -h tripnara-db-postgresql.ns-50nmw0i7.svc

-- 创建数据库
CREATE DATABASE tripmind;

-- 更新 .env
DATABASE_URL=postgresql://postgres:jnppwm76@tripnara-db-postgresql.ns-50nmw0i7.svc:5432/tripmind
```

### 2. 验证环境变量

```bash
# 检查环境变量是否正确加载
npm run db:test

# 或者在应用启动时检查
npm run start:dev
```

### 3. 检查网络连接

如果仍然遇到连接问题，检查：

```bash
# 测试网络连接
ping tripnara-db-postgresql.ns-50nmw0i7.svc

# 测试端口
telnet tripnara-db-postgresql.ns-50nmw0i7.svc 5432
```

## 相关命令

```bash
# 测试数据库连接
npm run db:test

# 初始化数据库（创建表结构）
npm run db:init

# 运行数据库迁移
npm run migration:run
```

## 注意事项

- ⚠️ `.env` 文件不应提交到版本控制系统
- ⚠️ 生产环境应使用环境变量或密钥管理服务
- ✅ 连接字符串中的密码会被自动隐藏（显示为 `***`）
- ✅ 测试脚本不会修改数据库结构

