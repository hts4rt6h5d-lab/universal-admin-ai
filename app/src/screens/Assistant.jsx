import { css } from '../lib/css';

export default function Assistant({ chat, suggestions, draft, onDraftChange, onKeyDown, onSend, onGoHome, setChatRef, locked, contextLabel }) {
  return (
    <div style={css('height:100%;display:flex;flex-direction:column;padding-top:46px')}>
      <div style={css('padding:0 16px 12px;flex:none')}>
        <div style={css('display:flex;align-items:center;gap:12px;margin-bottom:12px')}>
          <button onClick={onGoHome} aria-label="Retour" style={css('border:0;cursor:pointer;width:40px;height:40px;border-radius:10px;background:var(--color-surface);display:grid;place-items:center;color:var(--color-text)')}>
            <i className="ph ph-arrow-left" style={css('font-size:20px')}></i>
          </button>
          <div style={css('flex:1')}>
            <div style={css('font-size:18px;font-weight:600')}>Assistant</div>
            <div style={css('font-size:12px;color:color-mix(in srgb, var(--color-text) 55%, transparent)')}>Réponses basées sur vos documents</div>
          </div>
          <span style={css('width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb, var(--color-accent) 16%, transparent)')}>
            <i className="ph-fill ph-sparkle" style={css('color:var(--color-accent)')}></i>
          </span>
        </div>
        {contextLabel && (
          <div style={css('display:flex;align-items:center;gap:8px;background:var(--color-surface);border-radius:10px;padding:8px 12px;font-size:12px')}>
            <i className="ph ph-file-text" style={css('color:var(--color-accent)')}></i>
            <span style={css('flex:1;color:color-mix(in srgb, var(--color-text) 75%, transparent)')}>Contexte : <b style={css('font-weight:600;color:var(--color-text)')}>{contextLabel}</b></span>
            <span style={css('display:flex;align-items:center;gap:4px;color:color-mix(in srgb, var(--color-text) 50%, transparent)')}>
              <i className="ph ph-lock-simple"></i> accès limité
            </span>
          </div>
        )}
      </div>

      {locked ? (
        <div style={css('flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:0 32px;text-align:center')}>
          <span style={css('width:56px;height:56px;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb, var(--color-accent) 14%, transparent)')}>
            <i className="ph ph-lock-simple" style={css('font-size:26px;color:var(--color-accent)')}></i>
          </span>
          <div style={css('font-size:16px;font-weight:600')}>Assistant IA — réservé à Premium</div>
          <p style={css('font-size:13px;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin:0')}>
            Passez à la formule Premium depuis votre profil pour poser des questions à l’assistant conversationnel.
          </p>
        </div>
      ) : (
        <>
          <div ref={setChatRef} style={css('flex:1;overflow-y:auto;padding:8px 16px;display:flex;flex-direction:column;gap:12px')}>
            {chat.map((m, i) => (
              m.role === 'ai' ? (
                <div key={i} style={css('align-self:flex-start;max-width:84%;background:var(--color-surface);border-radius:16px 16px 16px 4px;padding:12px 14px;font-size:15px;line-height:1.5;text-wrap:pretty')}>{m.text}</div>
              ) : (
                <div key={i} style={css('align-self:flex-end;max-width:84%;background:color-mix(in srgb, var(--color-accent) 18%, transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--color-accent) 30%, transparent);border-radius:16px 16px 4px 16px;padding:12px 14px;font-size:15px;line-height:1.5')}>{m.text}</div>
              )
            ))}
            <div style={css('display:flex;flex-wrap:wrap;gap:8px;margin-top:2px')}>
              {suggestions.map((sg) => (
                <button key={sg.q} onClick={sg.onClick} style={css('background:none;border:1px solid var(--color-accent);color:var(--color-accent);border-radius:999px;padding:8px 14px;font-size:13px;cursor:pointer')}>{sg.q}</button>
              ))}
            </div>
          </div>
          <div style={css('flex:none;padding:10px 16px 12px;border-top:1px solid var(--color-divider);display:flex;align-items:center;gap:8px')}>
            <input
              className="input"
              placeholder="Écrivez votre question…"
              value={draft}
              onChange={onDraftChange}
              onKeyDown={onKeyDown}
              style={css('flex:1;border-radius:999px;min-height:44px')}
            />
            <button aria-label="Envoyer" onClick={onSend} style={css('width:44px;height:44px;flex:none;border-radius:50%;border:0;cursor:pointer;background:var(--color-accent);color:var(--color-bg);display:grid;place-items:center')}>
              <i className="ph-fill ph-paper-plane-tilt" style={css('font-size:18px')}></i>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
