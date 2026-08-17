import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { css } from '../../lib/css';
import { api, ApiError } from '../../api/client';

function formatEur(cents) {
  return (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' €';
}

function PlanCard({ plan, promo, paymentsConfigured, onChoose, loading, t }) {
  const isPremium = plan.code === 'PREMIUM';
  return (
    <div
      style={{
        ...css('border-radius:18px;padding:20px;margin-bottom:14px;background:var(--color-surface)'),
        boxShadow: isPremium ? '0 0 0 2px var(--color-accent)' : '0 0 0 1px var(--color-divider)',
        position: 'relative',
      }}
    >
      {isPremium && (
        <span style={css('position:absolute;top:-11px;right:16px;background:var(--color-accent);color:var(--color-bg);font-size:11px;font-weight:700;letter-spacing:.04em;padding:3px 10px;border-radius:999px')}>
          {t('subscription.recommended')}
        </span>
      )}
      <div style={css('font-size:18px;font-weight:600;margin-bottom:4px')}>{t(`subscription.${plan.code.toLowerCase()}`)}</div>
      {isPremium && promo?.eligible ? (
        <>
          <div style={css('font-size:13px;color:var(--color-accent);margin-bottom:2px')}>{t('subscription.promoBanner')}</div>
          <div style={css('font-size:28px;font-weight:700;margin-bottom:2px')}>{formatEur(promo.firstChargeCents)}</div>
          <div style={css('font-size:13px;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin-bottom:16px')}>
            {t('subscription.firstMonthPrice', { price: formatEur(promo.firstChargeCents) })} · {t('subscription.thenPrice', { price: formatEur(plan.priceCents) })}
          </div>
        </>
      ) : (
        <div style={css('font-size:28px;font-weight:700;margin-bottom:16px')}>
          {formatEur(plan.priceCents)}<span style={css('font-size:13px;font-weight:400;color:color-mix(in srgb, var(--color-text) 55%, transparent)')}>{t('subscription.perMonth')}</span>
        </div>
      )}
      <button
        onClick={() => onChoose(plan.code)}
        disabled={loading || !paymentsConfigured}
        style={{
          ...css('width:100%;min-height:48px;border-radius:12px;font-weight:600;font-size:15px;cursor:pointer;border:1px solid var(--color-accent)'),
          background: isPremium ? 'var(--color-accent)' : 'transparent',
          color: isPremium ? 'var(--color-bg)' : 'var(--color-accent)',
          opacity: loading || !paymentsConfigured ? 0.5 : 1,
        }}
      >
        {t(`subscription.choose${plan.code === 'PREMIUM' ? 'Premium' : 'Standard'}`)}
      </button>
      {!paymentsConfigured && (
        <p style={css('font-size:11px;color:color-mix(in srgb, var(--color-text) 45%, transparent);margin:8px 0 0;text-align:center')}>{t('subscription.configurationRequired')}</p>
      )}
    </div>
  );
}

export default function SubscriptionScreen() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/subscriptions/plans').then(setData).catch(() => setData(null));
  }, []);

  async function choose(planCode) {
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/subscriptions/checkout', { planCode });
      if (res.url) window.location.href = res.url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  }

  if (!data) return <div style={css('height:100%;display:grid;place-items:center')}><span style={css('font-size:13px;color:color-mix(in srgb, var(--color-text) 55%, transparent)')}>…</span></div>;

  return (
    <div style={css('height:100%;overflow-y:auto;padding:56px 20px 26px')}>
      <h1 style={css('font-size:26px;margin:0 0 4px;font-weight:600')}>{t('subscription.title')}</h1>
      <p style={css('font-size:13px;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin:0 0 22px')}>{t('subscription.subtitle')}</p>
      {error && <p style={css('color:oklch(0.7 0.18 25);font-size:13px;margin:0 0 14px')}>{error}</p>}
      {data.plans.map((plan) => (
        <PlanCard key={plan.code} plan={plan} promo={data.promo} paymentsConfigured={data.paymentsConfigured} onChoose={choose} loading={loading} t={t} />
      ))}
    </div>
  );
}
