// ===================================================
// GET /api/cron/reset-stock — รีเซ็ตสต็อกทุกเมนูทุกคืน
// เรียกโดย Vercel Cron Job อัตโนมัติตอนเที่ยงคืน (เวลาไทย)
// ต้องส่ง Authorization header พร้อม CRON_SECRET
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  // ตรวจสอบ secret ป้องกันใครเรียก API นี้โดยไม่ได้รับอนุญาต
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    // รีเซ็ต soldCount ทุกเมนูทุกร้านพร้อมกัน
    // ไม่แตะ isAvailable เพราะเจ้าของร้านปิดไว้จงใจ
    const result = await prisma.menuItem.updateMany({ data: { soldCount: 0 } })
    console.log(`Stock reset: ${result.count} items`)
    return NextResponse.json({ success: true, count: result.count, timestamp: new Date().toISOString() })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
