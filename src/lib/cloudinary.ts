import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function uploadImage(file: File, folder = 'khaoshop'): Promise<string> {
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image', transformation: [{ width: 800, height: 600, crop: 'limit', quality: 'auto' }] },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Upload failed'))
        resolve(result.secure_url)
      }
    ).end(buffer)
  })
}

export async function deleteImage(url: string) {
  try {
    const parts = url.split('/')
    const filename = parts[parts.length - 1]
    const folder = parts[parts.length - 2]
    const publicId = `${folder}/${filename.split('.')[0]}`
    await cloudinary.uploader.destroy(publicId)
  } catch { /* ignore */ }
}
