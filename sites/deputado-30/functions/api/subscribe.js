// Cloudflare Pages Function — POST /api/subscribe
// Stores newsletter subscribers in a KV namespace (binding: NEWSLETTER_KV).
//
// Local dev:  npx wrangler pages dev . --kv NEWSLETTER_KV
// Deploy:     npm run deploy   (see wrangler.toml for the KV binding)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * @param {Request} request
 * @param {{ env: Record<string, any> }} context
 */
export async function onRequestPost({ request, env }) {
  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders()
    })
  }

  const origin = request.headers.get('Origin')
  const headers = corsHeaders(origin)

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body.email !== 'string') {
      return json({ error: 'E-mail é obrigatório.' }, 400, headers)
    }

    const email = body.email.trim().toLowerCase()
    if (!EMAIL_RE.test(email)) {
      return json({ error: 'Informe um e-mail válido.' }, 400, headers)
    }

    const record = {
      email,
      name: typeof body.name === 'string' ? body.name.trim() : '',
      slug: typeof body.slug === 'string' ? body.slug : '',
      source: 'site-newsletter',
      subscribedAt: new Date().toISOString()
    }

    if (env && env.NEWSLETTER_KV) {
      // KV namespace configured — persist the subscription
      const existing = await env.NEWSLETTER_KV.get(email)
      if (existing) {
        // Already subscribed: update metadata but don't error
        await env.NEWSLETTER_KV.put(email, JSON.stringify(record))
        return json({ ok: true, alreadySubscribed: true, email }, 200, headers)
      }
      await env.NEWSLETTER_KV.put(email, JSON.stringify(record))
      return json({ ok: true, alreadySubscribed: false, email }, 201, headers)
    }

    // KV not configured (e.g. dev without binding) — still answer OK so the
    // thank-you flow works; log for visibility.
    console.log('subscribe(nopersistence):', JSON.stringify(record))
    return json({ ok: true, alreadySubscribed: false, email, persistence: false }, 201, headers)
  } catch (err) {
    return json({ error: 'Não foi possível concluir. Tente novamente.' }, 500, headers)
  }
}

// Also accept GET (used for quick links / health check)
export async function onRequestGet() {
  return json({ ok: true, message: 'Newsletter endpoint ativo. Use POST.' })
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  }
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  })
}
