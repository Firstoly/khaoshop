// ===================================================
// auth.ts — ตั้งค่าระบบ Login ด้วย NextAuth.js
// ใช้ JWT session (ไม่เก็บ session ใน database)
// ===================================================

import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  // ใช้ JWT เก็บ session ใน cookie แทน database เพื่อความเร็ว
  session: {
    strategy: 'jwt',
  },
  providers: [
    // ล็อกอินด้วย email + password
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      // ฟังก์ชันตรวจสอบ login — ถ้า throw Error = login ไม่ผ่าน
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('กรุณากรอกอีเมลและรหัสผ่าน')
        }

        // ดึงข้อมูล user พร้อมร้านค้าจาก database
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { shop: true },
        })

        if (!user) {
          throw new Error('ไม่พบบัญชีนี้ในระบบ')
        }

        // ถ้าบัญชีถูกระงับ ห้าม login
        if (user.isSuspended) {
          throw new Error('บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ')
        }

        // เปรียบเทียบ password กับ hash ที่เก็บใน database
        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) {
          throw new Error('รหัสผ่านไม่ถูกต้อง')
        }

        // คืนข้อมูลที่จะเก็บใน JWT token
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: (user as any).role,
          shopId: user.shop?.id,
          shopSlug: user.shop?.slug,
        }
      },
    }),
  ],
  callbacks: {
    // jwt callback — รันตอน login สำเร็จ เอาข้อมูลใส่ token
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.shopId = (user as any).shopId
        token.shopSlug = (user as any).shopSlug
      }
      return token
    },
    // session callback — รันทุกครั้งที่เรียก useSession() หรือ getServerSession()
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub
        ;(session.user as any).role = token.role
        ;(session.user as any).shopId = token.shopId
        ;(session.user as any).shopSlug = token.shopSlug
      }
      return session
    },
  },
  // หน้า login custom
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
