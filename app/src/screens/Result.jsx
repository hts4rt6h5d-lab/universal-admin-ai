import { css } from '../lib/css';

function formatEur(cents) {
  if (cents == null) return null;
  return (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function daysUntil(iso) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function Result({ document, analysis, simpleMode, onGoHome, onToggleSimple, onGoDocview, onGoAssistant, canUseAssistant }) {
  const amount = formatEur(analysis?.amountCents);
  const dueDate = formatDate(analysis?.dueDate);
  const days = daysUntil(analysis?.dueDate);

  return (
    <div style={css('height:100%;overflow-y:auto;padding:46px 18px 26px')}>
      <div style={css('display:flex;align-items:center;gap:12px;margin-bottom:18px')}>
        <button onClick={onGoHome} aria-label="Retour" style={css('border:0;cursor:pointer;width:40px;height:40px;border-radius:10px;background:var(--color-surface);display:grid;place-items:center;color:var(--color-text)')}>
          <i className="ph ph-arrow-left" style={css('font-size:20px')}></i>
        </button>
        <div>
          <div style={css('font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--color-accent)')}>Analyse terminée</div>
          <div style={css('font-size:20px;font-weight:600')}>Votre document</div>
        </div>
      </div>

      <div style={css('background:var(--color-surface);border-radius:16px;padding:15px;display:flex;align-items:center;gap:14px;margin-bottom:16px;box-shadow:var(--shadow-sm)')}>
        <div style={css('width:52px;height:52px;border-radius:12px;flex:none;display:grid;place-items:center;background:color-mix(in srgb, var(--color-accent) 14%, transparent)')}>
          <i className="ph ph-lightning" style={css('font-size:26px;color:var(--color-accent)')}></i>
        </div>
        <div style={css('flex:1')}>
          <div style={css('font-size:12px;color:color-mix(in srgb, var(--color-text) 55%, transparent)')}>Type de document</div>
          <div style={css('font-size:18px;font-weight:600')}>{analysis?.documentType || 'Document'}</div>
          <div style={css('font-size:13px;color:color-mix(in srgb, var(--color-text) 55%, transparent)')}>{document?.originalName}</div>
        </div>
        <span className="tag tag-neutral">{document?.mimeType === 'application/pdf' ? 'PDF' : 'Image'}</span>
      </div>

      <div style={css('margin-bottom:16px')}>
        <div style={css('font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin-bottom:8px')}>Résumé</div>
        <p style={css('font-size:16px;line-height:1.5;margin:0;text-wrap:pretty')}>{analysis?.summary}</p>
      </div>

      {simpleMode && (
        <div style={{ ...css('background:color-mix(in srgb, var(--color-accent) 10%, transparent);border-radius:14px;padding:14px 16px;margin-bottom:16px;box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--color-accent) 30%, transparent)'), animation: 'uaa-fade .25s ease' }}>
          <div style={css('display:flex;align-items:center;gap:8px;font-size:12px;color:var(--color-accent);margin-bottom:6px')}>
            <i className="ph-fill ph-hand-heart"></i> Explication simplifiée
          </div>
          <p style={css('font-size:15px;line-height:1.55;margin:0;text-wrap:pretty')}>{analysis?.simpleSummary}</p>
        </div>
      )}

      {(amount || dueDate) && (
        <div style={css('background:var(--color-surface);border-radius:16px;padding:8px 16px 12px;margin-bottom:16px;box-shadow:0 0 0 1px color-mix(in srgb, var(--color-accent) 35%, transparent)')}>
          <div style={css('font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--color-accent);margin:8px 0 4px')}>⚠ À retenir</div>
          {amount && (
            <>
              <div style={css('display:flex;align-items:center;justify-content:space-between;padding:9px 0')}>
                <span style={css('font-size:14px;color:color-mix(in srgb, var(--color-text) 60%, transparent)')}>Montant</span>
                <span style={css('font-size:17px;font-weight:600')}>{amount}</span>
              </div>
              {dueDate && <div style={css('height:1px;background:var(--color-divider)')}></div>}
            </>
          )}
          {dueDate && (
            <div style={css('display:flex;align-items:center;justify-content:space-between;padding:9px 0')}>
              <span style={css('font-size:14px;color:color-mix(in srgb, var(--color-text) 60%, transparent)')}>Date limite</span>
              <span style={css('display:flex;align-items:center;gap:8px')}>
                <span style={css('font-size:17px;font-weight:600')}>{dueDate}</span>
                {days !== null && (
                  <span style={css('font-size:11px;padding:2px 8px;border-radius:6px;background:color-mix(in srgb, oklch(0.77 0.12 72) 22%, transparent);color:oklch(0.86 0.09 78)')}>
                    {days >= 0 ? `dans ${days} j` : `en retard de ${-days} j`}
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      )}

      <div style={css('margin-bottom:20px')}>
        <div style={css('font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin-bottom:8px')}>Que devez-vous faire ?</div>
        <div style={css('display:flex;align-items:flex-start;gap:10px;font-size:16px;line-height:1.5')}>
          <i className="ph-fill ph-arrow-right" style={css('color:var(--color-accent);margin-top:4px')}></i>
          <span style={css('text-wrap:pretty')}>{analysis?.actionRequired}</span>
        </div>
        {analysis?.confidence !== undefined && (
          <div style={css('font-size:11px;color:color-mix(in srgb, var(--color-text) 40%, transparent);margin-top:8px')}>
            Niveau de confiance : {analysis.confidence >= 0.7 ? 'élevé' : analysis.confidence >= 0.3 ? 'moyen — vérification recommandée' : 'faible — vérifiez le document original'}
          </div>
        )}
      </div>

      <div style={css('display:flex;flex-direction:column;gap:10px')}>
        {dueDate && (
          <div style={css('width:100%;min-height:52px;display:flex;align-items:center;justify-content:center;gap:9px;border-radius:13px;font-size:14px;font-weight:600;color:oklch(0.80 0.10 158);background:color-mix(in srgb, oklch(0.74 0.11 158) 12%, transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb, oklch(0.74 0.11 158) 45%, transparent);text-align:center;padding:0 10px')}>
            <i className="ph-fill ph-bell" style={css('font-size:19px;flex:none')}></i> Rappels automatiques activés · 30, 14, 7, 3 et 1 j avant
          </div>
        )}
        <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:10px')}>
          <button onClick={onToggleSimple} style={css('background:var(--color-surface);border:1px solid var(--color-divider);border-radius:12px;padding:13px 8px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;font-size:13px;font-weight:500;color:var(--color-text);min-height:48px')}>
            <i className="ph ph-hand-heart" style={css('color:var(--color-accent);font-size:17px')}></i> Expliquer davantage
          </button>
          <button onClick={onGoDocview} style={css('background:var(--color-surface);border:1px solid var(--color-divider);border-radius:12px;padding:13px 8px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;font-size:13px;font-weight:500;color:var(--color-text);min-height:48px')}>
            <i className="ph ph-file-text" style={css('color:var(--color-accent);font-size:17px')}></i> Voir le document
          </button>
          {canUseAssistant ? (
            <button onClick={onGoAssistant} style={css('background:var(--color-surface);border:1px solid var(--color-divider);border-radius:12px;padding:13px 8px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;font-size:13px;font-weight:500;color:var(--color-text);min-height:48px;grid-column:1 / -1')}>
              <i className="ph ph-chats-circle" style={css('color:var(--color-accent);font-size:17px')}></i> Poser une question
            </button>
          ) : (
            <div style={css('background:var(--color-surface);border:1px solid var(--color-divider);border-radius:12px;padding:13px 8px;display:flex;align-items:center;justify-content:center;gap:8px;font-size:12px;font-weight:500;color:color-mix(in srgb, var(--color-text) 50%, transparent);min-height:48px;grid-column:1 / -1')}>
              <i className="ph ph-lock-simple" style={css('font-size:15px')}></i> Assistant IA — réservé à Premium
            </div>
          )}
        </div>
      </div>

      <p style={css('display:flex;align-items:flex-start;gap:7px;font-size:12px;color:color-mix(in srgb, var(--color-text) 42%, transparent);margin:18px 0 0;line-height:1.5')}>
        <i className="ph ph-info" style={css('margin-top:2px')}></i>
        <span style={css('text-wrap:pretty')}>Cette analyse est une aide pour comprendre votre document. Ce n’est pas un conseil juridique ou professionnel.</span>
      </p>
    </div>
  );
}
