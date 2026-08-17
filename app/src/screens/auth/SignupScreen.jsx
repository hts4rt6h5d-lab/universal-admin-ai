import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { css } from '../../lib/css';
import { api, ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';

const inputStyle = css('width:100%;min-height:48px;padding:0 14px;border-radius:12px;background:var(--color-surface);border:1px solid var(--color-divider);color:var(--color-text);font-size:15px;font-family:var(--font-body)');
const labelStyle = css('display:block;font-size:12px;color:color-mix(in srgb, var(--color-text) 65%, transparent);margin-bottom:6px');
const fieldWrap = css('margin-bottom:14px');

export default function SignupScreen({ onSwitchToLogin }) {
  const { t } = useTranslation();
  const { signup } = useAuth();
  const [countries, setCountries] = useState([]);
  const [firstName, setFirstName] = useState('');
  const [countryCode, setCountryCode] = useState('FR');
  const [useEmail, setUseEmail] = useState(true);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/countries').then((d) => setCountries(d.countries)).catch(() => setCountries([]));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup({
        firstName,
        countryCode,
        email: useEmail ? email : undefined,
        phone: useEmail ? undefined : phone,
        password,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={css('height:100%;overflow-y:auto;padding:56px 22px 26px')}>
      <h1 style={css('font-size:28px;margin:0 0 6px;font-weight:600')}>{t('auth.signupTitle')}</h1>
      <p style={css('font-size:14px;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin:0 0 26px')}>{t('welcome.subtitle')}</p>

      <form onSubmit={handleSubmit}>
        <div style={fieldWrap}>
          <label style={labelStyle}>{t('auth.firstName')}</label>
          <input style={inputStyle} value={firstName} onChange={(e) => setFirstName(e.target.value)} required maxLength={80} />
        </div>

        <div style={fieldWrap}>
          <label style={labelStyle}>{t('auth.country')}</label>
          <select style={inputStyle} value={countryCode} onChange={(e) => setCountryCode(e.target.value)}>
            {countries.length === 0 && <option value="FR">France</option>}
            {countries.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button type="button" onClick={() => setUseEmail(true)} style={{ ...css('flex:1;min-height:36px;border-radius:999px;font-size:13px;cursor:pointer;border:1px solid var(--color-divider)'), background: useEmail ? 'var(--color-accent)' : 'transparent', color: useEmail ? 'var(--color-bg)' : 'var(--color-text)' }}>
            {t('auth.email')}
          </button>
          <button type="button" onClick={() => setUseEmail(false)} style={{ ...css('flex:1;min-height:36px;border-radius:999px;font-size:13px;cursor:pointer;border:1px solid var(--color-divider)'), background: !useEmail ? 'var(--color-accent)' : 'transparent', color: !useEmail ? 'var(--color-bg)' : 'var(--color-text)' }}>
            {t('auth.phone')}
          </button>
        </div>

        {useEmail ? (
          <div style={fieldWrap}>
            <label style={labelStyle}>{t('auth.email')}</label>
            <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
        ) : (
          <div style={fieldWrap}>
            <label style={labelStyle}>{t('auth.phone')}</label>
            <input style={inputStyle} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
        )}

        <div style={fieldWrap}>
          <label style={labelStyle}>{t('auth.password')}</label>
          <input style={inputStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={10} />
        </div>

        {error && <p style={css('color:oklch(0.7 0.18 25);font-size:13px;margin:0 0 14px')}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          style={{ ...css('width:100%;min-height:52px;border-radius:14px;border:1px solid var(--color-accent);background:color-mix(in srgb, var(--color-accent) 12%, transparent);color:var(--color-accent);font-weight:600;font-size:16px;cursor:pointer'), opacity: loading ? 0.6 : 1 }}
        >
          {t('auth.createAccount')}
        </button>
        <button type="button" onClick={onSwitchToLogin} style={css('width:100%;background:none;border:0;cursor:pointer;padding:14px;font-size:13px;color:color-mix(in srgb, var(--color-text) 55%, transparent)')}>
          {t('auth.alreadyHaveAccount')}
        </button>
      </form>
    </div>
  );
}
