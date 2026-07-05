// prisma/pre-migrate.js
import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()
  try {
    console.log('Running pre-migration: altering role column to TEXT and updating legacy roles...')
    
    // 1. Drop the default constraint temporarily
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;`
    )
    
    // 2. Change the column type to TEXT to bypass enum validation
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "users" ALTER COLUMN "role" TYPE TEXT USING "role"::text;`
    )
    
    // 3. Perform the migration from MANAGER to MANAGER_WORKSITE
    const updated = await prisma.$executeRawUnsafe(
      `UPDATE "users" SET "role" = 'MANAGER_WORKSITE' WHERE "role" = 'MANAGER';`
    )
    
    console.log(`Pre-migration: successfully updated ${updated} user(s) to MANAGER_WORKSITE.`)
  } catch (err) {
    console.warn('Pre-migration warning (possibly safe to ignore if tables do not exist yet):', err.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
