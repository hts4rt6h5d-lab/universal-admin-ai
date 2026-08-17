import { css } from '../lib/css';

export default function AddSheet({ sources, onClose }) {
  const stop = (e) => e.stopPropagation();
  return (
    <div
      onClick={onClose}
      style={css('position:absolute;inset:0;z-index:40;background:color-mix(in srgb, #05060c 62%, transparent);display:flex;flex-direction:column;justify-content:flex-end')}
    >
      <div onClick={stop} style={{ ...css('background:var(--color-surface);border-radius:22px 22px 0 0;padding:10px 20px 26px'), animation: 'uaa-sheet .3s cubic-bezier(.2,.8,.2,1)' }}>
        <div style={css('width:40px;height:5px;border-radius:3px;background:color-mix(in srgb, var(--color-text) 24%, transparent);margin:0 auto 16px')}></div>
        <div style={css('font-size:20px;font-weight:600;margin-bottom:4px')}>Ajouter un document</div>
        <p style={css("font-size:14px;color:color-mix(in srgb, var(--color-text) 58%, transparent);margin:0 0 18px")}>L’assistant lira et comprendra votre document pour vous.</p>
        <div style={css('display:flex;flex-direction:column;gap:10px')}>
          {sources.map((sc) => (
            <button
              key={sc.label}
              onClick={sc.onClick}
              style={css('background:color-mix(in srgb, var(--color-text) 5%, transparent);border:1px solid var(--color-divider);border-radius:13px;padding:13px 14px;display:flex;align-items:center;gap:14px;cursor:pointer;color:var(--color-text)')}
            >
              <span style={css('width:42px;height:42px;flex:none;border-radius:11px;display:grid;place-items:center;background:color-mix(in srgb, var(--color-accent) 14%, transparent)')}>
                <i className={sc.icon} style={css('font-size:21px;color:var(--color-accent)')}></i>
              </span>
              <span style={css('flex:1;text-align:left')}>
                <span style={css('display:block;font-size:15px;font-weight:600')}>{sc.label}</span>
                <span style={css('display:block;font-size:12px;color:color-mix(in srgb, var(--color-text) 52%, transparent);margin-top:1px')}>{sc.sub}</span>
              </span>
              <i className="ph ph-caret-right" style={css('font-size:16px;color:color-mix(in srgb, var(--color-text) 40%, transparent)')}></i>
            </button>
          ))}
        </div>
        <p style={css('display:flex;align-items:center;justify-content:center;gap:6px;text-align:center;font-size:12px;color:color-mix(in srgb, var(--color-text) 42%, transparent);margin:16px 0 0')}>
          <i className="ph ph-stack"></i> Vous pouvez envoyer plusieurs documents à la fois.
        </p>
      </div>
    </div>
  );
}
