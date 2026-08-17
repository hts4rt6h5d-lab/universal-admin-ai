import { css } from '../lib/css';

export default function Toast({ text }) {
  return (
    <div style={{ ...css('position:absolute;left:16px;right:16px;bottom:88px;z-index:45;display:flex;align-items:center;gap:10px;background:var(--color-neutral-900);box-shadow:var(--shadow-md);border-radius:12px;padding:12px 14px;font-size:14px'), animation: 'uaa-fade .25s ease' }}>
      <i className="ph-fill ph-check-circle" style={css('color:oklch(0.74 0.11 158);font-size:20px;flex:none')}></i>
      <span style={css('flex:1')}>{text}</span>
    </div>
  );
}
