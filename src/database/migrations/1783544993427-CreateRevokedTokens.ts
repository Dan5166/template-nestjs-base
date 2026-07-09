import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRevokedTokens1783544993427 implements MigrationInterface {
  name = 'CreateRevokedTokens1783544993427';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "revoked_tokens" ("jti" uuid NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "pk_revoked_tokens_jti" PRIMARY KEY ("jti"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_revoked_tokens_expires_at" ON "revoked_tokens" ("expires_at") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_revoked_tokens_expires_at"`);
    await queryRunner.query(`DROP TABLE "revoked_tokens"`);
  }
}
