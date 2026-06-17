import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const TARGET_EMAIL = 'natchakp23@gmail.com'

async function main() {
  const user = await prisma.user.update({
    where: { email: TARGET_EMAIL },
    data: { role: 'SUPER_ADMIN' },
  })
  console.log(`✅ Set ${user.email} as SUPER_ADMIN`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
