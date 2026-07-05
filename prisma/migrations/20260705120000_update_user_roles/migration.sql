-- CreateTypeNew
CREATE TYPE "UserRole_new" AS ENUM ('COLLABORATOR', 'ADMIN', 'MANAGER_WORKSITE', 'MANAGER_HR', 'MANAGER_WAREHOUSE');

-- MigrateExistingData
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new" USING (
  CASE 
    WHEN "role"::text = 'MANAGER' THEN 'MANAGER_WORKSITE'::"UserRole_new"
    ELSE "role"::text::"UserRole_new"
  END
);

-- DropOldEnum
DROP TYPE "UserRole";

-- RenameNewEnum
ALTER TYPE "UserRole_new" RENAME TO "UserRole";

-- RestoreDefault
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'COLLABORATOR';
