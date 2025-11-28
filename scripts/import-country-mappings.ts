import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { readFileSync } from 'fs';
import { join } from 'path';
import { AppModule } from '../src/app.module';
import { CurrencyAdminService } from '../src/modules/currency/currency-admin.service';

/**
 * 从 JSON 文件导入国家货币映射
 */
async function importCountryMappings() {
  console.log('开始导入国家货币映射数据...\n');

  // 读取 JSON 文件
  const filePath = join(process.cwd(), 'data', 'country-currency-mappings.json');
  let fileContent: string;
  try {
    fileContent = readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`❌ 无法读取文件: ${filePath}`);
    console.error('请先运行: npm run generate:country-mappings');
    process.exit(1);
  }

  let data: { mappings: Array<{ countryCode: string; currencyCode: string; countryNames?: any }> };
  try {
    data = JSON.parse(fileContent);
  } catch (error) {
    console.error('❌ JSON 文件格式错误:', error);
    process.exit(1);
  }

  if (!data.mappings || !Array.isArray(data.mappings)) {
    console.error('❌ JSON 文件格式不正确，应包含 mappings 数组');
    process.exit(1);
  }

  console.log(`📦 准备导入 ${data.mappings.length} 个国家货币映射\n`);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const adminService = app.get(CurrencyAdminService);

    // 使用批量导入接口（通过货币代码）
    const result = await adminService.batchCreateCountryCurrencyMappingsByCode({
      mappings: data.mappings,
    });

    console.log('\n✅ 导入完成！\n');
    console.log(`📊 统计:`);
    console.log(`   ✅ 成功创建: ${result.data.created} 个`);
    console.log(`   ⏭️  跳过（已存在）: ${result.data.skipped} 个`);
    console.log(`   ❌ 失败: ${result.data.failed} 个`);

    if (result.data.errors.length > 0) {
      console.log(`\n⚠️  失败详情:`);
      result.data.errors.forEach((error) => {
        console.log(`   - ${error.countryCode}: ${error.error}`);
      });
    }

    if (result.data.created > 0) {
      console.log('\n💡 提示: CurrencyService 缓存已自动刷新');
    }
  } catch (error) {
    console.error('❌ 导入失败:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

importCountryMappings().catch((error) => {
  console.error('未处理的错误:', error);
  process.exit(1);
});

