import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigTree } from '../config';
import { buildTypeOrmOptions } from './typeorm-options';

/**
 * Wires TypeORM to the validated config. Entities are auto-loaded from feature
 * modules that register them via `TypeOrmModule.forFeature([...])`.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfigTree, true>) => {
        const db = config.get('database', { infer: true });
        return {
          ...buildTypeOrmOptions(db, false),
          autoLoadEntities: true,
          // Runtime loads compiled entities via autoLoadEntities, not the glob.
          entities: undefined,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
