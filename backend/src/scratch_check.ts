import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function run() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true }
  })
  const worksites = await prisma.worksite.findMany({
    select: { id: true, code: true, name: true }
  })
  const employees = await prisma.employee.findMany({
    select: { id: true, fullName: true, worksiteId: true, managerId: true }
  })

  console.log('--- USERS ---')
  console.log(JSON.stringify(users, null, 2))
  console.log('--- WORKSITES ---')
  console.log(JSON.stringify(worksites, null, 2))
  console.log('--- EMPLOYEES ---')
  console.log(JSON.stringify(employees, null, 2))

  process.exit(0)
}

run().catch(console.error)
