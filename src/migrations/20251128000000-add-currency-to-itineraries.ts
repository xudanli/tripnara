import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCurrencyToItineraries20251128000000 implements MigrationInterface {
  name = 'AddCurrencyToItineraries20251128000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 检查列是否已存在
    const currencyColumnExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'itineraries' 
        AND column_name = 'currency'
      );
    `);

    if (!currencyColumnExists[0]?.exists) {
      // 添加 currency 列
      await queryRunner.query(`
        ALTER TABLE "itineraries" 
        ADD COLUMN "currency" varchar(10)
      `);
    }

    // 检查列是否已存在
    const currencyInfoColumnExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'itineraries' 
        AND column_name = 'currency_info'
      );
    `);

    if (!currencyInfoColumnExists[0]?.exists) {
      // 添加 currencyInfo 列
      await queryRunner.query(`
        ALTER TABLE "itineraries" 
        ADD COLUMN "currency_info" jsonb
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除 currency_info 列
    await queryRunner.query(`
      ALTER TABLE "itineraries" 
      DROP COLUMN IF EXISTS "currency_info"
    `);

    // 删除 currency 列
    await queryRunner.query(`
      ALTER TABLE "itineraries" 
      DROP COLUMN IF EXISTS "currency"
    `);
  }
}

