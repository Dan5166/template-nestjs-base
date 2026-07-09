import { DataSource } from 'typeorm';

/** A unit of seed data. Implementations must be idempotent (safe to re-run). */
export interface Seeder {
  readonly name: string;
  run(dataSource: DataSource): Promise<void>;
}
