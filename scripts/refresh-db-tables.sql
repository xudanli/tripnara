-- 刷新数据库表列表的 SQL 查询
-- 在 chat2db 或其他数据库工具中执行这些查询来确认表的存在

-- 1. 查看所有 visa 相关的表
SELECT 
    table_schema,
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name LIKE 'visa_%'
ORDER BY table_name;

-- 2. 查看所有表（确认表确实存在）
SELECT 
    table_schema,
    table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 3. 查看 visa_policies 表的详细信息
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

-- 4. 查看 visa_unions 表的详细信息
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

-- 5. 查看 visa_union_countries 表的详细信息
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

-- 6. 查看 visa_policy_history 表的详细信息
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

