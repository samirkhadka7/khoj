/**
 * hCaptcha server-side verification (Feature 2).
 *
 * We ALWAYS verify the token with hCaptcha's siteverify endpoint — never trust a
 * client-side pass/fail. The token is single-use and short-lived.
 *
 * Keys:
 *   - Dev/CI default to hCaptcha's official TEST secret, which always passes for
 *     the test sitekey's token — so the flow works with no real credentials.
 *   - Production sets HCAPTCHA_SECRET (and the client sets NEXT_PUBLIC_HCAPTCHA_SITEKEY)
 *     to the real keys from the hCaptcha dashboard.
 */

const SITEVERIFY_URL = 'https://api.hcaptcha.com/siteverify'
// hCaptcha's documented always-pass test secret (paired with the test sitekey).
const TEST_SECRET = '0x0000000000000000000000000000000000000000'

export const hcaptchaSecret = (): string => process.env.HCAPTCHA_SECRET || TEST_SECRET

/** True when real (non-test) keys are configured — useful for logging/diagnostics. */
export const isHcaptchaProduction = (): boolean =>
  !!process.env.HCAPTCHA_SECRET && process.env.HCAPTCHA_SECRET !== TEST_SECRET

interface SiteVerifyResponse {
  success?: boolean
  'error-codes'?: string[]
}

/**
 * Verify an hCaptcha response token. Returns true only if hCaptcha confirms it.
 * Fails CLOSED (returns false) on a missing token or any network/parse error.
 */
export const verifyHcaptcha = async (
  token: string | undefined | null,
  remoteip?: string
): Promise<boolean> => {
  if (!token) return false

  const params = new URLSearchParams({ secret: hcaptchaSecret(), response: token })
  if (remoteip) params.set('remoteip', remoteip)

  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })
    const data = (await res.json()) as SiteVerifyResponse
    return data.success === true
  } catch {
    return false // fail closed — a verification outage must not let requests through
  }
}
