import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { css } from '../../lib/css';
import { ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';

const inputStyle = css('width:100%;min-height:48px;padding:0 14px;border-radius:12px;background:var(--color-surface);border:1px solid var(--color-divider);color:var(--color-text);font-size:15px;font-family:var(--font-body)');
const labelStyle = css('display:block;font-size:12px;color:color-mix(in srgb, var(--color-text) 65%, transparent);margin-bottom:6px');
const fieldWrap = css('margin-bottom:14px');

export default function LoginScreen({ onSwitchToSignup }) {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(emailOrPhone, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={css('height:100%;overflow-y:auto;padding:56px 22px 26px')}>
      <h1 style={css('font-size:28px;margin:0 0 26px;font-weight:600')}>{t('auth.loginTitle')}</h1>
      <form onSubmit={handleSubmit}>
        <div style={fieldWrap}>
          <label style={labelStyle}>{t('auth.emailOrPhone')}</label>
          <input style={inputStyle} value={emailOrPhone} onChange={(e) => setEmailOrPhone(e.target.value)} required autoFocus />
        </div>
        <div style={fieldWrap}>
          <label style={labelStyle}>{t('auth.password')}</label>
          <input style={inputStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p style={css('color:oklch(0.7 0.18 25);font-size:13px;margin:0 0 14px')}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{ ...css('width:100%;min-height:52px;border-radius:14px;border:1px solid var(--color-accent);background:color-mix(in srgb, var(--color-accent) 12%, transparent);color:var(--color-accent);font-weight:600;font-size:16px;cursor:pointer'), opacity: loading ? 0.6 : 1 }}
        >
          {t('auth.login')}
        </button>
        <button type="button" onClick={onSwitchToSignup} style={css('width:100%;background:none;border:0;cursor:pointer;padding:14px;font-size:13px;color:color-mix(in srgb, var(--color-text) 55%, transparent)')}>
          {t('auth.createAccount')}
        </button>
      </form>
    </div>
  );
}
