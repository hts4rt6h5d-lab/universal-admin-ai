import { useEffect, useState } from 'react';
import { css } from '../lib/css';
import { api } from '../api/client';

const PLAN_PRICE_CENTS = { STANDARD: 10000, PREMIUM: 20000 };

function formatEur(cents) {
  return (cents / 100).toLocaleString('fr-FR') + ' €';
}

export default function Profile({ settingsRows, user, plan, onLogout, onManageToast }) {
  const [subscription, setSubscription] = useState(null);
  const [paymentsConfigured, setPaymentsConfigured] = useState(true);

  useEffect(() => {
    api
      .get('/subscriptions/me')
      .then((d) => {
        setSubscription(d.subscription);
        setPaymentsConfigured(d.paymentsConfigured);
      })
      .catch(() => {});
  }, []);

  async function manage() {
    if (!paymentsConfigured) {
      onManageToast?.('Le paiement (Stripe) n’est pas encore configuré sur ce serveur.');
      return;
    }
    try {
      const res = await api.post('/subscriptions/billing-portal');
      if (res.url) window.location.href = res.url;
    } catch {
      onManageToast?.('Gestion de l’abonnement indisponible pour le moment.');
    }
  }

  return (
    <div style={css('height:100%;overflow-y:auto;padding:46px 18px 22px')}>
      <h1 style={css('font-size:26px;margin:0 0 18px;font-weight:600')}>Profil</h1>
      <div style={css('display:flex;align-items:center;gap:14px;margin-bottom:20px')}>
        <div style={css('width:60px;height:60px;border-radius:50%;background:color-mix(in srgb, var(--color-accent) 18%, transparent);display:grid;place-items:center;font-size:22px;font-weight:600;color:var(--color-accent)')}>
          {(user?.firstName || '?')[0]?.toUpperCase()}
        </div>
        <div>
          <div style={css('font-size:18px;font-weight:600')}>{user?.firstName}</div>
          <div style={css('font-size:14px;color:color-mix(in srgb, var(--color-text) 55%, transparent)')}>{user?.email || user?.phone}</div>
        </div>
      </div>

      <div style={css('border-radius:16px;padding:16px;margin-bottom:22px;background:color-mix(in srgb, var(--color-accent) 10%, transparent);box-shadow:0 0 0 1px color-mix(in srgb, var(--color-accent) 35%, transparent)')}>
        <div style={css('display:flex;align-items:center;justify-content:space-between;margin-bottom:6px')}>
          <span className={`tag ${plan === 'PREMIUM' ? 'tag-accent' : 'tag-neutral'}`}>{plan || 'AUCUN ABONNEMENT'}</span>
          {plan && <span style={css('font-size:20px;font-weight:700')}>{formatEur(PLAN_PRICE_CENTS[plan])}<span style={css('font-size:12px;font-weight:400;color:color-mix(in srgb, var(--color-text) 55%, transparent)')}> /mois</span></span>}
        </div>
        <div style={css('font-size:13px;color:color-mix(in srgb, var(--color-text) 60%, transparent);margin-bottom:12px')}>
          {subscription?.currentPeriodEnd
            ? `Prochaine facturation le ${new Date(subscription.currentPeriodEnd).toLocaleDateString('fr-FR')}`
            : subscription?.cancelAtPeriodEnd
              ? "Abonnement en cours d'annulation"
              : 'Statut de facturation indisponible'}
        </div>
        <button onClick={manage} className="btn btn-secondary btn-block" style={css('min-height:44px')}>Gérer l’abonnement</button>
        {!paymentsConfigured && (
          <p style={css('font-size:11px;color:color-mix(in srgb, var(--color-text) 45%, transparent);margin:8px 0 0;text-align:center')}>Paiement non configuré sur ce serveur de démonstration.</p>
        )}
      </div>

      <div style={css('display:flex;flex-direction:column;background:var(--color-surface);border-radius:14px;padding:4px;margin-bottom:16px')}>
        {settingsRows.map((sr) => (
          <button key={sr.label} onClick={sr.onClick} style={css('border:0;background:none;cursor:pointer;display:flex;align-items:center;gap:12px;padding:13px 12px;color:var(--color-text);text-align:left')}>
            <i className={sr.icon} style={css('font-size:19px;color:var(--color-accent);width:22px')}></i>
            <span style={css('flex:1;font-size:15px')}>{sr.label}</span>
            <span style={css('font-size:13px;color:color-mix(in srgb, var(--color-text) 50%, transparent)')}>{sr.value}</span>
            <i className="ph ph-caret-right" style={css('font-size:15px;color:color-mix(in srgb, var(--color-text) 40%, transparent)')}></i>
          </button>
        ))}
      </div>
      <button onClick={onLogout} style={css('width:100%;background:none;border:0;cursor:pointer;padding:12px;font-size:14px;color:color-mix(in srgb, var(--color-text) 55%, transparent)')}>Se déconnecter</button>
    </div>
  );
}
