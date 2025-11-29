import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateConversationMessages20250130000000 implements MigrationInterface {
  name = 'CreateConversationMessages20250130000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "conversation_messages" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "conversation_id" uuid NOT NULL,
        "journey_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "role" varchar(20) NOT NULL,
        "content" text NOT NULL,
        "sequence" int NOT NULL,
        "metadata" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_conversation_journey" FOREIGN KEY ("journey_id") REFERENCES "itineraries"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_conversation_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_conversation_role" CHECK ("role" IN ('user', 'assistant'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_conversation_id_created_at" 
      ON "conversation_messages" ("conversation_id", "created_at")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_conversation_journey_id" 
      ON "conversation_messages" ("journey_id", "conversation_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_conversation_user_id" 
      ON "conversation_messages" ("user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_conversation_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_conversation_journey_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_conversation_id_created_at"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "conversation_messages"`);
  }
}

