-- 清理数据库中的孤儿数据
-- 
-- 用途：修复由于字段冲突（itineraryId vs itinerary_id）导致的 NULL 值问题
-- 
-- 使用方法：
--   1. 连接到数据库（使用 psql、pgAdmin 或其他工具）
--   2. 执行此 SQL 脚本
--   3. 重启 NestJS 服务器

-- 1. 检查孤儿数据数量
SELECT 
  'itinerary_days' as table_name,
  COUNT(*) as orphan_count
FROM itinerary_days 
WHERE itinerary_id IS NULL

UNION ALL

SELECT 
  'itinerary_activities' as table_name,
  COUNT(*) as orphan_count
FROM itinerary_activities 
WHERE day_id IS NULL

UNION ALL

SELECT 
  'itinerary_expenses' as table_name,
  COUNT(*) as orphan_count
FROM itinerary_expenses 
WHERE itinerary_id IS NULL;

-- 2. 删除孤儿数据（取消下面的注释以执行）
-- ⚠️ 警告：这将永久删除数据，请确保这是你想要的操作

-- DELETE FROM itinerary_activities WHERE day_id IS NULL;
-- DELETE FROM itinerary_days WHERE itinerary_id IS NULL;
-- DELETE FROM itinerary_expenses WHERE itinerary_id IS NULL;

-- 3. 验证清理结果
-- SELECT 
--   'itinerary_days' as table_name,
--   COUNT(*) as remaining_orphans
-- FROM itinerary_days 
-- WHERE itinerary_id IS NULL
-- 
-- UNION ALL
-- 
-- SELECT 
--   'itinerary_activities' as table_name,
--   COUNT(*) as remaining_orphans
-- FROM itinerary_activities 
-- WHERE day_id IS NULL
-- 
-- UNION ALL
-- 
-- SELECT 
--   'itinerary_expenses' as table_name,
--   COUNT(*) as remaining_orphans
-- FROM itinerary_expenses 
-- WHERE itinerary_id IS NULL;

