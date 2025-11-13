import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const dataSource = app.get(DataSource);
    
    // 检查表是否存在
    const tables = [
      'visa_policies',
      'visa_unions',
      'visa_union_countries',
      'visa_policy_history',
    ];

    console.log('检查签证相关表...\n');

    // 先列出所有表
    const allTables = await dataSource.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log('数据库中的所有表:');
    allTables.forEach((row: { table_name: string }) => {
      console.log(`  - ${row.table_name}`);
    });
    console.log('');

    for (const tableName of tables) {
      const result = await dataSource.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [tableName],
      );

      const exists = result[0].exists;
      const status = exists ? '✅ 已存在' : '❌ 不存在';
      console.log(`${status}: ${tableName}`);
      
      if (exists) {
        // 如果表存在，显示表结构
        const columns = await dataSource.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_schema = 'public' 
          AND table_name = $1
          ORDER BY ordinal_position
        `, [tableName]);
        
        console.log(`  列信息:`);
        columns.forEach((col: { column_name: string; data_type: string; is_nullable: string }) => {
          console.log(`    - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });
      }
    }

    // 如果表不存在，尝试同步
    const allTablesExist = await Promise.all(
      tables.map(async (tableName) => {
        const result = await dataSource.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )`,
          [tableName],
        );
        return result[0].exists;
      }),
    );

    if (!allTablesExist.every((exists) => exists)) {
      console.log('\n⚠️  部分表不存在，需要手动创建表');
      console.log('   可以运行: npx ts-node scripts/init-db.ts');
      console.log('   或者重启后端服务（如果 synchronize 为 true）');
    } else {
      console.log('\n✅ 所有表都已存在');
    }
  } catch (error) {
    console.error('❌ 检查失败:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void main();

