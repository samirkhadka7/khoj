import { v2 as cloudinary } from 'cloudinary'

/**
 * Cloudinary client + upload + delete helpers.
 *
 * Configured once at module load using env vars. Upload helper takes a multer
 * file (memory storage), uploads via base64 data URI, returns the secure URL.
 * Delete helper parses public_id from a URL and destroys the asset — used to
 * prevent storage leaks when listings/photos/KYC docs are deleted from the DB.
 */

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env

if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  })
} else {
  console.warn('[Cloudinary] Missing env vars — image uploads will fail until they are set')
}

/* -------------------------------------------------------------------------- */
/*  Upload                                                                     */
/* -------------------------------------------------------------------------- */

export const uploadToCloudinary = async (
  file: Express.Multer.File,
  folder = 'baskhoj/listings'
): Promise<string> => {
  if (!CLOUDINARY_CLOUD_NAME) {
    throw new Error('Cloudinary is not configured — set CLOUDINARY_* env vars')
  }

  const base64 = file.buffer.toString('base64')
  const dataUri = `data:${file.mimetype};base64,${base64}`

  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: 'auto', // auto-detect image vs raw (PDFs go to 'raw')
  })

  return result.secure_url
}

/* -------------------------------------------------------------------------- */
/*  Delete                                                                     */
/* -------------------------------------------------------------------------- */

type CloudinaryResourceType = 'image' | 'video' | 'raw'

/**
 * Parse the public_id out of a Cloudinary secure URL.
 *
 * URLs look like:
 *   https://res.cloudinary.com/{cloud}/image/upload/v1234/{folder}/{name}.{ext}
 *   https://res.cloudinary.com/{cloud}/image/upload/c_fill,w_300/v1234/{folder}/{name}.{ext}
 *   https://res.cloudinary.com/{cloud}/raw/upload/v1234/{folder}/{name}.pdf
 *
 * The public_id is everything between `/upload/[transforms/]?[v\d+/]?` and the
 * file extension. Returns null on URLs we can't recognize so the caller can
 * skip cleanup gracefully instead of crashing.
 */
const publicIdFromUrl = (url: string): string | null => {
  try {
    const u = new URL(url)
    if (!u.hostname.includes('cloudinary.com')) return null

    const parts = u.pathname.split('/').filter(Boolean)
    const uploadIdx = parts.indexOf('upload')
    if (uploadIdx === -1) return null

    let after = parts.slice(uploadIdx + 1)

    // Skip a transform segment if present (it contains `,` like 'c_fill,w_300')
    if (after[0]?.includes(',')) after = after.slice(1)

    // Skip the version segment if present (vNNNNN)
    if (/^v\d+$/.test(after[0] || '')) after = after.slice(1)

    if (after.length === 0) return null

    const pathStr = after.join('/')
    // Strip the file extension from the LAST segment only — folders may contain dots
    const lastDot = pathStr.lastIndexOf('.')
    const lastSlash = pathStr.lastIndexOf('/')
    return lastDot > lastSlash ? pathStr.slice(0, lastDot) : pathStr
  } catch {
    return null
  }
}

const resourceTypeFromUrl = (url: string): CloudinaryResourceType => {
  if (url.includes('/raw/upload/')) return 'raw'
  if (url.includes('/video/upload/')) return 'video'
  return 'image'
}

/**
 * Fire-and-forget delete from Cloudinary. Never throws — failures are logged
 * so a Cloudinary outage can't roll back the DB-side deletion that already
 * succeeded. Idempotent: deleting an already-gone asset just no-ops.
 */
export const deleteFromCloudinary = async (url: string | undefined | null): Promise<void> => {
  if (!url) return
  if (!CLOUDINARY_CLOUD_NAME) return

  const publicId = publicIdFromUrl(url)
  if (!publicId) {
    console.warn(`[Cloudinary] Could not parse public_id from URL: ${url}`)
    return
  }

  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceTypeFromUrl(url),
    })
  } catch (err) {
    console.error(`[Cloudinary] Failed to delete ${publicId}:`, err)
  }
}

/**
 * Helper for deleting many at once. Uses Promise.allSettled so one failure
 * doesn't abort the rest.
 */
export const deleteManyFromCloudinary = async (urls: Array<string | undefined | null>): Promise<void> => {
  await Promise.allSettled(urls.filter(Boolean).map((u) => deleteFromCloudinary(u)))
}

/* -------------------------------------------------------------------------- */
/*  KYC — private (authenticated) delivery                                     */
/* -------------------------------------------------------------------------- */

/**
 * Opaque reference to a private KYC asset. We persist the ENCRYPTED form of this
 * (see utils/crypto.ts) instead of any URL — so the DB never holds a resolvable
 * link to a citizenship document.
 */
export interface KycAssetRef {
  publicId: string
  resourceType: 'image' | 'raw' | 'video'
  format: string
}

/**
 * Upload a KYC document with `type: 'authenticated'` — a PRIVATE asset that
 * Cloudinary will NOT serve from a plain public URL. Access requires a signed,
 * time-limited download URL (see signedKycDownloadUrl). Returns the reference to
 * store (encrypted), never a URL.
 */
export const uploadKycToCloudinary = async (
  file: Express.Multer.File,
  folder: string
): Promise<KycAssetRef> => {
  if (!CLOUDINARY_CLOUD_NAME) {
    throw new Error('Cloudinary is not configured — set CLOUDINARY_* env vars')
  }

  const base64 = file.buffer.toString('base64')
  const dataUri = `data:${file.mimetype};base64,${base64}`

  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: 'auto',
    type: 'authenticated', // PRIVATE delivery — not resolvable by URL alone
  })

  return {
    publicId: result.public_id,
    resourceType: result.resource_type as KycAssetRef['resourceType'],
    // `format` is occasionally empty for raw uploads — fall back to the file extension
    format: result.format || file.originalname.split('.').pop() || '',
  }
}

/**
 * Mint a short-lived signed download URL for a private KYC asset. Generated ON
 * DEMAND per authorized request and never stored/reused. Default 5-minute expiry.
 *
 * Uses `private_download_url` (works on all Cloudinary plans, no auth-token add-on)
 * so the link stops resolving once `expires_at` passes.
 */
export const signedKycDownloadUrl = (ref: KycAssetRef, expiresInSeconds = 300): string => {
  if (!CLOUDINARY_CLOUD_NAME) {
    throw new Error('Cloudinary is not configured — set CLOUDINARY_* env vars')
  }
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds
  return cloudinary.utils.private_download_url(ref.publicId, ref.format, {
    resource_type: ref.resourceType,
    type: 'authenticated',
    expires_at: expiresAt,
    attachment: false, // display inline where the browser can
  })
}

/**
 * Delete a private KYC asset by reference. Unlike deleteFromCloudinary (which
 * parses a public URL and targets type 'upload'), this passes type:'authenticated'
 * so the private asset is actually found and destroyed. Never throws.
 */
export const deleteKycAsset = async (ref: KycAssetRef): Promise<void> => {
  if (!CLOUDINARY_CLOUD_NAME) return
  try {
    await cloudinary.uploader.destroy(ref.publicId, {
      resource_type: ref.resourceType,
      type: 'authenticated',
    })
  } catch (err) {
    console.error(`[Cloudinary] Failed to delete KYC asset ${ref.publicId}:`, err)
  }
}

export { cloudinary }
