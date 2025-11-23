import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJourneyTemplates20250115000000 implements MigrationInterface {
  name = 'CreateJourneyTemplates20250115000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建 journey_templates 表
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "journey_templates" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "title" varchar(255) NOT NULL,
      "cover_image" text,
      "destination" varchar(255),
      "duration_days" int,
      "summary" text,
      "description" text,
      "core_insight" text,
      "safety_notice" jsonb,
      "journey_background" jsonb,
      "preferences" jsonb,
      "language" varchar(10) NOT NULL DEFAULT 'zh-CN',
      "status" varchar(20) NOT NULL DEFAULT 'draft',
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_journey_template_status" ON "journey_templates" ("status", "created_at")`,
    );

    // 创建 template_days 表
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "template_days" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "template_id" uuid NOT NULL,
      "day_number" int NOT NULL,
      "title" varchar(255),
      "summary" text,
      "details_json" jsonb,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "FK_template_day_template" FOREIGN KEY ("template_id") REFERENCES "journey_templates"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_template_day_sequence" ON "template_days" ("template_id", "day_number")`,
    );

    // 创建 template_time_slots 表
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "template_time_slots" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "day_id" uuid NOT NULL,
      "sequence" int NOT NULL,
      "start_time" time,
      "duration_minutes" int,
      "type" varchar(50),
      "title" varchar(255),
      "activity_highlights" jsonb,
      "scenic_intro" text,
      "notes" text,
      "cost" numeric(10,2),
      "currency_code" varchar(3),
      "location_json" jsonb,
      "details_json" jsonb,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "FK_template_slot_day" FOREIGN KEY ("day_id") REFERENCES "template_days"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_template_slot_sequence" ON "template_time_slots" ("day_id", "sequence")`,
    );

    // 如果 journeys 表存在但没有 template_id 外键，添加外键约束
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_journey_template' 
          AND table_name = 'journeys'
        ) THEN
          ALTER TABLE "journeys" 
          ADD CONSTRAINT "FK_journey_template" 
          FOREIGN KEY ("template_id") REFERENCES "journey_templates"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除外键约束
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_journey_template' 
          AND table_name = 'journeys'
        ) THEN
          ALTER TABLE "journeys" DROP CONSTRAINT "FK_journey_template";
        END IF;
      END $$;
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "template_time_slots"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "template_days"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "journey_templates"`);
  }
}

