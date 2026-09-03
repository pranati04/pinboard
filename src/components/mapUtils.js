export function findRoot(nodes, edges) {
  const targets = new Set(edges.map((e) => e.to));
  return nodes.find((n) => !targets.has(n.id) && (n.tags || []).includes('root'))
    || nodes.find((n) => !targets.has(n.id))
    || nodes[0];
}

export function buildTree(rootId, edges) {
  const kids = new Map();
  edges.forEach((e) => {
    if (!kids.has(e.from)) kids.set(e.from, []);
    kids.get(e.from).push(e.to);
  });
  return kids;
}

export function autoArrange(nodes, edges, posOf) {
  const root = findRoot(nodes, edges);
  if (!root) return {};
  const kids = buildTree(root.id, edges);
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const next = {};
  const rp = posOf(root);
  next[root.id] = { x: rp.x, y: 120 };
  const queue = [{ id: root.id, depth: 0 }];
  const visited = new Set([root.id]);
  const levels = new Map([[0, [root.id]]]);
  while (queue.length) {
    const { id, depth } = queue.shift();
    (kids.get(id) || []).forEach((kid) => {
      if (visited.has(kid)) return;
      visited.add(kid);
      const d = depth + 1;
      queue.push({ id: kid, depth: d });
      if (!levels.has(d)) levels.set(d, []);
      levels.get(d).push(kid);
    });
  }
  const orphans = nodes.filter((n) => !visited.has(n.id));
  levels.forEach((ids, depth) => {
    if (depth === 0) return;
    const y = 120 + depth * 280;
    const totalW = ids.length * 300;
    ids.forEach((id, i) => {
      const n = byId[id];
      next[id] = { x: Math.round(620 - totalW / 2 + i * 300), y, _w: n?.w };
    });
  });
  orphans.forEach((n, i) => {
    next[n.id] = { x: 120 + i * 300, y: 120 + (Math.max(...levels.keys()) + 1 || 1) * 280 };
  });
  return next;
}

export function childSpot(parent, posOf, index, siblingCount) {
  const p = posOf(parent);
  const spread = Math.max(0, siblingCount - 1) * 150;
  return {
    x: Math.round(p.x + parent.w / 2 - 125 + (index * 300 - spread / 2) - 0),
    y: Math.round(p.y + 300),
  };
}
