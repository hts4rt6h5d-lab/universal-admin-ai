import { css } from '../lib/css';

const DOT_COLORS = { URGENT: 'oklch(0.68 0.15 25)', SOON: 'oklch(0.77 0.12 72)', PLANNED: 'oklch(0.74 0.11 158)' };

export default function Home({ tiles, onGoTasks, onGoProfile, onLangToast, onOpenAdd, userName, todayTasks = [] }) {
  return (
    <div style={css('height:100%;overflow-y:auto;padding:46px 18px 22px')}>
      <div style={css('display:flex;align-items:center;justify-content:space-between;margin-bottom:20px')}>
        <div style={css('display:flex;align-items:center;gap:10px')}>
          <div style={css('width:34px;height:34px;border-radius:9px;display:grid;place-items:center;background:color-mix(in srgb, var(--color-accent) 16%, transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--color-accent) 45%, transparent)')}>
            <i className="ph-fill ph-shield-check" style={css('font-size:19px;color:var(--color-accent)')}></i>
          </div>
          <span style={css('font-size:14px;font-weight:600;letter-spacing:.01em')}>Universal Admin AI</span>
        </div>
        <div style={css('display:flex;align-items:center;gap:4px')}>
          <button aria-label="Langue" onClick={onLangToast} style={css('background:none;border:0;cursor:pointer;width:38px;height:38px;border-radius:50%;display:grid;place-items:center;color:color-mix(in srgb, var(--color-text) 55%, transparent)')}>
            <i className="ph ph-globe" style={css('font-size:20px')}></i>
          </button>
          <button aria-label="Profil" onClick={onGoProfile} style={css('border:0;cursor:pointer;width:38px;height:38px;border-radius:50%;background:var(--color-surface);display:grid;place-items:center;font-weight:600;font-size:14px;color:var(--color-accent)')}>{(userName || '?')[0]?.toUpperCase()}</button>
        </div>
      </div>

      <h1 style={css('font-size:30px;margin:0 0 4px;font-weight:600;letter-spacing:-.02em')}>Bonjour {userName || ''}</h1>
      <p style={css('font-size:16px;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin:0 0 22px')}>Que puis-je faire pour vous aujourd’hui ?</p>

      <div style={css('background:var(--color-surface);border-radius:16px;padding:15px 16px 8px;margin-bottom:22px;box-shadow:var(--shadow-sm)')}>
        <div style={css('display:flex;align-items:center;justify-content:space-between;margin-bottom:6px')}>
          <span style={css('font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 55%, transparent)')}>Aujourd’hui</span>
          <span style={css('font-size:12px;color:var(--color-accent)')}>{todayTasks.length ? `${todayTasks.length} à traiter` : ''}</span>
        </div>
        {todayTasks.length === 0 && (
          <div style={css('display:flex;align-items:center;gap:10px;padding:11px 0;color:color-mix(in srgb, var(--color-text) 55%, transparent);font-size:14px')}>
            <i className="ph-fill ph-check-circle" style={css('color:oklch(0.74 0.11 158);font-size:18px')}></i> Tout est sous contrôle.
          </div>
        )}
        {todayTasks.map((t, i) => (
          <button
            key={t.id}
            onClick={onGoTasks}
            style={css(`width:100%;background:none;border:0;cursor:pointer;display:flex;align-items:center;gap:12px;padding:11px 0;text-align:left${i > 0 ? ';border-top:1px solid var(--color-divider)' : ''}`)}
          >
            <span style={{ ...css('width:10px;height:10px;border-radius:50%;flex:none'), background: DOT_COLORS[t.priority] || DOT_COLORS.PLANNED }}></span>
            <span style={css('flex:1')}>
              <span style={css('display:block;font-size:15px;font-weight:500;color:var(--color-text)')}>{t.title}</span>
              <span style={css('display:block;font-size:13px;color:color-mix(in srgb, var(--color-text) 55%, transparent)')}>{t.due}</span>
            </span>
            <i className="ph ph-caret-right" style={css('font-size:16px;color:color-mix(in srgb, var(--color-text) 40%, transparent)')}></i>
          </button>
        ))}
      </div>

      <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px')}>
        {tiles.map((t) => (
          <button
            key={t.label}
            onClick={t.onClick}
            style={css('background:var(--color-surface);border:1px solid var(--color-divider);border-radius:16px;padding:16px;cursor:pointer;text-align:left;display:flex;flex-direction:column;gap:10px;min-height:116px;color:var(--color-text)')}
          >
            <span style={css('width:42px;height:42px;border-radius:11px;display:grid;place-items:center;background:color-mix(in srgb, var(--color-accent) 14%, transparent)')}>
              <i className={t.icon} style={css('font-size:22px;color:var(--color-accent)')}></i>
            </span>
            <span style={css('margin-top:auto')}>
              <span style={css('display:block;font-size:15px;font-weight:600;line-height:1.25')}>{t.label}</span>
              <span style={css('display:block;font-size:12px;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin-top:2px')}>{t.sub}</span>
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={onOpenAdd}
        style={{ ...css('width:100%;min-height:58px;display:flex;align-items:center;justify-content:center;gap:10px;border-radius:15px;cursor:pointer;font-size:17px;font-weight:600;color:var(--color-accent);background:color-mix(in srgb, var(--color-accent) 12%, transparent);border:1px solid var(--color-accent);box-shadow:0 12px 34px -14px color-mix(in srgb, var(--color-accent) 70%, transparent)'), fontFamily: 'var(--font-heading)' }}
      >
        <i className="ph ph-plus" style={css('font-size:20px')}></i> Ajouter un document
      </button>
      <p style={css('display:flex;align-items:center;justify-content:center;gap:6px;font-size:12px;color:color-mix(in srgb, var(--color-text) 42%, transparent);margin:12px 0 0')}>
        <i className="ph ph-lock-simple"></i> Vos documents sont chiffrés et privés.
      </p>
    </div>
  );
}
