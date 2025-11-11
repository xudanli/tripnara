import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema20251111000100 implements MigrationInterface {
  name = 'InitSchema20251111000100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "users" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "email" varchar(255),
      "phone" varchar(32),
      "nickname" varchar(100),
      "avatar_url" text,
      "preferred_language" varchar(10),
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_users_email" UNIQUE ("email"),
      CONSTRAINT "UQ_users_phone" UNIQUE ("phone")
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "user_profiles" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "user_id" uuid NOT NULL,
      "nationality" varchar(120),
      "residence_city" varchar(120),
      "preferences_json" jsonb,
      "persona_tags" text,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_user_profiles_user" UNIQUE ("user_id"),
      CONSTRAINT "FK_user_profiles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "user_auth_providers" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "user_id" uuid NOT NULL,
      "provider" varchar(50) NOT NULL,
      "provider_user_id" varchar(255) NOT NULL,
      "auth_token" text,
      "linked_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "FK_auth_provider_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_auth_provider_unique" ON "user_auth_providers" ("provider", "provider_user_id")`,
    );

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "user_settings" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "user_id" uuid NOT NULL,
      "notify_preferences_json" jsonb,
      "experiment_flags_json" jsonb,
      "auto_generate_safety_notice" boolean NOT NULL DEFAULT true,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_user_settings_user" UNIQUE ("user_id"),
      CONSTRAINT "FK_user_settings_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "user_preferences" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "user_id" varchar NOT NULL,
      "preferences" text NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_user_preferences_user" UNIQUE ("user_id")
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "journey_templates" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "status" varchar(20) NOT NULL DEFAULT 'draft',
      "mode" varchar(20) NOT NULL DEFAULT 'inspiration',
      "title" varchar(255) NOT NULL,
      "cover_image" text,
      "duration_days" int,
      "summary" text,
      "description" text,
      "core_insight" text,
      "safety_notice_default" jsonb,
      "journey_background" jsonb,
      "persona_profile" jsonb,
      "journey_design" jsonb,
      "tasks_default" jsonb,
      "created_by" uuid,
      "updated_by" uuid,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now()
    )`);

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
      "location_json" jsonb,
      "details_json" jsonb,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "FK_template_slot_day" FOREIGN KEY ("day_id") REFERENCES "template_days"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_template_slot_sequence" ON "template_time_slots" ("day_id", "sequence")`,
    );

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "journeys" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "user_id" uuid,
      "template_id" uuid,
      "status" varchar(20) NOT NULL DEFAULT 'draft',
      "mode" varchar(20) NOT NULL DEFAULT 'inspiration',
      "title" varchar(255),
      "cover_image" text,
      "destination" varchar(255),
      "start_date" date,
      "end_date" date,
      "duration_days" int,
      "summary" text,
      "description" text,
      "core_insight" text,
      "safety_notice" jsonb,
      "journey_background" jsonb,
      "persona_profile" jsonb,
      "journey_design" jsonb,
      "tasks" jsonb,
      "budget_info" jsonb,
      "sources" jsonb,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "FK_journey_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL,
      CONSTRAINT "FK_journey_template" FOREIGN KEY ("template_id") REFERENCES "journey_templates"("id") ON DELETE SET NULL
    )`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_journey_user_status" ON "journeys" ("user_id", "status")`,
    );

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "journey_days" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "journey_id" uuid NOT NULL,
      "day_number" int NOT NULL,
      "date" date,
      "title" varchar(255),
      "summary" text,
      "details_json" jsonb,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "FK_journey_day_journey" FOREIGN KEY ("journey_id") REFERENCES "journeys"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_journey_day_sequence" ON "journey_days" ("journey_id", "day_number")`,
    );

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "journey_time_slots" (
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
      "source" varchar(255),
      "ai_generated" boolean NOT NULL DEFAULT true,
      "locked_by_user" boolean NOT NULL DEFAULT false,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "FK_journey_slot_day" FOREIGN KEY ("day_id") REFERENCES "journey_days"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_journey_slot_sequence" ON "journey_time_slots" ("day_id", "sequence")`,
    );

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "ai_request_logs" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "journey_id" uuid,
      "module" varchar(100) NOT NULL,
      "prompt_json" jsonb NOT NULL,
      "response_raw" jsonb,
      "status" varchar(20) NOT NULL DEFAULT 'pending',
      "tokens_used" int,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ai_request_lookup" ON "ai_request_logs" ("journey_id", "module", "created_at")`,
    );

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "ai_generation_jobs" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "journey_id" uuid,
      "status" varchar(20) NOT NULL DEFAULT 'pending',
      "started_at" timestamptz NOT NULL DEFAULT now(),
      "completed_at" timestamptz,
      "error_message" text
    )`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ai_jobs_lookup" ON "ai_generation_jobs" ("journey_id", "status")`,
    );

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "ai_safety_notice_cache" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "cache_key" varchar(255) NOT NULL,
      "notice_text" text NOT NULL,
      "lang" varchar(10) NOT NULL,
      "metadata" jsonb,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_ai_safety_cache_key" UNIQUE ("cache_key")
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "journey_edits" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "journey_id" uuid NOT NULL,
      "user_id" uuid,
      "action" varchar(50) NOT NULL,
      "payload" jsonb,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_journey_edits_lookup" ON "journey_edits" ("journey_id", "user_id", "created_at")`,
    );

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "journey_shares" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "journey_id" uuid NOT NULL,
      "user_id" uuid,
      "channel" varchar(50) NOT NULL,
      "metadata" jsonb,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_journey_shares_lookup" ON "journey_shares" ("journey_id", "user_id")`,
    );

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "journey_feedback" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "journey_id" uuid NOT NULL,
      "user_id" uuid,
      "rating" int,
      "comment" text,
      "metadata" jsonb,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_journey_feedback_lookup" ON "journey_feedback" ("journey_id", "user_id")`,
    );

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "journey_collections" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "user_id" uuid NOT NULL,
      "journey_id" uuid NOT NULL,
      "tags" jsonb,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_journey_collection_unique" UNIQUE ("user_id", "journey_id")
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "notifications" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "user_id" uuid,
      "type" varchar(50) NOT NULL,
      "payload" jsonb NOT NULL,
      "status" varchar(20) NOT NULL DEFAULT 'pending',
      "sent_at" timestamptz,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notifications_lookup" ON "notifications" ("user_id", "status")`,
    );

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "destinations" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "name" varchar(120) NOT NULL,
      "slug" varchar(150) NOT NULL,
      "country_code" varchar(3),
      "geo_json" jsonb,
      "metadata" jsonb,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_destinations_slug" UNIQUE ("slug")
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "countries" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "iso_code" varchar(3) NOT NULL,
      "name" varchar(120) NOT NULL,
      "visa_summary" text,
      "metadata" jsonb,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_countries_iso" UNIQUE ("iso_code")
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "transport_modes" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "code" varchar(50) NOT NULL,
      "name" varchar(120) NOT NULL,
      "metadata" jsonb,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_transport_code" UNIQUE ("code")
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "high_altitude_regions" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "name" varchar(150) NOT NULL,
      "category" varchar(50),
      "geo_json" jsonb,
      "reference_note" text,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now()
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "preparation_profiles" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "code" varchar(120) NOT NULL,
      "title" varchar(255) NOT NULL,
      "tasks" jsonb NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_preparation_profile_code" UNIQUE ("code")
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "media_assets" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "url" varchar(255) NOT NULL,
      "media_type" varchar(50),
      "metadata" jsonb,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now()
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "external_api_keys" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "service" varchar(120) NOT NULL,
      "credentials" jsonb NOT NULL,
      "metadata" jsonb,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now()
    )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "external_api_keys"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "media_assets"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "preparation_profiles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "high_altitude_regions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "transport_modes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "countries"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "destinations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "journey_collections"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "journey_feedback"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "journey_shares"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "journey_edits"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_safety_notice_cache"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_generation_jobs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_request_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "journey_time_slots"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "journey_days"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "journeys"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "template_time_slots"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "template_days"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "journey_templates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_preferences"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_settings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_auth_providers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_profiles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
