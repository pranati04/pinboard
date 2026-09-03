export function centerOf(n, posOf) {
  const p = posOf(n);
  const h = n.h && n.h > 0 ? n.h : estimateH(n);
  return { x: p.x + n.w / 2, y: p.y + h / 2 };
}

export function estimateH(n) {
  switch (n.type) {
    case 'image': return Math.min(320, n.w * 0.72 + 110);
    case 'link': return 170;
    case 'video': return 190;
    case 'audio': return 150;
    case 'file': return 150;
    default: return 130 + Math.min(120, (n.content || '').length / 3);
  }
}

export function curvePath(a, b) {
  const mx = (a.x + b.x) / 2;
  return `M ${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`;
}
