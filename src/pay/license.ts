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

// === Pro 功能免费试用计数 ===
// 未激活 Pro 的用户，Pro 功能可以免费试用 TRIAL_LIMIT 次；超过后弹付费墙。
// 已激活 Pro 的用户不受此计数影响。
const TRIAL_KEY = 'redcenter.pro.trial';
export const TRIAL_LIMIT = 5;

export function getTrialUsed(): number {
  try {
    const n = parseInt(localStorage.getItem(TRIAL_KEY) ?? '0', 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function setTrialUsed(n: number): void {
  try {
    localStorage.setItem(TRIAL_KEY, String(n));
  } catch {
    /* ignore */
  }
}

/**
 * 尝试使用一个 Pro 功能。
 * - 已激活 Pro：返回 true，不计次数。
 * - 未激活但仍在试用次数内：计数 +1，返回 true。
 * - 试用次数用完：返回 false（调用方应弹付费墙）。
 */
export function tryProFeature(): boolean {
  if (isPro()) return true;
  const used = getTrialUsed();
  if (used < TRIAL_LIMIT) {
    setTrialUsed(used + 1);
    return true;
  }
  return false;
}