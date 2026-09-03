const TAG_HUES = {
  ochre: '#c98a2e', palette: '#c98a2e', warm: '#c4746a', blush: '#c4746a',
  texture: '#a97e4b', neutral: '#b3a284', linen: '#d9cdb2',
  sage: '#7d8b6f', direction: '#7d8b6f',
  sky: '#6f93a8', reference: '#6f93a8',
  butter: '#e0b34e', cream: '#efe6d3',
};

export function paletteFromNodes(nodes) {
  const seen = new Map();
  nodes.forEach((n) => {
    (n.tags || []).forEach((t) => {
      if (!seen.has(t)) seen.set(t, TAG_HUES[t.toLowerCase()] || hueFor(t));
    });
  });
  return [...seen.entries()].slice(0, 8).map(([tag, hex]) => ({ tag, hex }));
}

function hueFor(s) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h}, 38%, 58%)`;
}

export function shuffleLayout(nodes, posOf) {
  const next = {};
  const order = [...nodes];
  const cx = order.reduce((a, n) => a + posOf(n).x, 0) / Math.max(1, order.length);
  const cy = order.reduce((a, n) => a + posOf(n).y, 0) / Math.max(1, order.length);
  order.forEach((n, i) => {
    const angle = (i / order.length) * Math.PI * 2 + Math.random() * 0.6;
    const r = 120 + Math.random() * 260;
    next[n.id] = {
      x: Math.round(cx + Math.cos(angle) * r - n.w / 2 + (Math.random() * 80 - 40)),
      y: Math.round(cy + Math.sin(angle) * r * 0.7 + (Math.random() * 80 - 40)),
    };
  });
  return next;
}
