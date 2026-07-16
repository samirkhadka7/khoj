import type { Request, Response } from 'express'
import { User } from '../models'
import { asyncHandler } from '../utils/asyncHandler'
import { encrypt, decrypt } from '../utils/crypto'
import {
  generateTotpSecret,
  buildOtpAuthUrl,
  buildQrDataUrl,
  verifyTotp,
  generateBackupCodes,
  matchAndConsumeBackupCode,
} from '../utils/mfa'

/* -------------------------------------------------------------------------- */
/*  POST /api/auth/mfa/setup   (protected)                                    */
/*  Step 1 of enrollment: generate a secret, store it ENCRYPTED but PENDING,  */
/*  and return the QR + manual key for the user's authenticator app.          */
/* -------------------------------------------------------------------------- */
export const setupMfa = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.userId).select('email mfaEnabled')
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' })
    return
  }
  if (user.mfaEnabled) {
    res.status(400).json({ success: false, message: 'MFA is already enabled' })
    return
  }

  // Fresh secret every time setup is called — a half-finished previous attempt is
  // harmlessly overwritten. The secret is encrypted at rest immediately.
  const secret = generateTotpSecret()
  await User.updateOne({ _id: user._id }, { $set: { mfaPendingSecret: encrypt(secret) } })

  const otpauthUrl = buildOtpAuthUrl(secret, user.email)
  const qrDataUrl = await buildQrDataUrl(otpauthUrl)

  // We return the plaintext secret ONLY here, over the user's authenticated
  // session, so they can scan the QR or type the key. It is never persisted in
  // the clear and never returned again after enable.
  res.json({
    success: true,
    data: {
      qrDataUrl,
      otpauthUrl,
      secret, // for manual entry if the QR can't be scanned
    },
  })
})

/* -------------------------------------------------------------------------- */
/*  POST /api/auth/mfa/enable   (protected)  body: { token }                  */
/*  Step 2: user proves the authenticator is synced by submitting one code.   */
/*  On success we promote the pending secret and issue one-time backup codes.  */
/* -------------------------------------------------------------------------- */
export const enableMfa = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body as { token?: string }
  if (!token) {
    res.status(400).json({ success: false, message: 'Authenticator code is required' })
    return
  }

  const user = await User.findById(req.user!.userId).select('+mfaPendingSecret mfaEnabled')
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' })
    return
  }
  if (user.mfaEnabled) {
    res.status(400).json({ success: false, message: 'MFA is already enabled' })
    return
  }
  if (!user.mfaPendingSecret) {
    res.status(400).json({ success: false, message: 'Start MFA setup first' })
    return
  }

  const secret = decrypt(user.mfaPendingSecret)
  if (!(await verifyTotp(token, secret))) {
    // Wrong code — do NOT enable. The pending secret stays so they can retry.
    res.status(400).json({ success: false, message: 'Invalid authenticator code' })
    return
  }

  // Passed — promote pending -> active, mint backup codes (shown once).
  const { plain, hashed } = generateBackupCodes()
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        mfaEnabled: true,
        mfaSecret: user.mfaPendingSecret, // already encrypted
        mfaEnabledAt: new Date(),
        mfaBackupCodes: hashed,
      },
      $unset: { mfaPendingSecret: 1 },
    }
  )

  res.json({
    success: true,
    data: {
      mfaEnabled: true,
      // Show these ONCE. They are hashed at rest and cannot be recovered later.
      backupCodes: plain,
    },
  })
})

/* -------------------------------------------------------------------------- */
/*  POST /api/auth/mfa/disable   (protected)  body: { code }                  */
/*  Requires a valid current TOTP (or an unused backup code) — proves the      */
/*  requester possesses the second factor, so a hijacked session alone can't   */
/*  silently switch MFA off.                                                    */
/* -------------------------------------------------------------------------- */
export const disableMfa = asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.body as { code?: string }
  if (!code) {
    res.status(400).json({ success: false, message: 'A current MFA code is required to disable' })
    return
  }

  const user = await User.findById(req.user!.userId).select(
    '+mfaSecret +mfaBackupCodes mfaEnabled'
  )
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' })
    return
  }
  if (!user.mfaEnabled || !user.mfaSecret) {
    res.status(400).json({ success: false, message: 'MFA is not enabled' })
    return
  }

  const totpOk = await verifyTotp(code, decrypt(user.mfaSecret))
  const backupOk = totpOk ? -1 : await matchAndConsumeBackupCode(code, user.mfaBackupCodes)
  if (!totpOk && backupOk === -1) {
    res.status(400).json({ success: false, message: 'Invalid MFA code' })
    return
  }

  await User.updateOne(
    { _id: user._id },
    {
      $set: { mfaEnabled: false },
      $unset: { mfaSecret: 1, mfaPendingSecret: 1, mfaBackupCodes: 1, mfaEnabledAt: 1 },
    }
  )

  res.json({ success: true, data: { mfaEnabled: false } })
})
