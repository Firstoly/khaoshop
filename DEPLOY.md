# 🚀 วิธี Deploy KhaoShop (ฟรี 100%)

## บริการที่ใช้
| บริการ | ใช้ทำอะไร | ราคา |
|--------|-----------|------|
| **Vercel** | Host Next.js App | ฟรี |
| **Neon** | PostgreSQL Database | ฟรี |
| **Cloudinary** | เก็บรูปภาพ | ฟรี 25GB |
| **GitHub** | เก็บ Code | ฟรี |

---

## ขั้นตอนทั้งหมด (~20 นาที)

### STEP 1: สมัคร GitHub และ push code
1. ไปที่ https://github.com → Sign up (ถ้ายังไม่มี)
2. กด **New repository** → ตั้งชื่อ `khaoshop` → Create
3. เปิด Terminal ใน folder project แล้วรัน:
```bash
git init
git add .
git commit -m "first commit"
git remote add origin https://github.com/YOUR_USERNAME/khaoshop.git
git push -u origin main
```

---

### STEP 2: สมัคร Neon (Database)
1. ไปที่ https://neon.tech → Sign up ด้วย GitHub
2. กด **Create Project** → ตั้งชื่อ `khaoshop` → Region: `Singapore`
3. หลัง create เสร็จ copy **Connection string** ที่ขึ้นต้นด้วย `postgresql://...`
4. เก็บไว้ใช้ใน STEP 4

---

### STEP 3: สมัคร Cloudinary (รูปภาพ)
1. ไปที่ https://cloudinary.com → Sign up ฟรี
2. หลัง login ไปที่ **Dashboard**
3. Copy ข้อมูล 3 อย่าง:
   - **Cloud Name**
   - **API Key**
   - **API Secret**
4. เก็บไว้ใช้ใน STEP 4

---

### STEP 4: Deploy บน Vercel
1. ไปที่ https://vercel.com → Sign up ด้วย GitHub
2. กด **Add New Project** → เลือก repo `khaoshop`
3. กด **Configure Project** → เพิ่ม Environment Variables:

| Name | Value |
|------|-------|
| `DATABASE_URL` | (connection string จาก Neon) |
| `DIRECT_URL` | (connection string จาก Neon เหมือนกัน) |
| `NEXTAUTH_SECRET` | (สุ่มตัวอักษร 32 ตัว เช่น `abcd1234efgh5678ijkl9012mnop3456`) |
| `NEXTAUTH_URL` | `https://your-app-name.vercel.app` |
| `CLOUDINARY_CLOUD_NAME` | (จาก Cloudinary) |
| `CLOUDINARY_API_KEY` | (จาก Cloudinary) |
| `CLOUDINARY_API_SECRET` | (จาก Cloudinary) |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | (เหมือน CLOUDINARY_CLOUD_NAME) |

4. กด **Deploy** → รอประมาณ 2-3 นาที

---

### STEP 5: Setup Database
หลัง deploy สำเร็จ ต้อง push schema และ seed ข้อมูลตัวอย่าง

**วิธีที่ 1: ผ่าน Vercel (แนะนำ)**

ไปที่ Vercel Dashboard → Project → **Functions** tab → หรือใช้ Vercel CLI:
```bash
npm i -g vercel
vercel env pull .env.local
npx prisma db push
npm run db:seed
```

**วิธีที่ 2: ผ่าน Neon SQL Editor**

ไปที่ Neon Dashboard → SQL Editor แล้ว run schema จาก `prisma/schema.prisma`

---

### STEP 6: แก้ NEXTAUTH_URL
หลัง deploy แล้วได้ URL จริง เช่น `https://khaoshop-xxx.vercel.app`
1. ไปที่ Vercel → Project Settings → Environment Variables
2. แก้ `NEXTAUTH_URL` ให้ตรงกับ URL จริง
3. **Redeploy** อีกครั้ง

---

## ✅ เสร็จแล้ว! เข้าใช้งานได้เลย

| หน้า | URL |
|------|-----|
| Login | `https://your-app.vercel.app/login` |
| Dashboard | `https://your-app.vercel.app/dashboard` |
| หน้าร้านลูกค้า | `https://your-app.vercel.app/store/pa-somsri` |

**บัญชีทดลองใช้:**
- Email: `demo@khaoshop.com`
- Password: `demo1234`

---

## 🔄 อัปเดต Code ในอนาคต
แค่ push code ไป GitHub แล้ว Vercel จะ deploy ให้อัตโนมัติ:
```bash
git add .
git commit -m "update"
git push
```

---

### STEP 7: ตั้งค่า Pusher (ระบบแจ้งเตือน Realtime)

1. ไปที่ https://pusher.com → Sign up ฟรี
2. กด **Create app** → ตั้งชื่อ `khaoshop` → Cluster: `ap1 (Asia Pacific)`
3. ไปที่ **App Keys** แล้ว copy:
   - `app_id`
   - `key`
   - `secret`
   - `cluster`
4. เพิ่ม Environment Variables ใน Vercel:

| Name | Value |
|------|-------|
| `PUSHER_APP_ID` | app_id จาก Pusher |
| `PUSHER_KEY` | key จาก Pusher |
| `PUSHER_SECRET` | secret จาก Pusher |
| `PUSHER_CLUSTER` | `ap1` |
| `NEXT_PUBLIC_PUSHER_KEY` | key จาก Pusher (เหมือน PUSHER_KEY) |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | `ap1` |

5. Redeploy บน Vercel

**Pusher Free Plan:** รองรับ 200k message/วัน และ 100 connections พร้อมกัน เพียงพอสำหรับร้านทั่วไปครับ

---

### STEP 8: ตั้งค่า Reset Password (Resend Email)

1. ไปที่ https://resend.com → Sign up ฟรี
2. ไปที่ **API Keys** → Create API Key
3. เพิ่มใน Vercel Environment Variables:

| Name | Value |
|------|-------|
| `RESEND_API_KEY` | API key จาก Resend |

> **หมายเหตุ:** Resend ฟรีแพลนส่งได้ 3,000 อีเมล/เดือน เพียงพอสำหรับร้านทั่วไป

---

### STEP 9: ตั้งค่า Cron Job (Reset สต็อกทุกเที่ยงคืน)

1. สร้าง `CRON_SECRET` โดยรันคำสั่ง:
```bash
openssl rand -hex 32
```
2. เพิ่มใน Vercel Environment Variables:

| Name | Value |
|------|-------|
| `CRON_SECRET` | ค่าที่ได้จากคำสั่งด้านบน |

3. Vercel จะรัน Cron Job ตาม `vercel.json` ที่ตั้งค่าไว้ (00:00 เวลาไทย ทุกวัน)

> ไฟล์ `vercel.json` ที่แนบมาตั้งค่าไว้แล้ว ไม่ต้องแก้อะไร

---

### สรุป Environment Variables ทั้งหมดที่ต้องใส่ใน Vercel

| Variable | ได้จากไหน |
|----------|-----------|
| `DATABASE_URL` | Neon |
| `DIRECT_URL` | Neon (ค่าเดียวกับ DATABASE_URL) |
| `NEXTAUTH_SECRET` | สุ่มเอง 32 ตัว |
| `NEXTAUTH_URL` | URL ของ Vercel app |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary |
| `CLOUDINARY_API_KEY` | Cloudinary |
| `CLOUDINARY_API_SECRET` | Cloudinary |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary |
| `PUSHER_APP_ID` | Pusher |
| `PUSHER_KEY` | Pusher |
| `PUSHER_SECRET` | Pusher |
| `PUSHER_CLUSTER` | `ap1` |
| `NEXT_PUBLIC_PUSHER_KEY` | Pusher |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | `ap1` |
| `RESEND_API_KEY` | Resend |
| `CRON_SECRET` | สุ่มเอง |
