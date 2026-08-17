// Parses a CSS declaration string ("color:red;font-size:12px") into a React
// inline-style object. Lets screen components carry over the source design's
// literal inline-style strings without hand-transcribing each property.
export function css(str) {
  const out = {};
  if (!str) return out;
  for (const rule of str.split(';')) {
    const idx = rule.indexOf(':');
    if (idx === -1) continue;
    const prop = rule.slice(0, idx).trim();
    const val = rule.slice(idx + 1).trim();
    if (!prop || !val) continue;
    if (prop.startsWith('--')) {
      out[prop] = val;
    } else {
      out[prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = val;
    }
  }
  return out;
}
