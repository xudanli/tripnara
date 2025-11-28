import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateCurrencyTables20250129000000 implements MigrationInterface {
  name = 'CreateCurrencyTables20250129000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建 currencies 表
    await queryRunner.createTable(
      new Table({
        name: 'currencies',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'code',
            type: 'varchar',
            length: '10',
            isUnique: true,
          },
          {
            name: 'symbol',
            type: 'varchar',
            length: '20',
          },
          {
            name: 'nameZh',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'nameEn',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // 创建索引
    await queryRunner.createIndex(
      'currencies',
      new TableIndex({
        name: 'IDX_currencies_code',
        columnNames: ['code'],
        isUnique: true,
      }),
    );

    // 创建 country_currency_mappings 表
    await queryRunner.createTable(
      new Table({
        name: 'country_currency_mappings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'countryCode',
            type: 'varchar',
            length: '3',
            isUnique: true,
          },
          {
            name: 'currencyId',
            type: 'uuid',
          },
          {
            name: 'currencyCode',
            type: 'varchar',
            length: '10',
          },
          {
            name: 'countryNames',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // 创建索引
    await queryRunner.createIndex(
      'country_currency_mappings',
      new TableIndex({
        name: 'IDX_country_currency_mappings_countryCode',
        columnNames: ['countryCode'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除索引
    await queryRunner.dropIndex(
      'country_currency_mappings',
      'IDX_country_currency_mappings_countryCode',
    );
    await queryRunner.dropIndex('currencies', 'IDX_currencies_code');

    // 删除表
    await queryRunner.dropTable('country_currency_mappings');
    await queryRunner.dropTable('currencies');
  }
}

