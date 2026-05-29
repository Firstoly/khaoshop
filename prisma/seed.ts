import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashed = await bcrypt.hash('demo1234', 10)
  const user = await prisma.user.upsert({
    where: { email: 'demo@khaoshop.com' },
    update: {},
    create: {
      email: 'demo@khaoshop.com',
      password: hashed,
      name: 'ป้าสมศรี',
      shop: {
        create: {
          slug: 'pa-somsri',
          name: 'ร้านป้าสมศรี กับข้าวสดทุกวัน',
          description: 'กับข้าวสดๆ ทำใหม่ทุกวัน รสชาติบ้านๆ อร่อยถูกใจ',
          phone: '081-234-5678',
          address: '123 ถ.สุขุมวิท กรุงเทพฯ',
          promptpayId: '0812345678',
          promptpayName: 'ป้าสมศรี ใจดี',
          isOpen: true,
          menuItems: {
            create: [
              { name: 'แกงเขียวหวานไก่', description: 'หอมกะทิ เผ็ดกำลังดี', price: 55, dailyLimit: 20, soldCount: 8, category: 'แกงและต้ม', isAvailable: true },
              { name: 'ผัดกะเพราหมูสับ', description: 'หมูสับผัดกะเพราสด ใส่ไข่ดาว', price: 50, dailyLimit: 30, soldCount: 15, category: 'ผัด', isAvailable: true },
              { name: 'ต้มจืดเต้าหู้หมูสับ', description: 'รสกลมกล่อม เต้าหู้ขาวนุ่ม', price: 45, dailyLimit: 15, soldCount: 15, category: 'แกงและต้ม', isAvailable: false },
              { name: 'ไข่พะโล้', description: 'รสเข้มข้น หอมเครื่องเทศ', price: 40, dailyLimit: 25, soldCount: 5, category: 'ทอดและอบ', isAvailable: true },
              { name: 'แกงมัสมั่นไก่', description: 'มันฝรั่งอบอุ่น หอมเครื่องแกง', price: 60, dailyLimit: 10, soldCount: 2, category: 'แกงและต้ม', isAvailable: true },
              { name: 'ผัดผักรวมมิตร', description: 'ผักสดๆ ผัดน้ำมันหอย', price: 40, dailyLimit: 20, soldCount: 7, category: 'ผัด', isAvailable: true },
            ]
          }
        }
      }
    }
  })
  console.log('✅ Seed done:', user.email)
}

main().catch(console.error).finally(() => prisma.$disconnect())
