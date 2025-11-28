import { Global, Module } from '@nestjs/common';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';
import { DB } from '../../database/types';

@Global()
@Module({
  providers: [
    {
      provide: 'DB_CONNECTION',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return new Kysely<DB>({
          dialect: new PostgresDialect({
            pool: new Pool({
              connectionString: configService.get('DATABASE_URL'),
            }),
          }),
        });
      },
    },
  ],
  exports: ['DB_CONNECTION'],
})
export class DatabaseModule {}