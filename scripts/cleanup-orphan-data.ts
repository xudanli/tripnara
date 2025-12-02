#!/usr/bin/env ts-node
/**
 * 清理数据库中的孤儿数据
 * 
 * 用途：修复由于字段冲突（itineraryId vs itinerary_id）导致的 NULL 值问题
 * 
 * 运行方式：
 *   npm run cleanup:orphan-data
 *   或
 *   ts-node --transpile-only scripts/cleanup-orphan-data.ts
 */

import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// 加载环境变量
config();

async function cleanupOrphanData() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'tripmind',
    logging: false,
  });

  try {
    console.log('Connecting to database...');
    await dataSource.initialize();
    console.log('✅ Database connected successfully');

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // 1. 检查并清理 itinerary_days 表中的孤儿数据
      console.log('\n📋 Checking itinerary_days table...');
      const orphanDaysResult = await queryRunner.query(`
        SELECT COUNT(*) as count 
        FROM itinerary_days 
        WHERE itinerary_id IS NULL
      `);
      const orphanDaysCount = parseInt(orphanDaysResult[0].count, 10);
      
      if (orphanDaysCount > 0) {
        console.log(`⚠️  Found ${orphanDaysCount} orphan days (itinerary_id IS NULL)`);
        console.log('🗑️  Deleting orphan days...');
        
        const deleteDaysResult = await queryRunner.query(`
          DELETE FROM itinerary_days 
          WHERE itinerary_id IS NULL
          RETURNING id
        `);
        const deletedCount = Array.isArray(deleteDaysResult) ? deleteDaysResult.length : 0;
        console.log(`✅ Deleted ${deletedCount} orphan days`);
      } else {
        console.log('✅ No orphan days found');
      }

      // 2. 检查并清理 itinerary_activities 表中的孤儿数据
      console.log('\n📋 Checking itinerary_activities table...');
      const orphanActivitiesResult = await queryRunner.query(`
        SELECT COUNT(*) as count 
        FROM itinerary_activities 
        WHERE day_id IS NULL
      `);
      const orphanActivitiesCount = parseInt(orphanActivitiesResult[0].count, 10);
      
      if (orphanActivitiesCount > 0) {
        console.log(`⚠️  Found ${orphanActivitiesCount} orphan activities (day_id IS NULL)`);
        console.log('🗑️  Deleting orphan activities...');
        
        const deleteActivitiesResult = await queryRunner.query(`
          DELETE FROM itinerary_activities 
          WHERE day_id IS NULL
          RETURNING id
        `);
        const deletedCount = Array.isArray(deleteActivitiesResult) ? deleteActivitiesResult.length : 0;
        console.log(`✅ Deleted ${deletedCount} orphan activities`);
      } else {
        console.log('✅ No orphan activities found');
      }

      // 3. 检查并清理 itinerary_expenses 表中的孤儿数据
      console.log('\n📋 Checking itinerary_expenses table...');
      const orphanExpensesResult = await queryRunner.query(`
        SELECT COUNT(*) as count 
        FROM itinerary_expenses 
        WHERE itinerary_id IS NULL
      `);
      const orphanExpensesCount = parseInt(orphanExpensesResult[0].count, 10);
      
      if (orphanExpensesCount > 0) {
        console.log(`⚠️  Found ${orphanExpensesCount} orphan expenses (itinerary_id IS NULL)`);
        console.log('🗑️  Deleting orphan expenses...');
        
        const deleteExpensesResult = await queryRunner.query(`
          DELETE FROM itinerary_expenses 
          WHERE itinerary_id IS NULL
          RETURNING id
        `);
        const deletedCount = Array.isArray(deleteExpensesResult) ? deleteExpensesResult.length : 0;
        console.log(`✅ Deleted ${deletedCount} orphan expenses`);
      } else {
        console.log('✅ No orphan expenses found');
      }

      // 4. 验证清理结果
      console.log('\n🔍 Verifying cleanup results...');
      const remainingOrphanDays = await queryRunner.query(`
        SELECT COUNT(*) as count 
        FROM itinerary_days 
        WHERE itinerary_id IS NULL
      `);
      const remainingOrphanActivities = await queryRunner.query(`
        SELECT COUNT(*) as count 
        FROM itinerary_activities 
        WHERE day_id IS NULL
      `);
      const remainingOrphanExpenses = await queryRunner.query(`
        SELECT COUNT(*) as count 
        FROM itinerary_expenses 
        WHERE itinerary_id IS NULL
      `);

      const totalRemaining = 
        parseInt(remainingOrphanDays[0].count, 10) +
        parseInt(remainingOrphanActivities[0].count, 10) +
        parseInt(remainingOrphanExpenses[0].count, 10);

      if (totalRemaining === 0) {
        console.log('✅ All orphan data cleaned up successfully!');
        console.log('\n📝 Next steps:');
        console.log('   1. Restart your NestJS server');
        console.log('   2. TypeORM should now be able to apply the NOT NULL constraint');
      } else {
        console.log('⚠️  Some orphan data still remains:');
        console.log(`   - Orphan days: ${remainingOrphanDays[0].count}`);
        console.log(`   - Orphan activities: ${remainingOrphanActivities[0].count}`);
        console.log(`   - Orphan expenses: ${remainingOrphanExpenses[0].count}`);
      }

    } finally {
      await queryRunner.release();
    }

    await dataSource.destroy();
    console.log('\n✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error cleaning up orphan data:', error);
    process.exit(1);
  }
}

// 运行清理脚本
cleanupOrphanData()
  .then(() => {
    console.log('\n✨ Cleanup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

