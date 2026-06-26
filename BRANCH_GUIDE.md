# วิธีเพิ่มฟีเจอร์ใหม่โดยไม่กระทบผู้ใช้งาน

## แนวคิด

```
main (ของจริง)   ●────────────────────────────●  ← ผู้ใช้เห็นอยู่
                      \                        /
feature (ทดลอง)        ●──●──●──●──●──●──●───   ← เราทำอยู่ ผู้ใช้ไม่เห็น
```

- **main** = โค้ดที่ deploy บน Vercel อยู่จริง
- **feature branch** = copy ของโค้ด ทำได้เต็มที่ไม่กระทบ main

Vercel จะสร้าง **URL preview อัตโนมัติ** ให้ทุก branch
ทำให้เห็นผลลัพธ์จริงๆ โดยไม่กระทบผู้ใช้เลย

---

## ขั้นตอนทั้งหมด

### STEP 1 — เช็คก่อนว่าอยู่ที่ main
```bash
git branch
```
จะเห็น `* main` — ถ้าไม่ใช่ให้รัน `git checkout main` ก่อน

---

### STEP 2 — สร้าง branch ใหม่สำหรับฟีเจอร์นี้
```bash
git checkout -b feature/ชื่อฟีเจอร์
```

**ตัวอย่างชื่อที่ใช้บ่อย:**
```bash
git checkout -b feature/add-review        # เพิ่มระบบรีวิว
git checkout -b feature/fix-order-bug     # แก้บัค order
git checkout -b feature/new-dashboard     # ทำ dashboard ใหม่
```

ผลที่ได้:
```
Switched to a new branch 'feature/add-review'
```

---

### STEP 3 — แก้โค้ดได้เลย
แก้ไขไฟล์ตามปกติใน VS Code ได้เลย main ไม่ได้รับผลกระทบ

---

### STEP 4 — Save งานและ push ขึ้น GitHub
```bash
git add .
git commit -m "อธิบายว่าทำอะไรไป"
git push origin feature/ชื่อฟีเจอร์
```

---

### STEP 5 — ดู Preview บน Vercel

1. เปิด [vercel.com](https://vercel.com)
2. เข้า project **khaoshop**
3. คลิกแถบ **Deployments**
4. จะเห็น deployment ของ branch นี้ พร้อม URL เช่น:
   ```
   khaoshop-git-feature-add-review-xxx.vercel.app
   ```
5. คลิก URL นั้นเพื่อดูผลลัพธ์จริงๆ ได้เลย

> ทุกครั้งที่ push Vercel จะ build URL ใหม่ให้อัตโนมัติ

---

### STEP 6 — ทดสอบจนพอใจแล้ว → เอาขึ้น main

```bash
# กลับไป main ก่อน
git checkout main

# เอาโค้ดจาก feature มารวม
git merge feature/ชื่อฟีเจอร์

# push ขึ้น GitHub → Vercel deploy ของจริงอัตโนมัติ
git push origin main
```

ผู้ใช้จะเห็นฟีเจอร์ใหม่ทันที

---

### STEP 7 — ลบ branch ที่ไม่ใช้แล้ว (ไม่บังคับ)
```bash
git branch -d feature/ชื่อฟีเจอร์
git push origin --delete feature/ชื่อฟีเจอร์
```

---

## สรุปคำสั่งทั้งหมด (copy ไปใช้ได้เลย)

```bash
# เริ่มทำฟีเจอร์ใหม่
git checkout -b feature/ชื่อฟีเจอร์

# ระหว่างทำ — save งาน
git add .
git commit -m "ทำอะไรไปบ้าง"
git push origin feature/ชื่อฟีเจอร์

# พอเสร็จแล้ว — เอาขึ้น main
git checkout main
git merge feature/ชื่อฟีเจอร์
git push origin main
```

---

## ข้อควรจำ

| สิ่งที่ทำ | ผลที่เกิด |
|-----------|-----------|
| push ไป `feature/xxx` | Vercel สร้าง URL preview ให้ดูได้ ผู้ใช้ไม่เห็น |
| push ไป `main` | Vercel deploy ของจริง ผู้ใช้เห็นทันที |
| ทำผิดใน feature branch | ไม่กระทบ main เลย แก้ได้เต็มที่ |
