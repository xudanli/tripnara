-- 查询签证相关表的 SQL 脚本
-- 可以直接在 PostgreSQL 客户端中执行

-- 1. 查看所有签证相关的表
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name LIKE 'visa_%'
ORDER BY table_name;

-- 2. 查看 visa_policies 表结构
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'visa_policies'
ORDER BY ordinal_position;

-- 3. 查看 visa_unions 表结构
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'visa_unions'
ORDER BY ordinal_position;

-- 4. 查看 visa_union_countries 表结构
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'visa_union_countries'
ORDER BY ordinal_position;

-- 5. 查看 visa_policy_history 表结构
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'visa_policy_history'
ORDER BY ordinal_position;

-- 6. 查看所有表的数据量
SELECT 
    'visa_policies' as table_name,
    COUNT(*) as row_count
FROM visa_policies
UNION ALL
SELECT 
    'visa_unions' as table_name,
    COUNT(*) as row_count
FROM visa_unions
UNION ALL
SELECT 
    'visa_union_countries' as table_name,
    COUNT(*) as row_count
FROM visa_union_countries
UNION ALL
SELECT 
    'visa_policy_history' as table_name,
    COUNT(*) as row_count
FROM visa_policy_history;

