// Cloudflare Pages Function: 创建 Creem checkout session（代理，保护 API key）
// 用法:  POST /api/checkout  body: { "productId": "prod_xxx" }   →  { "checkoutUrl": "..." }
//        GET /api/checkout?productId=prod_xxx                    →  302 重定向到结账页
// 环境变量: CREEM_API_KEY(必填), CREEM_API_BASE(可选, 默认测试环境 https://test-api.creem.io; 上线改为 https://api.creem.io), APP_URL(可选, 支付成功回跳地址)

function readBody(method, request) {
  if (method !== 'POST') return { productId: null };
  return request.json().then((b) => ({ productId: b?.productId })).catch(() => ({ productId: null }));
}

function checkoutUrlOf(data) {
  if (!data) return null;
  return data.checkout_url || data.checkoutUrl || data.url || null;
}

async function createCheckout(env, productId, origin) {
  const base = env.CREEM_API_BASE || 'https://test-api.creem.io';
  const successUrl = env.APP_URL || origin;
  const res = await fetch(`${base}/v1/checkouts`, {
    method: 'POST',
    headers: {
      'x-api-key': env.CREEM_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product_id: productId,
      success_url: successUrl,
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data && (data.message || data.error)) || `Creem error (${res.status})`;
    return { ok: false, status: res.status, error: err };
  }
  return { ok: true, checkoutUrl: checkoutUrlOf(data) };
}

async function handle(env, request, productId) {
  if (!env.CREEM_API_KEY) return new Response(JSON.stringify({ error: 'Missing CREEM_API_KEY' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  if (!productId) return new Response(JSON.stringify({ error: 'Missing productId' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  const origin = request.headers.get('Origin') || new URL(request.url).origin;
  const out = await createCheckout(env, productId, origin);
  if (!out.ok) return new Response(JSON.stringify({ error: out.error }), { status: out.status, headers: { 'Content-Type': 'application/json' } });
  return out.checkoutUrl
    ? new Response(JSON.stringify({ checkoutUrl: out.checkoutUrl }), { headers: { 'Content-Type': 'application/json' } })
    : new Response(JSON.stringify({ error: 'Creem returned no checkout URL' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
}

export async function onRequestPost(context) {
  const { productId } = await readBody('POST', context.request);
  return handle(context.env, context.request, productId);
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  return handle(context.env, context.request, url.searchParams.get('productId'));
}