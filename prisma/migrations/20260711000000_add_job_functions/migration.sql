-- Lista gerenciável de funções/cargos usada no cadastro de usuário.
-- employees.position continua sendo uma coluna de texto livre (sem FK) —
-- esta tabela só existe para permitir editar/excluir funções com segurança
-- (bloqueando a exclusão quando ainda há funcionário vinculado).

CREATE TABLE "job_functions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_functions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "job_functions_name_key" ON "job_functions"("name");

-- Popula com as funções padrão já oferecidas no formulário
INSERT INTO "job_functions" ("id", "name", "is_active", "created_at", "updated_at")
VALUES
    (gen_random_uuid()::text, 'Administrador', true, NOW(), NOW()),
    (gen_random_uuid()::text, 'Gestor de Obras', true, NOW(), NOW()),
    (gen_random_uuid()::text, 'Coordenador', true, NOW(), NOW()),
    (gen_random_uuid()::text, 'Almoxarife', true, NOW(), NOW())
ON CONFLICT ("name") DO NOTHING;

-- Popula com as funções distintas já usadas pelos funcionários cadastrados
INSERT INTO "job_functions" ("id", "name", "is_active", "created_at", "updated_at")
SELECT gen_random_uuid()::text, distinct_positions.trimmed_position, true, NOW(), NOW()
FROM (
    SELECT DISTINCT TRIM("position") AS trimmed_position
    FROM "employees"
    WHERE TRIM("position") <> ''
) AS distinct_positions
ON CONFLICT ("name") DO NOTHING;
