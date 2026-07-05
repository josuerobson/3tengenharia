// prisma/post-migrate.js
import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()
  try {
    console.log('Running post-migration: restoring admin master roles...')
    
    // 1. Promote admin@3tengenharia.com.br to ADMIN
    const updatedAdmin = await prisma.user.updateMany({
      where: {
        email: {
          equals: 'admin@3tengenharia.com.br',
          mode: 'insensitive'
        }
      },
      data: {
        role: 'ADMIN'
      }
    })
    
    // 2. Promote gestor@3tengenharia.com.br to ADMIN
    const updatedGestor = await prisma.user.updateMany({
      where: {
        email: {
          equals: 'gestor@3tengenharia.com.br',
          mode: 'insensitive'
        }
      },
      data: {
        role: 'ADMIN'
      }
    })
    
    console.log(`Post-migration: promoted ${updatedAdmin.count} admin user(s) and ${updatedGestor.count} gestor user(s) to ADMIN.`)
  } catch (err) {
    console.error('Post-migration error:', err.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
