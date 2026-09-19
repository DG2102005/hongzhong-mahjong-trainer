// Pro 激活码管理: 通过 Cloudflare Pages Function 代理调用 Creem License API
// (Creem 的许可证接口需要服务端 API key, 不能放前端; 代理保持在同域 /api/licenses/*)
const KEY = 'redcenter.pro.license';

type Stored = { key: string; instanceId?: string };

function load(): Stored | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

let cached: Stored | null = load();

export function isPro(): boolean {
  return cached !== null;
}

export function getLicenseKey(): string | null {
  return cached?.key ?? null;
}

export type ActivateResult = { ok: boolean; message: string };

export async function activateLicense(key: string): Promise<ActivateResult> {
  const k = key.trim();
  if (!k) return { ok: false, message: 'Empty license key' };
  try {
    const res = await fetch('/api/licenses/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: k, instance_name: 'hongzhong-mahjong-trainer' }),
    });
    if (!res.ok) {
      return { ok: false, message: `Server error (${res.status})` };
    }
    const data = (await res.json()) as { ok: boolean; message?: string; instanceId?: string };
    if (data.ok) {
      cached = { key: k, instanceId: data.instanceId };
      try {
        localStorage.setItem(KEY, JSON.stringify(cached));
      } catch {
        /* ignore */
      }
      return { ok: true, message: 'ok' };
    }
    return { ok: false, message: data.message ?? 'Invalid license key' };
  } catch {
    return { ok: false, message: 'Network error — check connection' };
  }
}

export function deactivateLicense(): void {
  cached = null;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}