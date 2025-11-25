import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExpenses20251125000000 implements MigrationInterface {
  name = 'CreateExpenses20251125000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 检查表是否已存在
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'itinerary_expenses'
      );
    `);

    if (tableExists[0]?.exists) {
      // 如果表已存在，先删除
      await queryRunner.query(`DROP TABLE IF EXISTS "itinerary_expenses" CASCADE`);
    }

    // 创建 itinerary_expenses 表
    await queryRunner.query(`CREATE TABLE "itinerary_expenses" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "itinerary_id" uuid NOT NULL,
      "title" varchar(255) NOT NULL,
      "amount" decimal(10, 2) NOT NULL,
      "currency_code" varchar(10) NOT NULL DEFAULT 'USD',
      "category" varchar(50),
      "location" varchar(255),
      "payer_id" uuid,
      "payer_name" varchar(255),
      "split_type" varchar(20) NOT NULL DEFAULT 'none',
      "split_details" jsonb,
      "date" date NOT NULL,
      "notes" text,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "FK_expense_itinerary" FOREIGN KEY ("itinerary_id") REFERENCES "itineraries"("id") ON DELETE CASCADE
    )`);

    // 创建索引
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_expense_itinerary_date" ON "itinerary_expenses" ("itinerary_id", "date")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_expense_itinerary_category" ON "itinerary_expenses" ("itinerary_id", "category")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除索引
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_expense_itinerary_category"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_expense_itinerary_date"`);
    
    // 删除表
    await queryRunner.query(`DROP TABLE IF EXISTS "itinerary_expenses" CASCADE`);
  }
}

