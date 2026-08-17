import { css } from '../lib/css';

export default function Documents({ categories, recents, onOpenAdd }) {
  return (
    <div style={css('height:100%;overflow-y:auto;padding:46px 18px 22px')}>
      <div style={css('display:flex;align-items:center;justify-content:space-between;margin-bottom:14px')}>
        <h1 style={css('font-size:26px;margin:0;font-weight:600')}>Mes documents</h1>
        <button onClick={onOpenAdd} aria-label="Ajouter" style={css('border:0;cursor:pointer;width:40px;height:40px;border-radius:10px;background:var(--color-surface);display:grid;place-items:center;color:var(--color-accent)')}>
          <i className="ph ph-plus" style={css('font-size:20px')}></i>
        </button>
      </div>
      <div style={css('position:relative;margin-bottom:8px')}>
        <i className="ph ph-magnifying-glass" style={css('position:absolute;left:14px;top:50%;transform:translateY(-50%);color:color-mix(in srgb, var(--color-text) 50%, transparent);font-size:18px')}></i>
        <input className="input" placeholder="Rechercher dans mes documents" style={css('padding-left:42px;min-height:46px;border-radius:12px')} />
      </div>
      <p style={css('font-size:12px;color:color-mix(in srgb, var(--color-text) 42%, transparent);margin:0 0 20px')}>La recherche comprend le sens : essayez « mon assurance habitation ».</p>
      <div style={css('font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin-bottom:10px')}>Catégories</div>
      <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:22px')}>
        {categories.map((c) => (
          <button key={c.name} onClick={c.onClick} style={css('background:var(--color-surface);border:1px solid var(--color-divider);border-radius:14px;padding:12px;display:flex;align-items:center;gap:10px;cursor:pointer;min-height:60px;color:var(--color-text)')}>
            <span style={css('width:34px;height:34px;flex:none;border-radius:9px;display:grid;place-items:center;background:color-mix(in srgb, var(--color-accent) 13%, transparent)')}>
              <i className={c.icon} style={css('font-size:18px;color:var(--color-accent)')}></i>
            </span>
            <span style={css('flex:1;text-align:left')}>
              <span style={css('display:block;font-size:14px;font-weight:500')}>{c.name}</span>
              <span style={css('display:block;font-size:12px;color:color-mix(in srgb, var(--color-text) 50%, transparent)')}>{c.count}</span>
            </span>
          </button>
        ))}
      </div>
      <div style={css('font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin-bottom:10px')}>Récents</div>
      <div style={css('display:flex;flex-direction:column;gap:10px')}>
        {recents.map((r) => (
          <button key={r.name} onClick={r.onClick} style={css('background:var(--color-surface);border:1px solid var(--color-divider);border-radius:14px;padding:13px 14px;display:flex;align-items:center;gap:12px;cursor:pointer;color:var(--color-text)')}>
            <span style={css('width:38px;height:38px;flex:none;border-radius:9px;display:grid;place-items:center;background:color-mix(in srgb, var(--color-accent) 13%, transparent)')}>
              <i className="ph ph-file-text" style={css('font-size:19px;color:var(--color-accent)')}></i>
            </span>
            <span style={css('flex:1;text-align:left')}>
              <span style={css('display:block;font-size:15px;font-weight:500')}>{r.name}</span>
              <span style={css('display:block;font-size:12px;color:color-mix(in srgb, var(--color-text) 50%, transparent);margin-top:2px')}>{r.meta}</span>
            </span>
            <i className="ph ph-caret-right" style={css('font-size:16px;color:color-mix(in srgb, var(--color-text) 40%, transparent)')}></i>
          </button>
        ))}
      </div>
    </div>
  );
}
