import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { StoreClient } from './StoreClient'

export async function generateMetadata({ params }: { params: { shopId: string } }) {
  const shop = await prisma.shop.findUnique({ where: { slug: params.shopId } })
  if (!shop) return { title: 'ไม่พบร้าน' }
  return {
    title: `${shop.name} - สั่งอาหารออนไลน์`,
    description: shop.description ?? `สั่งอาหารจาก ${shop.name} ได้เลย`,
    openGraph: {
      title: `${shop.name} - สั่งอาหารออนไลน์`,
      description: shop.description ?? '',
      images: shop.logoUrl ? [shop.logoUrl] : [],
    },
  }
}

export default async function StorePage({ params }: { params: { shopId: string } }) {
  const shop = await prisma.shop.findUnique({
    where: { slug: params.shopId },
    include: {
      menuItems: {
        where: { isAvailable: true },
        orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
      },
    },
  })
  if (!shop) notFound()
  return <StoreClient shop={shop} menuItems={shop.menuItems} />
}
