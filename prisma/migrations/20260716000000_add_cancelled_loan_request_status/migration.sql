-- Documentação da mudança de schema — NÃO é executada automaticamente em produção.
-- O deploy roda `prisma db push`, que aplica esta mudança (aditiva, sem perda de dados)
-- diretamente a partir do schema.prisma. Ver AGENTS.md / HANDOFF.md.

ALTER TYPE "LoanRequestStatus" ADD VALUE 'CANCELLED';
