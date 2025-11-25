import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDetailsToActivities1764086741068 implements MigrationInterface {
    name = 'AddDetailsToActivities1764086741068'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "itinerary_activities" ADD "details" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "itinerary_activities" DROP COLUMN "details"`);
    }

}
