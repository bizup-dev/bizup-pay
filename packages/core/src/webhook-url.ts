/**
 * Generate a webhook URL with an embedded secret for authentication.
 *
 * Since most Israeli payment providers don't support webhook signatures,
 * embedding a secret in the URL is a simple way to verify that webhook
 * requests originate from the provider (who received the URL during session creation).
 *
 * @example
 * ```ts
 * import { buildWebhookUrl } from '@bizup-pay/core'
 *
 * const webhookUrl = buildWebhookUrl('https://myapp.com/api/webhook', 'my-secret-key')
 * // → 'https://myapp.com/api/webhook?bizup_secret=my-secret-key'
 *
 * // In your webhook handler, verify the secret:
 * import { verifyWebhookSecret } from '@bizup-pay/core'
 * if (!verifyWebhookSecret(req.url, 'my-secret-key')) {
 *   return new Response('Unauthorized', { status: 401 })
 * }
 * ```
 */
export function buildWebhookUrl(
  baseUrl: string,
  secret: string,
  paramName = 'bizup_secret',
): string {
  const url = new URL(baseUrl)
  url.searchParams.set(paramName, secret)
  return url.toString()
}

/**
 * Verify that a webhook request URL contains the expected secret.
 * Use this in your webhook handler to reject unauthorized requests.
 */
export function verifyWebhookSecret(
  requestUrl: string,
  expectedSecret: string,
  paramName = 'bizup_secret',
): boolean {
  try {
    const url = new URL(requestUrl)
    const actual = url.searchParams.get(paramName)
    if (!actual || !expectedSecret) return false
    // Constant-time comparison to prevent timing attacks
    if (actual.length !== expectedSecret.length) return false
    let result = 0
    for (let i = 0; i < actual.length; i++) {
      result |= actual.charCodeAt(i) ^ expectedSecret.charCodeAt(i)
    }
    return result === 0
  } catch {
    return false
  }
}
