// 付费墙弹层: 免费/Pro 对比 + Creem 订阅(跳转托管结账) + 激活码激活
import { useState } from 'react';
import { t } from '../i18n';
import { CREEM_PRODUCTS, CREEM_CONFIGURED, type ProPlan } from '../pay/config';
import { activateLicense, deactivateLicense } from '../pay/license';

interface Props {
  feature: string | null; // null => 关闭; '' => 通用定价(Pro徽标); 其他 => 具体锁定功能
  pro: boolean;
  onActivated: () => void;
  onDeactivated: () => void;
  onClose: () => void;
}

type Row = [freeKey: string, proKey: string];

export function PaywallModal({ feature, pro, onActivated, onDeactivated, onClose }: Props) {
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState<ProPlan | null>(null);

  if (feature === null) return null;
  const featureName = feature ? t(`pay.feature.${feature}`) : '';

  const rows: Row[] = [
    ['pay.comp.play', ''],
    ['pay.comp.score', ''],
    ['pay.comp.undo', ''],
    ['pay.comp.breakdown', ''],
    ['', 'pay.saved'],
    ['', 'pay.improvise'],
    ['', 'pay.custom'],
    ['', 'pay.advisor'],
  ];

  const doActivate = async () => {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    const r = await activateLicense(key);
    setBusy(false);
    if (r.ok) {
      onActivated();
      setMsg(t('pay.act.ok'));
      setKey('');
    } else {
      setMsg(t('pay.act.fail', { msg: r.message }));
    }
  };

  const doCheckout = async (plan: ProPlan) => {
    if (checkoutBusy) return;
    setCheckoutBusy(plan);
    setMsg(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: CREEM_PRODUCTS[plan] }),
      });
      const data = (await res.json()) as { checkoutUrl?: string; error?: string };
      if (res.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      setMsg(data.error ?? 'Checkout unavailable right now — try again in a moment.');
    } catch {
      setMsg('Checkout unavailable right now — try again in a moment.');
    } finally {
      setCheckoutBusy(null);
    }
  };

  return (
    <div className="paywall-overlay" onClick={onClose}>
      <div className="paywall-card" onClick={(e) => e.stopPropagation()}>
        <button className="paywall-close" onClick={onClose} title={t('pay.close.title')}>✕</button>

        <div className="paywall-title">
          <span className="paywall-lock">🔒</span>
          <div>
            <h3>{pro ? t('pay.active') : feature ? t('pay.title.lock') : t('pay.title.gen')}</h3>
            <p>{pro ? t('pay.activeSince') : feature ? t('pay.desc.lock', { feature: featureName }) : t('pay.desc.gen')}</p>
          </div>
        </div>

        <div className="paywall-compare">
          <div className="paywall-col head-free">{t('pay.comp.free')}</div>
          <div className="paywall-col head-pro">{t('pay.comp.pro')}</div>
          {rows.map(([f, p], i) => (
            <div key={i} className="paywall-row">
              <div className="paywall-cell">{f ? `✓ ${t(f)}` : ''}</div>
              <div className="paywall-cell pro">{p ? `✓ ${t(p)}` : <span className="paywall-dash">—</span>}</div>
            </div>
          ))}
        </div>

        {pro ? (
          <button className="paywall-deactivate" onClick={() => { deactivateLicense(); onDeactivated(); setMsg(null); }}>
            {t('pay.deactivate')}
          </button>
        ) : (
          <>
            <div className="paywall-buy">
              {CREEM_CONFIGURED ? (
                <>
                  <button
                    className="paywall-pay"
                    disabled={checkoutBusy !== null}
                    onClick={() => doCheckout('monthly')}
                  >
                    {checkoutBusy === 'monthly' ? t('pay.redirecting') : t('pay.buy.monthly')}
                  </button>
                  <button
                    className="paywall-pay ghost"
                    disabled={checkoutBusy !== null}
                    onClick={() => doCheckout('yearly')}
                  >
                    {checkoutBusy === 'yearly' ? t('pay.redirecting') : t('pay.buy.yearly')}
                  </button>
                </>
              ) : (
                <p className="paywall-setup">{t('pay.setup')}</p>
              )}
            </div>

            <div className="paywall-license">
              <label>{t('pay.license.title')}</label>
              <div className="paywall-license-row">
                <input
                  className="paywall-key-input"
                  value={key}
                  placeholder={t('pay.license.ph')}
                  onChange={(e) => setKey(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') doActivate(); }}
                />
                <button className="paywall-pay paywall-activate" disabled={busy} onClick={doActivate}>
                  {busy ? t('pay.activating') : t('pay.activate')}
                </button>
              </div>
              {msg && <p className="paywall-msg">{msg}</p>}
            </div>
          </>
        )}

        <button className="paywall-later" onClick={onClose}>{t('pay.close')}</button>
      </div>
    </div>
  );
}