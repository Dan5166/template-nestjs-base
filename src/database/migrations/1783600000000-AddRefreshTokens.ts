import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Move refresh tokens from a single `users.refresh_token_hash` column to a
 * dedicated `refresh_tokens` table (one row per session/device), enabling
 * concurrent logins and per-session revocation.
 */
export class AddRefreshTokens1783600000000 implements MigrationInterface {
  name = 'AddRefreshTokens1783600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "jti" uuid NOT NULL, "token_hash" character varying(255) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "pk_refresh_tokens_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_refresh_tokens_jti" ON "refresh_tokens" ("jti")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_refresh_tokens_user_id" ON "refresh_tokens" ("user_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "fk_refresh_tokens_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "refresh_token_hash"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "refresh_token_hash" character varying(255)`);
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "fk_refresh_tokens_user_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_refresh_tokens_user_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_refresh_tokens_jti"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
  }
}
