import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRbac1783546434119 implements MigrationInterface {
  name = 'CreateRbac1783546434119';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "permissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL, "name" character varying(100) NOT NULL, "resource" character varying(60) NOT NULL, "action" character varying(60) NOT NULL, "description" character varying(255), CONSTRAINT "UQ_7331684c0c5b063803a425001a0" UNIQUE ("resource", "action"), CONSTRAINT "pk_permissions_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_permissions_name" ON "permissions" ("name") `,
    );
    await queryRunner.query(
      `CREATE TABLE "roles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL, "name" character varying(60) NOT NULL, "description" character varying(255), CONSTRAINT "pk_roles_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "idx_roles_name" ON "roles" ("name") `);
    await queryRunner.query(
      `CREATE TABLE "role_permissions" ("roles_id" uuid NOT NULL, "permissions_id" uuid NOT NULL, CONSTRAINT "pk_role_permissions_roles_id_permissions_id" PRIMARY KEY ("roles_id", "permissions_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_role_permissions_roles_id" ON "role_permissions" ("roles_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_role_permissions_permissions_id" ON "role_permissions" ("permissions_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "user_roles" ("users_id" uuid NOT NULL, "roles_id" uuid NOT NULL, CONSTRAINT "pk_user_roles_users_id_roles_id" PRIMARY KEY ("users_id", "roles_id"))`,
    );
    await queryRunner.query(`CREATE INDEX "idx_user_roles_users_id" ON "user_roles" ("users_id") `);
    await queryRunner.query(`CREATE INDEX "idx_user_roles_roles_id" ON "user_roles" ("roles_id") `);
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "fk_role_permissions_roles_id" FOREIGN KEY ("roles_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "fk_role_permissions_permissions_id" FOREIGN KEY ("permissions_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" ADD CONSTRAINT "fk_user_roles_users_id" FOREIGN KEY ("users_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" ADD CONSTRAINT "fk_user_roles_roles_id" FOREIGN KEY ("roles_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_roles" DROP CONSTRAINT "fk_user_roles_roles_id"`);
    await queryRunner.query(`ALTER TABLE "user_roles" DROP CONSTRAINT "fk_user_roles_users_id"`);
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "fk_role_permissions_permissions_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "fk_role_permissions_roles_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_user_roles_roles_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_user_roles_users_id"`);
    await queryRunner.query(`DROP TABLE "user_roles"`);
    await queryRunner.query(`DROP INDEX "public"."idx_role_permissions_permissions_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_role_permissions_roles_id"`);
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(`DROP INDEX "public"."idx_roles_name"`);
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(`DROP INDEX "public"."idx_permissions_name"`);
    await queryRunner.query(`DROP TABLE "permissions"`);
  }
}
