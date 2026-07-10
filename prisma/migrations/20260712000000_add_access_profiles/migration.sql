-- Sistema de perfis de acesso dinâmicos. Só o schema — a semeadura dos 5
-- perfis de sistema (Administrador + 4 perfis legados) e o vínculo dos
-- usuários existentes acontece em prisma/post-migrate.js, que já roda
-- automaticamente a cada deploy (o `db push` usado em produção não executa
-- este arquivo de dados).

CREATE TYPE "AccessLevel" AS ENUM ('NONE', 'READ_OWN', 'READ_ALL', 'WRITE_OWN', 'WRITE_ALL');

CREATE TABLE "access_profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_master" BOOLEAN NOT NULL DEFAULT false,
    "is_admin_type" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "access_profiles_name_key" ON "access_profiles"("name");

CREATE TABLE "access_profile_permissions" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "page_key" TEXT NOT NULL,
    "level" "AccessLevel" NOT NULL DEFAULT 'NONE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_profile_permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "access_profile_permissions_profile_id_page_key_key" ON "access_profile_permissions"("profile_id", "page_key");
CREATE INDEX "access_profile_permissions_profile_id_idx" ON "access_profile_permissions"("profile_id");

ALTER TABLE "access_profile_permissions" ADD CONSTRAINT "access_profile_permissions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "access_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "users" ADD COLUMN "access_profile_id" TEXT;
CREATE INDEX "users_access_profile_id_idx" ON "users"("access_profile_id");
ALTER TABLE "users" ADD CONSTRAINT "users_access_profile_id_fkey" FOREIGN KEY ("access_profile_id") REFERENCES "access_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
