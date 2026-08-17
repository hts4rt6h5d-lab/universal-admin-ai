import { css } from '../lib/css';

export default function StatusBar() {
  return (
    <>
      <div style={css('position:absolute;top:0;left:0;right:0;height:46px;z-index:20;display:flex;align-items:flex-end;justify-content:space-between;padding:0 24px 7px;background:linear-gradient(var(--color-bg) 62%, transparent);pointer-events:none')}>
        <span style={css('font-size:15px;font-weight:600;letter-spacing:.02em')}>9:41</span>
        <div style={css('display:flex;align-items:center;gap:6px;font-size:15px')}>
          <i className="ph-fill ph-cell-signal-full"></i>
          <i className="ph-fill ph-wifi-high"></i>
          <i className="ph-fill ph-battery-high" style={css('font-size:18px')}></i>
        </div>
      </div>
      <div style={css('position:absolute;top:9px;left:50%;transform:translateX(-50%);width:108px;height:30px;background:#05060a;border-radius:18px;z-index:35')}></div>
    </>
  );
}
