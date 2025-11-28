import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { readFileSync } from 'fs';
import { join } from 'path';
import { AppModule } from '../src/app.module';
import { CurrencyAdminService } from '../src/modules/currency/currency-admin.service';

/**
 * 从 JSON 文件批量导入所有货币
 */
async function importAllCurrencies() {
  console.log('开始导入所有货币数据...\n');

  // 读取 JSON 文件
  const filePath = join(process.cwd(), 'data', 'all-currencies.json');
  let fileContent: string;
  try {
    fileContent = readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`❌ 无法读取文件: ${filePath}`);
    console.error('请先运行: npm run generate:all-currencies');
    process.exit(1);
  }

  let data: { currencies: Array<{ code: string; symbol: string; nameZh: string; nameEn: string }> };
  try {
    data = JSON.parse(fileContent);
  } catch (error) {
    console.error('❌ JSON 文件格式错误:', error);
    process.exit(1);
  }

  if (!data.currencies || !Array.isArray(data.currencies)) {
    console.error('❌ JSON 文件格式不正确，应包含 currencies 数组');
    process.exit(1);
  }

  console.log(`📦 准备导入 ${data.currencies.length} 个货币\n`);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const adminService = app.get(CurrencyAdminService);

    let created = 0;
    let skipped = 0;
    let failed = 0;

    // 逐个创建货币（因为需要检查是否已存在）
    for (const currency of data.currencies) {
      try {
        const result = await adminService.createCurrency({
          code: currency.code,
          symbol: currency.symbol,
          nameZh: currency.nameZh,
          nameEn: currency.nameEn,
          isActive: true,
        });

        if (result.success) {
          created++;
          if (created % 10 === 0) {
            process.stdout.write(`\r   已处理: ${created + skipped + failed}/${data.currencies.length}`);
          }
        }
      } catch (error: any) {
        if (error?.status === 409 || error?.message?.includes('已存在')) {
          skipped++;
        } else {
          failed++;
          console.error(`\n❌ 创建货币失败 ${currency.code}:`, error.message);
        }
      }
    }

    console.log('\n\n✅ 导入完成！\n');
    console.log(`📊 统计:`);
    console.log(`   ✅ 成功创建: ${created} 个`);
    console.log(`   ⏭️  跳过（已存在）: ${skipped} 个`);
    console.log(`   ❌ 失败: ${failed} 个`);

    if (created > 0) {
      console.log('\n💡 提示: CurrencyService 缓存已自动刷新');
    }
  } catch (error) {
    console.error('❌ 导入失败:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

importAllCurrencies().catch((error) => {
  console.error('未处理的错误:', error);
  process.exit(1);
});

