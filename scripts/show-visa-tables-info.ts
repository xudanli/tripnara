import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const dataSource = app.get(DataSource);
    
    console.log('='.repeat(60));
    console.log('签证相关表的位置信息');
    console.log('='.repeat(60));
    console.log('');

    // 获取数据库连接信息
    const dbInfo = await dataSource.query(`
      SELECT 
        current_database() as database_name,
        current_schema() as schema_name,
        inet_server_addr() as server_address,
        inet_server_port() as server_port
    `);
    
    console.log('📊 数据库连接信息:');
    console.log(`   数据库名: ${dbInfo[0].database_name}`);
    console.log(`   Schema: ${dbInfo[0].schema_name || 'public'}`);
    console.log(`   服务器: ${dbInfo[0].server_address || 'tripnara-db-postgresql.ns-50nmw0i7.svc'}`);
    console.log(`   端口: ${dbInfo[0].server_port || '5432'}`);
    console.log('');

    // 查询所有签证相关的表
    const visaTables = await dataSource.query(`
      SELECT 
        table_name,
        table_type,
        table_schema
      FROM information_schema.tables
      WHERE table_schema = 'public' 
        AND table_name LIKE 'visa_%'
      ORDER BY table_name
    `);

    console.log('📋 签证相关表列表:');
    console.log('');
    
    if (visaTables.length === 0) {
      console.log('   ⚠️  未找到签证相关的表');
    } else {
      for (const table of visaTables) {
        console.log(`   ✅ ${table.table_name}`);
        console.log(`      Schema: ${table.table_schema}`);
        console.log(`      类型: ${table.table_type}`);
        
        // 获取表的行数
        const countResult = await dataSource.query(
          `SELECT COUNT(*) as count FROM "${table.table_name}"`
        );
        console.log(`      记录数: ${countResult[0].count}`);
        
        // 获取表的列信息
        const columns = await dataSource.query(`
          SELECT 
            column_name,
            data_type,
            is_nullable
          FROM information_schema.columns
          WHERE table_schema = 'public' 
            AND table_name = $1
          ORDER BY ordinal_position
        `, [table.table_name]);
        
        console.log(`      列数: ${columns.length}`);
        console.log('');
      }
    }

    console.log('='.repeat(60));
    console.log('💡 如何访问这些表:');
    console.log('');
    console.log('1. 使用 PostgreSQL 客户端工具:');
    console.log('   - 连接到: tripnara-db-postgresql.ns-50nmw0i7.svc:5432');
    console.log('   - 数据库: tripnaradb');
    console.log('   - Schema: public');
    console.log('');
    console.log('2. 使用 SQL 查询:');
    console.log('   SELECT * FROM visa_policies LIMIT 10;');
    console.log('   SELECT * FROM visa_unions;');
    console.log('   SELECT * FROM visa_union_countries;');
    console.log('   SELECT * FROM visa_policy_history;');
    console.log('');
    console.log('3. 使用 API 访问:');
    console.log('   GET http://localhost:3000/api/visa/admin/policies');
    console.log('   GET http://localhost:3000/api/visa/info?destinationCountry=JP&nationalityCode=CN');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ 查询失败:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void main();

