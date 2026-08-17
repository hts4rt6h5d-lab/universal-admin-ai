import { css } from '../lib/css';

export default function BottomNav({ navItems, showChrome }) {
  return (
    <div style={css('position:absolute;left:0;right:0;bottom:0;height:72px;z-index:20;background:color-mix(in srgb, var(--color-surface) 90%, var(--color-bg));backdrop-filter:blur(14px);border-top:1px solid var(--color-divider);padding:8px 8px 0')}>
      <div style={css('display:flex;justify-content:space-around;align-items:center')}>
        {navItems.map((n) => (
          <button
            key={n.label}
            onClick={n.onClick}
            aria-label={n.label}
            style={{ ...css('background:none;border:0;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;padding:4px 6px;min-width:52px'), color: n.navColor }}
          >
            <i className={n.iconClass} style={css('font-size:22px')}></i>
            <span style={css('font-size:11px;font-weight:500')}>{n.label}</span>
          </button>
        ))}
      </div>
      {showChrome && (
        <div style={css('width:128px;height:5px;border-radius:3px;background:color-mix(in srgb, var(--color-text) 28%, transparent);margin:5px auto 0')}></div>
      )}
    </div>
  );
}
