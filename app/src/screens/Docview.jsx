import { useEffect, useState } from 'react';
import { css } from '../lib/css';
import { api, resolveServerPath } from '../api/client';

export default function Docview({ document, onGoResult, onGoAssistant, canUseAssistant }) {
  const [fileUrl, setFileUrl] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!document) return;
    api
      .get(`/documents/${document.id}/file-url`)
      .then((res) => setFileUrl(resolveServerPath(res.url)))
      .catch(() => setError("Impossible de récupérer le fichier."));
  }, [document]);

  const isPdf = document?.mimeType === 'application/pdf';
  const isImage = document?.mimeType?.startsWith('image/');

  return (
    <div style={css('height:100%;overflow-y:auto;padding:46px 16px 26px')}>
      <div style={css('display:flex;align-items:center;gap:12px;margin-bottom:16px')}>
        <button onClick={onGoResult} aria-label="Retour" style={css('border:0;cursor:pointer;width:40px;height:40px;border-radius:10px;background:var(--color-surface);display:grid;place-items:center;color:var(--color-text)')}>
          <i className="ph ph-arrow-left" style={css('font-size:20px')}></i>
        </button>
        <div style={css('flex:1')}>
          <div style={css('font-size:15px;font-weight:600')}>{document?.originalName}</div>
          <div style={css('font-size:12px;color:color-mix(in srgb, var(--color-text) 55%, transparent)')}>{document ? `${(document.sizeBytes / 1024).toFixed(0)} Ko` : ''}</div>
        </div>
        {canUseAssistant && (
          <button onClick={onGoAssistant} aria-label="Poser une question" style={css('border:0;cursor:pointer;width:40px;height:40px;border-radius:10px;background:var(--color-surface);display:grid;place-items:center;color:var(--color-text)')}>
            <i className="ph ph-chats-circle" style={css('font-size:20px')}></i>
          </button>
        )}
      </div>

      {error && <p style={css('color:oklch(0.7 0.18 25);font-size:13px')}>{error}</p>}

      {isImage && fileUrl && (
        <img src={fileUrl} alt={document.originalName} style={css('width:100%;border-radius:10px;box-shadow:var(--shadow-md);display:block')} />
      )}

      {isPdf && fileUrl && (
        <iframe title={document.originalName} src={fileUrl} style={css('width:100%;height:520px;border:0;border-radius:10px;box-shadow:var(--shadow-md);background:var(--color-neutral-100)')} />
      )}

      {!isImage && !isPdf && (
        <div style={css('background:var(--color-surface);border-radius:14px;padding:20px;text-align:center;color:color-mix(in srgb, var(--color-text) 60%, transparent);font-size:13px')}>
          Aperçu non disponible pour ce type de fichier.
        </div>
      )}

      {fileUrl && (
        <a
          href={fileUrl}
          target="_blank"
          rel="noreferrer"
          style={css('display:flex;align-items:center;justify-content:center;gap:8px;margin-top:14px;font-size:13px;color:var(--color-accent);text-decoration:none')}
        >
          <i className="ph ph-arrow-square-out"></i> Ouvrir dans un nouvel onglet
        </a>
      )}

      <p style={css('display:flex;align-items:center;justify-content:center;gap:6px;font-size:12px;color:color-mix(in srgb, var(--color-text) 42%, transparent);margin:16px 0 0')}>
        <i className="ph ph-lock-simple"></i> Ce lien est temporaire et propre à votre compte.
      </p>
    </div>
  );
}
