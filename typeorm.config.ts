import 'dotenv/config';
import { DataSource } from 'typeorm';
import { TYPEORM_ENTITIES } from './src/config/typeorm.entities';

const nodeEnv = process.env.NODE_ENV ?? 'development';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: TYPEORM_ENTITIES,
  migrations: ['src/migrations/*.ts'],
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: false,
});
