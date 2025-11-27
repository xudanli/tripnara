import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJourneyMembers20250126000000 implements MigrationInterface {
  name = 'CreateJourneyMembers20250126000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 检查表是否已存在
    const membersTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'journey_members'
      );
    `);

    if (membersTableExists[0]?.exists) {
      await queryRunner.query(`DROP TABLE IF EXISTS "journey_members" CASCADE`);
    }

    // 创建 journey_members 表
    await queryRunner.query(`CREATE TABLE "journey_members" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "journey_id" uuid NOT NULL,
      "name" varchar(100) NOT NULL,
      "email" varchar(255),
      "role" varchar(20) NOT NULL DEFAULT 'member',
      "user_id" uuid,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "FK_member_journey" FOREIGN KEY ("journey_id") REFERENCES "itineraries"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_member_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL,
      CONSTRAINT "UQ_member_journey_email" UNIQUE ("journey_id", "email"),
      CONSTRAINT "UQ_member_journey_user" UNIQUE ("journey_id", "user_id")
    )`);

    // 创建索引
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_member_journey_role" ON "journey_members" ("journey_id", "role")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_member_journey_user" ON "journey_members" ("journey_id", "user_id")`,
    );

    // 检查邀请表是否已存在
    const invitationsTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'journey_invitations'
      );
    `);

    if (invitationsTableExists[0]?.exists) {
      await queryRunner.query(`DROP TABLE IF EXISTS "journey_invitations" CASCADE`);
    }

    // 创建 journey_invitations 表
    await queryRunner.query(`CREATE TABLE "journey_invitations" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "journey_id" uuid NOT NULL,
      "email" varchar(255) NOT NULL,
      "role" varchar(20) NOT NULL DEFAULT 'member',
      "message" text,
      "status" varchar(20) NOT NULL DEFAULT 'pending',
      "invited_by" uuid NOT NULL,
      "expires_at" timestamptz NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "FK_invitation_journey" FOREIGN KEY ("journey_id") REFERENCES "itineraries"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_invitation_inviter" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE CASCADE
    )`);

    // 创建索引
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_invitation_journey_status" ON "journey_invitations" ("journey_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_invitation_email_status" ON "journey_invitations" ("email", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_invitation_expires" ON "journey_invitations" ("expires_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除索引
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_invitation_expires"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_invitation_email_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_invitation_journey_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_member_journey_user"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_member_journey_role"`);
    
    // 删除表
    await queryRunner.query(`DROP TABLE IF EXISTS "journey_invitations" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "journey_members" CASCADE`);
  }
}

