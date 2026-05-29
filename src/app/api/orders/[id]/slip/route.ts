import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { uploadImage } from '@/lib/cloudinary'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'ไม่พบไฟล์' }, { status: 400 })

    const url = await uploadImage(file, 'khaoshop/slips')
    const order = await prisma.order.update({
      where: { id: params.id },
      data: { paymentSlipUrl: url, paymentStatus: 'PAID' },
    })
    return NextResponse.json({ url, order })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
