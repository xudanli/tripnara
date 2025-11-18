import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { validateEnv } from '../src/config/env.validation';
import { TYPEORM_ENTITIES } from '../src/config/typeorm.entities';

/**
 * 数据库连接测试脚本
 * 
 * 使用方法:
 *   DATABASE_URL="postgresql://user:password@host:port/database" npx ts-node scripts/test-db-connection.ts
 * 
 * 或者设置环境变量后运行:
 *   export DATABASE_URL="postgresql://user:password@host:port/database"
 *   npx ts-node scripts/test-db-connection.ts
 */

async function testDatabaseConnection() {
  console.log('🔍 开始测试数据库连接...\n');

  // 初始化配置模块
  ConfigModule.forRoot({
    isGlobal: true,
    cache: false,
    validate: validateEnv,
  });

  const configService = new ConfigService();
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const isTest = nodeEnv === 'test';

  // 获取数据库URL
  const databaseUrl = configService.get<string>('DATABASE_URL');

  if (!databaseUrl) {
    console.error('❌ 错误: DATABASE_URL 环境变量未设置');
    console.log('\n请设置 DATABASE_URL 环境变量，格式:');
    console.log('  postgresql://username:password@host:port/database');
    console.log('\n示例:');
    console.log('  export DATABASE_URL="postgresql://postgres:password@localhost:5432/tripmind"');
    console.log('  npx ts-node scripts/test-db-connection.ts');
    process.exit(1);
  }

  // 解析数据库URL（隐藏密码）
  try {
    // 处理 postgres:// 和 postgresql:// 两种格式
    const normalizedUrl = databaseUrl.startsWith('postgres://') 
      ? databaseUrl.replace('postgres://', 'postgresql://')
      : databaseUrl;
    
    const url = new URL(normalizedUrl);
    const maskedUrl = `${url.protocol}//${url.username}:***@${url.hostname}${url.port ? ':' + url.port : ''}${url.pathname}`;
    console.log(`📊 数据库配置:`);
    console.log(`   环境: ${nodeEnv}`);
    console.log(`   连接字符串: ${maskedUrl}`);
    console.log(`   实体数量: ${TYPEORM_ENTITIES.length}`);
    console.log('');
  } catch (error) {
    console.error('❌ 错误: DATABASE_URL 格式不正确');
    console.error(`   当前值: ${databaseUrl.substring(0, 50)}...`);
    console.error('   期望格式: postgresql://username:password@host:port/database');
    console.error('   或: postgres://username:password@host:port/database');
    process.exit(1);
  }

  // 创建数据源
  const dataSource = new DataSource(
    isTest
      ? {
          type: 'sqlite' as const,
          database: ':memory:',
          entities: TYPEORM_ENTITIES,
          synchronize: true,
          logging: false,
        }
      : {
          type: 'postgres' as const,
          url: databaseUrl.startsWith('postgres://') 
            ? databaseUrl.replace('postgres://', 'postgresql://')
            : databaseUrl,
          entities: TYPEORM_ENTITIES,
          synchronize: false,
          logging: false,
          connectTimeoutMS: 10000,
        },
  );

  try {
    console.log('⏳ 正在连接数据库...');
    const startTime = Date.now();
    
    await dataSource.initialize();
    
    const connectionTime = Date.now() - startTime;
    console.log(`✅ 数据库连接成功! (耗时: ${connectionTime}ms)\n`);

    // 测试查询
    console.log('📝 执行测试查询...');
    const result = await dataSource.query('SELECT version() as version, current_database() as database, current_user as user');
    
    if (result && result.length > 0) {
      console.log('✅ 查询成功:');
      console.log(`   PostgreSQL 版本: ${result[0].version}`);
      console.log(`   当前数据库: ${result[0].database}`);
      console.log(`   当前用户: ${result[0].user}`);
    }

    // 检查表是否存在
    console.log('\n📋 检查数据库表...');
    const tables = await dataSource.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    if (tables.length > 0) {
      console.log(`✅ 找到 ${tables.length} 个表:`);
      tables.slice(0, 10).forEach((table: { table_name: string }) => {
        console.log(`   - ${table.table_name}`);
      });
      if (tables.length > 10) {
        console.log(`   ... 还有 ${tables.length - 10} 个表`);
      }
    } else {
      console.log('⚠️  数据库中没有表（可能需要运行迁移）');
    }

    console.log('\n✅ 数据库连接测试完成!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ 数据库连接失败!\n');
    
    if (error instanceof Error) {
      console.error(`错误类型: ${error.constructor.name}`);
      console.error(`错误消息: ${error.message}\n`);
      
      // 提供常见错误的解决建议
      if (error.message.includes('ENOTFOUND')) {
        console.error('💡 解决建议:');
        console.error('   - 检查数据库主机名是否正确');
        console.error('   - 确认数据库服务是否正在运行');
        console.error('   - 检查网络连接');
      } else if (error.message.includes('authentication failed')) {
        console.error('💡 解决建议:');
        console.error('   - 检查用户名和密码是否正确');
        console.error('   - 确认用户是否有访问数据库的权限');
      } else if (error.message.includes('does not exist')) {
        console.error('💡 解决建议:');
        console.error('   - 检查数据库名称是否正确');
        console.error('   - 确认数据库是否已创建');
      } else if (error.message.includes('ECONNREFUSED')) {
        console.error('💡 解决建议:');
        console.error('   - 检查数据库端口是否正确');
        console.error('   - 确认数据库服务是否正在运行');
        console.error('   - 检查防火墙设置');
      } else if (error.message.includes('timeout')) {
        console.error('💡 解决建议:');
        console.error('   - 检查网络连接');
        console.error('   - 确认数据库服务是否可访问');
        console.error('   - 检查防火墙和代理设置');
      }
    } else {
      console.error('未知错误:', error);
    }
    
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 运行测试
testDatabaseConnection().catch((error) => {
  console.error('未处理的错误:', error);
  process.exit(1);
});

