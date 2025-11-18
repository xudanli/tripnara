# 数据库连接测试指南

## 快速开始

### 方法1: 使用 npm 脚本（推荐）

```bash
# 设置环境变量
export DATABASE_URL="postgresql://username:password@host:port/database"

# 运行测试
npm run db:test
```

### 方法2: 直接运行脚本

```bash
# 设置环境变量
export DATABASE_URL="postgresql://username:password@host:port/database"

# 运行测试
npx ts-node scripts/test-db-connection.ts
```

### 方法3: 一行命令

```bash
DATABASE_URL="postgresql://username:password@host:port/database" npm run db:test
```

## 连接字符串格式

### PostgreSQL 标准格式

```
postgresql://username:password@host:port/database
```

### 示例

```bash
# 本地数据库
postgresql://postgres:password@localhost:5432/tripmind

# 远程数据库
postgresql://user:pass@db.example.com:5432/tripmind

# 带SSL
postgresql://user:pass@host:5432/db?sslmode=require

# 使用 postgres:// 前缀（会自动转换）
postgres://user:pass@host:5432/db
```

## 测试内容

脚本会执行以下测试：

1. ✅ **环境变量检查** - 验证 DATABASE_URL 是否设置
2. ✅ **连接格式验证** - 检查连接字符串格式
3. ✅ **数据库连接** - 尝试建立连接
4. ✅ **版本查询** - 获取 PostgreSQL 版本信息
5. ✅ **表列表** - 列出数据库中的所有表

## 输出示例

### 成功连接

```
🔍 开始测试数据库连接...

📊 数据库配置:
   环境: development
   连接字符串: postgresql://postgres:***@localhost:5432/tripmind
   实体数量: 15

⏳ 正在连接数据库...
✅ 数据库连接成功! (耗时: 45ms)

📝 执行测试查询...
✅ 查询成功:
   PostgreSQL 版本: PostgreSQL 15.2
   当前数据库: tripmind
   当前用户: postgres

📋 检查数据库表...
✅ 找到 12 个表:
   - journeys
   - journey_days
   - journey_time_slots
   - user_preferences
   ...

✅ 数据库连接测试完成!

🔌 数据库连接已关闭
```

### 连接失败

```
🔍 开始测试数据库连接...

📊 数据库配置:
   环境: development
   连接字符串: postgresql://postgres:***@localhost:5432/tripmind
   实体数量: 15

⏳ 正在连接数据库...

❌ 数据库连接失败!

错误类型: Error
错误消息: connect ECONNREFUSED 127.0.0.1:5432

💡 解决建议:
   - 检查数据库端口是否正确
   - 确认数据库服务是否正在运行
   - 检查防火墙设置
```

## 常见错误及解决方案

### 1. ENOTFOUND 错误

**错误信息**: `getaddrinfo ENOTFOUND hostname`

**原因**: 无法解析数据库主机名

**解决方案**:
- 检查主机名是否正确
- 确认网络连接正常
- 检查 DNS 配置

### 2. ECONNREFUSED 错误

**错误信息**: `connect ECONNREFUSED 127.0.0.1:5432`

**原因**: 数据库服务未运行或端口不正确

**解决方案**:
```bash
# 检查 PostgreSQL 服务状态
sudo systemctl status postgresql

# 启动 PostgreSQL 服务
sudo systemctl start postgresql

# 检查端口是否被占用
netstat -tuln | grep 5432
```

### 3. 认证失败

**错误信息**: `password authentication failed`

**原因**: 用户名或密码错误

**解决方案**:
- 验证用户名和密码
- 检查 PostgreSQL 的 `pg_hba.conf` 配置
- 确认用户有访问数据库的权限

### 4. 数据库不存在

**错误信息**: `database "xxx" does not exist`

**原因**: 指定的数据库不存在

**解决方案**:
```bash
# 连接到 PostgreSQL
psql -U postgres

# 创建数据库
CREATE DATABASE tripmind;

# 或者使用命令行
createdb -U postgres tripmind
```

### 5. 连接超时

**错误信息**: `timeout` 或 `ETIMEDOUT`

**原因**: 网络问题或防火墙阻止

**解决方案**:
- 检查网络连接
- 确认防火墙规则
- 检查代理设置
- 增加超时时间（脚本默认10秒）

## 环境变量配置

### 开发环境

创建 `.env` 文件：

```env
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/tripmind
```

### 测试环境

```env
NODE_ENV=test
# 测试环境使用内存数据库，不需要 DATABASE_URL
```

### 生产环境

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-db.example.com:5432/tripmind?sslmode=require
```

## 相关命令

```bash
# 初始化数据库（创建表结构）
npm run db:init

# 运行数据库迁移
npm run migration:run

# 回滚迁移
npm run migration:revert

# 生成新迁移
npm run migration:generate -- -n MigrationName
```

## 故障排查步骤

1. **检查环境变量**
   ```bash
   echo $DATABASE_URL
   ```

2. **测试网络连接**
   ```bash
   # 如果使用远程数据库
   ping db-hostname
   telnet db-hostname 5432
   ```

3. **验证 PostgreSQL 服务**
   ```bash
   # Linux
   sudo systemctl status postgresql
   
   # macOS
   brew services list | grep postgresql
   ```

4. **检查数据库权限**
   ```bash
   psql -U postgres -c "\du"
   ```

5. **查看详细日志**
   ```bash
   # 启用详细日志
   DATABASE_URL="..." npm run db:test
   ```

## 注意事项

- ⚠️ 脚本不会修改数据库结构，只进行只读查询
- ⚠️ 密码会在输出中被隐藏（显示为 `***`）
- ⚠️ 测试环境会自动使用内存数据库，无需配置 DATABASE_URL
- ✅ 连接超时设置为 10 秒
- ✅ 支持 `postgres://` 和 `postgresql://` 两种协议前缀

