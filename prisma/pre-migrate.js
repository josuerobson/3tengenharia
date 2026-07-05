// prisma/pre-migrate.js
import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()
  try {
    console.log('Running pre-migration: updating legacy MANAGER roles to MANAGER_WORKSITE...')
    const updated = await prisma.$executeRawUnsafe(
      `UPDATE "users" SET "role" = 'MANAGER_WORKSITE' WHERE "role"::text = 'MANAGER';`
    )
    console.log(`Pre-migration: successfully updated ${updated} user(s).`)
  } catch (err) {
    console.warn('Pre-migration warning (possibly safe to ignore if tables do not exist yet):', err.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
