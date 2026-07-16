import multer from 'multer'

const FIVE_MB = 5 * 1024 * 1024
const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const KYC_MIME = ['image/jpeg', 'image/png', 'application/pdf']

/**
 * Multer in memory mode — keeps the file as a Buffer in `req.file.buffer`,
 * which we then forward to Cloudinary. NEVER write to disk; the Render/Vercel
 * runtime is read-only anyway.
 *
 * Used as: `upload.array('images', 10)` on routes that accept image uploads.
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: FIVE_MB,
    files: 10,
  },
  fileFilter: (_req, file, cb) => {
    if (!IMAGE_MIME.includes(file.mimetype)) {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: jpeg, png, webp, gif`))
      return
    }
    cb(null, true)
  },
})

/**
 * KYC-specific upload — accepts JPG, PNG, PDF (citizenship scans are commonly PDFs).
 * Used with `kycUpload.fields([...])` for the 3 distinct document fields.
 */
export const kycUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: FIVE_MB,
    files: 5,
  },
  fileFilter: (_req, file, cb) => {
    if (!KYC_MIME.includes(file.mimetype)) {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: jpeg, png, pdf`))
      return
    }
    cb(null, true)
  },
})
