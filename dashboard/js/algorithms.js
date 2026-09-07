const W = 600, H = 450; // Dimensões do Canvas/SVG

function mulberry32(seed) {
  return function() {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

function generateNetwork(seed) {
  const rand = mulberry32(seed);
  const randInt = (a, b) => a + Math.floor(rand() * (b - a + 1));
  const LAYERS = 6, PER_LAYER = 6;
  const nodes = []; let id = 0;
  
  for(let L = 0; L < LAYERS; L++) {
    for(let i = 0; i < PER_LAYER; i++) {
      nodes.push({id: id++, label: `ACC-${String(nodes.length).padStart(4,'0')}`, type: 'legit', layer: L, layerSlot: i});
    }
  }
  const numLegit = nodes.length;
  const edges = [];
  const baseTime = Date.UTC(2026, 7, 1, 8, 0, 0);
  const targetEdgeCount = Math.floor(numLegit * 1.6);
  let attempts = 0;

  while(edges.length < targetEdgeCount && attempts < targetEdgeCount * 25) {
    attempts++;
    const a = nodes[randInt(0, numLegit - 1)];
    if(a.layer >= LAYERS - 1) continue;
    const bLayer = randInt(a.layer + 1, LAYERS - 1);
    const layerNodes = nodes.filter(n => n.layer === bLayer);
    const b = layerNodes[randInt(0, layerNodes.length - 1)];
    const amount = randInt(50, 5000) * 10;
    const ts = baseTime + (a.layer * 3 + randInt(0, 2)) * 3600 * 1000 + randInt(0, 3000) * 1000;
    edges.push({from: a.id, to: b.id, amount, ts, type: 'legit'});
  }

  const numRings = randInt(2, 4);
  const ringInfo = [];
  for(let ringIdx = 0; ringIdx < numRings; ringIdx++) {
    const size = randInt(3, 7);
    const ringNodes = [];
    for(let i = 0; i < size; i++) {
      const n = {id: id++, label: `ACC-${String(id - 1).padStart(4,'0')}`, type: 'fraud', ring: ringIdx};
      nodes.push(n); ringNodes.push(n);
    }
    let t0 = baseTime + randInt(20, 60) * 3600 * 1000;
    let amt = randInt(20000, 80000);
    for(let i = 0; i < size; i++) {
      const from = ringNodes[i], to = ringNodes[(i + 1) % size];
      amt = Math.round(amt * (0.90 + rand() * 0.08));
      t0 += randInt(1, 25) * 60 * 1000;
      edges.push({from: from.id, to: to.id, amount: amt, ts: t0, type: 'fraud_internal'});
    }
    const sourcePool = nodes.filter(n => n.type === 'legit' && n.layer <= 1);
    const src = sourcePool[randInt(0, sourcePool.length - 1)];
    edges.push({from: src.id, to: ringNodes[0].id, amount: Math.round(amt * 1.1), ts: t0 - randInt(30, 90) * 60 * 1000, type: 'bridge'});
    
    const sinkPool = nodes.filter(n => n.type === 'legit' && n.layer >= LAYERS - 2);
    const sink = sinkPool[randInt(0, sinkPool.length - 1)];
    const exitFrom = ringNodes[randInt(0, size - 1)];
    edges.push({from: exitFrom.id, to: sink.id, amount: Math.round(amt * 0.85), ts: t0 + randInt(5, 20) * 60 * 1000, type: 'bridge'});
    
    ringInfo.push({ringIdx, nodeIds: ringNodes.map(n => n.id), size, entry: src.id, exit: sink.id});
  }
  return {nodes, edges, ringInfo, LAYERS};
}

function buildAdj(nodes, edges) {
  const adj = new Map(), radj = new Map();
  nodes.forEach(n => { adj.set(n.id, []); radj.set(n.id, []); });
  edges.forEach(e => { adj.get(e.from).push(e.to); radj.get(e.to).push(e.from); });
  return {adj, radj};
}

function kosaraju(nodes, adj, radj) {
  const visited = new Set(); const order = [];
  function dfs1(start) {
    function rec(u) { visited.add(u); for(const v of adj.get(u)) if(!visited.has(v)) rec(v); order.push(u); }
    rec(start);
  }
  for(const n of nodes) if(!visited.has(n.id)) dfs1(n.id);
  
  const visited2 = new Set(); const sccList = [];
  for(let i = order.length - 1; i >= 0; i--) {
    const start = order[i];
    if(visited2.has(start)) continue;
    const comp = [];
    function rec2(u) { visited2.add(u); comp.push(u); for(const v of radj.get(u)) if(!visited2.has(v)) rec2(v); }
    rec2(start);
    sccList.push(comp);
  }
  return sccList;
}

function kahn(nodeIds, edges) {
  const nodeSet = new Set(nodeIds);
  const indeg = new Map(); nodeIds.forEach(id => indeg.set(id, 0));
  const adj = new Map(); nodeIds.forEach(id => adj.set(id, []));
  edges.forEach(e => {
    if(nodeSet.has(e.from) && nodeSet.has(e.to)) {
      adj.get(e.from).push(e.to);
      indeg.set(e.to, indeg.get(e.to) + 1);
    }
  });
  const queue = nodeIds.filter(id => indeg.get(id) === 0);
  const orderOut = [];
  while(queue.length) {
    const u = queue.shift();
    orderOut.push(u);
    for(const v of adj.get(u)) {
      indeg.set(v, indeg.get(v) - 1);
      if(indeg.get(v) === 0) queue.push(v);
    }
  }
  return {success: orderOut.length === nodeIds.length, order: orderOut};
}

function layoutPositions(nodes, ringInfo, LAYERS) {
  const pos = new Map();
  const legit = nodes.filter(n => n.type === 'legit');
  const marginX = 40, marginY = 30, flowH = 260;
  const spacingX = (W - 2 * marginX) / (LAYERS - 1);
  for(const n of legit) {
    const perLayer = legit.filter(m => m.layer === n.layer).length;
    const spacingY = flowH / (perLayer + 1);
    const x = marginX + n.layer * spacingX;
    const y = marginY + (n.layerSlot + 1) * spacingY;
    pos.set(n.id, [x, y]);
  }
  const clusterY = 360;
  const clusterSpacing = W / (ringInfo.length + 1);
  ringInfo.forEach((r, idx) => {
    const cx = clusterSpacing * (idx + 1);
    const cy = clusterY + (idx % 2 === 0 ? 0 : 40);
    const R = 14 + r.size * 3;
    r.nodeIds.forEach((nid, i) => {
      const ang = (i / r.size) * 2 * Math.PI - Math.PI / 2;
      pos.set(nid, [cx + R * Math.cos(ang), cy + R * Math.sin(ang)]);
    });
  });
  return pos;
}