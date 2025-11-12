import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TemplateService } from '../src/modules/templates/template.service';
import { DataSource } from 'typeorm';
import { JourneyTemplateEntity } from '../src/modules/persistence/entities/journey-template.entity';

/**
 * 删除模板脚本
 * 
 * 使用方法：
 * 1. 通过模板 ID 删除：
 *    npx ts-node scripts/delete-template.ts --id <templateId>
 * 
 * 2. 通过模板标题删除：
 *    npx ts-node scripts/delete-template.ts --title "模板标题"
 * 
 * 3. 批量删除（在代码中修改 ids 或 titles 数组）：
 *    npx ts-node scripts/delete-template.ts --batch
 */

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const idIndex = args.indexOf('--id');
  const titleIndex = args.indexOf('--title');
  const batchIndex = args.indexOf('--batch');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const templateService = app.get(TemplateService);
    const dataSource = app.get(DataSource);
    const templateRepository = dataSource.getRepository(JourneyTemplateEntity);

    // 批量删除模式
    if (batchIndex !== -1) {
      // 在这里修改要删除的模板 ID 或标题
      const idsToDelete: string[] = [
        // 'template-id-1',
        // 'template-id-2',
      ];

      const titlesToDelete: string[] = [
        // '模板标题1',
        // '模板标题2',
      ];

      for (const id of idsToDelete) {
        try {
          await templateService.deleteTemplate(id);
          console.log(`✅ 已删除模板（ID）：${id}`);
        } catch (error) {
          console.error(`❌ 删除模板失败（ID: ${id}）：`, error.message);
        }
      }

      for (const title of titlesToDelete) {
        try {
          const template = await templateRepository.findOne({
            where: { title },
          });
          if (!template) {
            console.warn(`⚠️  未找到模板（标题）：${title}`);
            continue;
          }
          await templateService.deleteTemplate(template.id);
          console.log(`✅ 已删除模板（标题）：${title}`);
        } catch (error) {
          console.error(`❌ 删除模板失败（标题: ${title}）：`, error.message);
        }
      }

      return;
    }

    // 通过 ID 删除
    if (idIndex !== -1 && idIndex + 1 < args.length) {
      const templateId = args[idIndex + 1];
      try {
        await templateService.deleteTemplate(templateId);
        console.log(`✅ 已删除模板（ID）：${templateId}`);
      } catch (error) {
        console.error(`❌ 删除模板失败：`, error.message);
        process.exitCode = 1;
      }
      return;
    }

    // 通过标题删除
    if (titleIndex !== -1 && titleIndex + 1 < args.length) {
      const title = args[titleIndex + 1];
      try {
        const template = await templateRepository.findOne({
          where: { title },
        });
        if (!template) {
          console.error(`❌ 未找到模板：${title}`);
          process.exitCode = 1;
          return;
        }
        await templateService.deleteTemplate(template.id);
        console.log(`✅ 已删除模板（标题）：${title}`);
        console.log(`   模板 ID：${template.id}`);
      } catch (error) {
        console.error(`❌ 删除模板失败：`, error.message);
        process.exitCode = 1;
      }
      return;
    }

    // 显示帮助信息
    console.log(`
使用方法：
  通过 ID 删除：
    npx ts-node scripts/delete-template.ts --id <templateId>

  通过标题删除：
    npx ts-node scripts/delete-template.ts --title "模板标题"

  批量删除（需在代码中配置）：
    npx ts-node scripts/delete-template.ts --batch

示例：
    npx ts-node scripts/delete-template.ts --id f4473f3a-3390-41a6-bfb4-29ac1e9c19d3
    npx ts-node scripts/delete-template.ts --title "南极南美经典之旅（长线24天）"
    `);
    process.exitCode = 1;
  } catch (error) {
    console.error('❌ 删除模板失败：', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void main();

