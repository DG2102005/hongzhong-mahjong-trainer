// Cloudflare Pages Function: 代理 Creem 激活码激活（保护 API key）
// 用法:  POST /api/licenses/activate  body: { "key": "XXXX-...", "instance_name": "..." }
//  成功 → 200 { ok: true, instanceId, key }
//  失败 → 200 { ok: false, message }（前端统一展示; 4xx 也转成该结构）
// 环境变量: CREEM_API_KEY(必填), CREEM_API_BASE(可选, 默认 https://test-api.creem.io)

export async function onRequestPost(context) {
  const { env, request } = context;
  if (!env.CREEM_API_KEY) {
    return new Response(JSON.stringify({ ok: false, message: 'Server not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  const body = await request.json().catch(() => null);
  const key = String(body?.key || '').trim();
  const instanceName = String(body?.instance_name || '').trim() || 'hongzhong-mahjong-trainer';
  if (!key) {
    return new Response(JSON.stringify({ ok: false, message: 'Empty license key' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const base = env.CREEM_API_BASE || 'https://test-api.creem.io';
  const res = await fetch(`${base}/v1/licenses/activate`, {
    method: 'POST',
    headers: {
      'x-api-key': env.CREEM_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ key, instance_name: instanceName }),
  });
  const data = await res.json().catch(() => null);

  if (res.ok && data && (data.status === 'active' || data.key)) {
    return new Response(JSON.stringify({ ok: true, key: data.key, instanceId: data.instance?.id }), { headers: { 'Content-Type': 'application/json' } });
  }
  const msg =
    (data && (data.message || data.error)) ||
    (res.status === 403 ? 'License reached activation limit' :
     res.status === 404 ? 'Invalid license key' :
     res.status === 410 ? 'License expired' :
     `Activation failed (${res.status})`);
  return new Response(JSON.stringify({ ok: false, message: msg }), { headers: { 'Content-Type': 'application/json' } });
}