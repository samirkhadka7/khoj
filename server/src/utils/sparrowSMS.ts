/**
 * Sparrow SMS — Nepal SMS gateway integration.
 *
 * STEP 5 STUB: just logs to console so the contact-request flow can be tested
 * end-to-end without spending real SMS credits during development.
 *
 * STEP 14 will replace the body with the real Sparrow API call:
 *
 *   await axios.post('https://api.sparrowsms.com/v2/sms/', {
 *     token: process.env.SPARROW_SMS_TOKEN,
 *     from: 'BaasKhoj',
 *     to,
 *     text: message,
 *   })
 */

export const sendSMS = async (to: string, message: string): Promise<void> => {
  if (!to) return

  // Normalize phone — strip non-digits, ensure 977 country code
  const digits = to.replace(/\D/g, '')
  const normalized = digits.startsWith('977') ? digits : `977${digits}`

  // Stub: log instead of hitting Sparrow API.
  // Use a distinct prefix so it stands out in dev logs alongside [DB], [Server], etc.
  console.log(`[SMS Stub] → ${normalized}: ${message}`)
}
