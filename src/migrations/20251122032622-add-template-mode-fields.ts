import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTemplateModeFields20251122032622 implements MigrationInterface {
  name = 'AddTemplateModeFields20251122032622';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 检查字段是否已存在，如果不存在则添加
    // mode_primary: 主模式分类
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'journey_templates' 
          AND column_name = 'mode_primary'
        ) THEN
          ALTER TABLE "journey_templates" 
          ADD COLUMN "mode_primary" varchar(50) NULL;
        END IF;
      END $$;
    `);

    // mode_tags: 模式标签（逗号分隔）
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'journey_templates' 
          AND column_name = 'mode_tags'
        ) THEN
          ALTER TABLE "journey_templates" 
          ADD COLUMN "mode_tags" varchar(255) NULL;
        END IF;
      END $$;
    `);

    // language: 语言代码，默认 'zh-CN'
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'journey_templates' 
          AND column_name = 'language'
        ) THEN
          ALTER TABLE "journey_templates" 
          ADD COLUMN "language" varchar(10) NULL DEFAULT 'zh-CN';
        END IF;
      END $$;
    `);

    // 更新现有记录，将 language 设置为默认值
    await queryRunner.query(`
      UPDATE "journey_templates" 
      SET "language" = 'zh-CN' 
      WHERE "language" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 移除添加的字段
    await queryRunner.query(`
      ALTER TABLE "journey_templates" 
      DROP COLUMN IF EXISTS "mode_primary";
    `);

    await queryRunner.query(`
      ALTER TABLE "journey_templates" 
      DROP COLUMN IF EXISTS "mode_tags";
    `);

    await queryRunner.query(`
      ALTER TABLE "journey_templates" 
      DROP COLUMN IF EXISTS "language";
    `);
  }
}

