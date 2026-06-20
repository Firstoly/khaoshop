import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('กรุณากรอกอีเมลและรหัสผ่าน')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { shop: true },
        })

        if (!user) {
          throw new Error('ไม่พบบัญชีนี้ในระบบ')
        }

        if (user.isSuspended) {
          throw new Error('บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ')
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) {
          throw new Error('รหัสผ่านไม่ถูกต้อง')
        }

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
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.shopId = (user as any).shopId
        token.shopSlug = (user as any).shopSlug
      }
      return token
    },
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
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
