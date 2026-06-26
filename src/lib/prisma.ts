// ===================================================
// prisma.ts — สร้าง Prisma Client สำหรับเชื่อมต่อ Database
// ใช้ singleton pattern ป้องกัน connection เกิน
// ===================================================

import { PrismaClient } from '@prisma/client'

// เก็บ instance ใน globalThis เพื่อให้ใช้ตัวเดิมแม้ hot-reload
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// ถ้ามี instance อยู่แล้วใช้ตัวเดิม ถ้าไม่มีสร้างใหม่
export const prisma = globalForPrisma.prisma ?? new PrismaClient()

// เก็บ instance ใน global เฉพาะตอน development เท่านั้น
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
