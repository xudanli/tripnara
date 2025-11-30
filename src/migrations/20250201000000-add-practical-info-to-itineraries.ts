import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPracticalInfoToItineraries20250201000000
  implements MigrationInterface
{
  name = 'AddPracticalInfoToItineraries20250201000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 检查列是否已存在
    const practicalInfoColumnExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'itineraries' 
        AND column_name = 'practical_info'
      );
    `);

    if (!practicalInfoColumnExists[0]?.exists) {
      // 添加 practical_info 列
      await queryRunner.query(`
        ALTER TABLE "itineraries" 
        ADD COLUMN "practical_info" jsonb
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除 practical_info 列
    await queryRunner.query(`
      ALTER TABLE "itineraries" 
      DROP COLUMN IF EXISTS "practical_info"
    `);
  }
}

