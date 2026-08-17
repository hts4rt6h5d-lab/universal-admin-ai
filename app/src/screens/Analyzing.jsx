import { css } from '../lib/css';

export default function Analyzing({ steps }) {
  return (
    <div style={css('height:100%;overflow-y:auto;padding:46px 18px 22px;display:flex;flex-direction:column')}>
      <div style={css('margin:auto;width:100%;max-width:300px;text-align:center')}>
        <div style={css('position:relative;width:150px;height:192px;margin:0 auto 26px;border-radius:12px;background:var(--color-neutral-100);box-shadow:var(--shadow-md);overflow:hidden')}>
          <div style={css('padding:18px 16px;text-align:left')}>
            <div style={css('width:46px;height:8px;border-radius:3px;background:var(--color-accent);opacity:.85;margin-bottom:16px')}></div>
            <div style={css('height:6px;border-radius:3px;background:#c9cde0;margin-bottom:9px')}></div>
            <div style={css('height:6px;border-radius:3px;background:#c9cde0;margin-bottom:9px;width:82%')}></div>
            <div style={css('height:6px;border-radius:3px;background:#c9cde0;margin-bottom:9px')}></div>
            <div style={css('height:6px;border-radius:3px;background:#c9cde0;margin-bottom:9px;width:64%')}></div>
            <div style={css('height:6px;border-radius:3px;background:#c9cde0;margin-bottom:9px;width:90%')}></div>
            <div style={css('height:6px;border-radius:3px;background:#dfe2ee;margin-bottom:9px;width:50%')}></div>
          </div>
          <div style={{ ...css('position:absolute;left:0;right:0;height:30px;top:6%;background:linear-gradient(color-mix(in srgb, var(--color-accent) 0%, transparent), color-mix(in srgb, var(--color-accent) 60%, transparent), color-mix(in srgb, var(--color-accent) 0%, transparent))'), animation: 'uaa-scan 1.9s ease-in-out infinite' }}></div>
        </div>
        <h2 style={css('font-size:22px;margin:0 0 6px;font-weight:600')}>Analyse en cours…</h2>
        <p style={css('font-size:14px;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin:0 0 24px')}>L’assistant lit et comprend votre document.</p>
        <div style={css('text-align:left;display:flex;flex-direction:column;gap:15px;max-width:250px;margin:0 auto')}>
          {steps.map((st) => (
            <div key={st.label} style={css('display:flex;align-items:center;gap:12px;font-size:15px')}>
              <span style={css('width:22px;height:22px;flex:none;display:grid;place-items:center')}>
                {st.done && <i className="ph-fill ph-check-circle" style={css('font-size:22px;color:oklch(0.74 0.11 158)')}></i>}
                {st.active && <span style={{ ...css('width:18px;height:18px;border-radius:50%;border:2px solid color-mix(in srgb, var(--color-accent) 28%, transparent);border-top-color:var(--color-accent)'), animation: 'uaa-spin .7s linear infinite' }}></span>}
                {st.todo && <span style={css('width:9px;height:9px;border-radius:50%;background:color-mix(in srgb, var(--color-text) 22%, transparent)')}></span>}
              </span>
              <span style={css('color:var(--color-text)')}>{st.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
