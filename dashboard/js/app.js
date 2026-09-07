let G = null;
let currentStep = 1;
let selectedRingIdx = null;

function analyzeAndInit() {
  const seed = Math.floor(Math.random() * 1000000);
  const {nodes, edges, ringInfo, LAYERS} = generateNetwork(seed);
  const {adj, radj} = buildAdj(nodes, edges);
  
  const sccList = kosaraju(nodes, adj, radj);
  const fraudRings = sccList.filter(c => c.length > 1);
  const fraudIds = new Set(fraudRings.flat());
  
  const cleanIds = nodes.map(n => n.id).filter(id => !fraudIds.has(id));
  const {order} = kahn(cleanIds, edges);
  
  G = {nodes, edges, fraudRings, fraudIds, order, cleanIds, pos: layoutPositions(nodes, LAYERS)};
  
  document.getElementById('status-fase-1').innerHTML = 
    `O sistema carregou <b>${G.edges.length} transferências</b> ocorrendo entre <b>${G.nodes.length} contas</b>.<br><br>
    Nesta etapa, estamos olhando para a rede inteira. Como algumas destas contas estão girando dinheiro de forma circular, é impossível validar a ordem cronológica do dinheiro no livro-razão geral.`;

  const listUI = document.getElementById('ringListUI');
  listUI.innerHTML = G.fraudRings.map((ring, i) => {
    const internalEdges = G.edges.filter(e => ring.includes(e.from) && ring.includes(e.to));
    const volume = internalEdges.reduce((acc, e) => acc + e.amount, 0);
    const labels = ring.map(id => G.nodes.find(n => n.id === id).label).join(', ');
    return `
      <div class="ring-item" onclick="selectRing(${i})" id="ring-card-${i}">
        <div class="ring-head">
          <span class="ring-name">Esquema #${i+1}</span>
          <span class="ring-tag">${ring.length} Contas</span>
        </div>
        <div class="ring-stats">Volume isolado: <b>R$ ${volume.toLocaleString('pt-BR')}</b></div>
        <div class="ring-accounts" style="display:none;" id="ring-details-${i}">Envolvidos: ${labels}</div>
      </div>
    `;
  }).join('');

  const ledgerRows = G.order.map(id => {
    const outEdges = G.edges.filter(e => e.from === id && G.cleanIds.includes(e.to));
    if(!outEdges.length) return null;
    const e = outEdges[0];
    return {from: G.nodes.find(n => n.id === e.from).label, to: G.nodes.find(n => n.id === e.to).label, amount: e.amount};
  }).filter(Boolean).slice(0, 15);
  
  document.getElementById('ledgerBody').innerHTML = ledgerRows.map((r, i) => 
    `<tr><td>${i+1}</td><td>${r.from}</td><td>${r.to}</td><td class="money">R$ ${r.amount.toLocaleString('pt-BR')}</td></tr>`
  ).join('');

  setStep(1);
}

function setStep(stepNum) {
  currentStep = stepNum;
  selectedRingIdx = null;

  document.querySelectorAll('.step').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.step) === stepNum);
  });

  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
  document.getElementById(`side-step-${stepNum}`).classList.add('active');

  const title = document.getElementById('graphTitle');
  const subtitle = document.getElementById('graphSubtitle');
  const legend = document.getElementById('graphLegend');

  if(stepNum === 1) {
    title.textContent = "Rede de Transações Bancárias";
    subtitle.textContent = "Visão bruta sem filtros. Linhas conectam quem enviou dinheiro para quem.";
    legend.innerHTML = `
      <div class="legend-item"><div class="dot" style="background:#57575a;"></div> Conta Corrente</div>
      <div class="legend-item"><div class="dot" style="background:#2a2a2d; border-radius:0; width:16px; height:2px;"></div> Transferência</div>
    `;
  } else if (stepNum === 2) {
    title.textContent = "Detecção de Lavagem (Layering)";
    subtitle.textContent = "Os algoritmos isolaram as contas que repassam fundos entre si infinitamente.";
    legend.innerHTML = `
      <div class="legend-item"><div class="dot" style="background:#2a2a2d;"></div> Conta Comum</div>
      <div class="legend-item"><div class="dot" style="background:var(--red);"></div> Conta Suspeita</div>
    `;
  } else {
    title.textContent = "Rede Validada (Pós-Filtro)";
    subtitle.textContent = "Com os esquemas removidos (esmaecidos), o fluxo de fundos torna-se rastreável e lícito.";
    legend.innerHTML = `
      <div class="legend-item"><div class="dot" style="background:var(--blue);"></div> Histórico Validado</div>
      <div class="legend-item"><div class="dot" style="background:var(--line);"></div> Contas Bloqueadas</div>
    `;
  }

  document.querySelectorAll('.ring-item').forEach(el => {
    el.classList.remove('selected');
    el.querySelector('.ring-accounts').style.display = 'none';
  });

  drawGraph();
}

function selectRing(idx) {
  if(currentStep !== 2) return;
  selectedRingIdx = (selectedRingIdx === idx) ? null : idx;
  
  document.querySelectorAll('.ring-item').forEach((el, i) => {
    const isSelected = (i === selectedRingIdx);
    el.classList.toggle('selected', isSelected);
    el.querySelector('.ring-accounts').style.display = isSelected ? 'block' : 'none';
  });
  
  drawGraph();
}

function drawGraph() {
  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;

  G.edges.forEach(e => {
    const [x1, y1] = G.pos.get(e.from);
    const [x2, y2] = G.pos.get(e.to);
    
    let isFraud = e.type === 'fraud_internal';
    let color = '#2a2a2d', opacity = 0.5, width = 1;

    if (currentStep === 1) {
      color = '#2a2a2d'; opacity = 0.6;
    } else if (currentStep === 2) {
      if (isFraud) {
        let inSelectedRing = selectedRingIdx !== null ? G.fraudRings[selectedRingIdx].includes(e.from) : true;
        color = inSelectedRing ? '#e0483d' : '#2a2a2d';
        opacity = inSelectedRing ? 1 : 0.2;
        width = inSelectedRing ? 2 : 1;
      } else {
        opacity = 0.15;
      }
    } else if (currentStep === 3) {
      if (G.fraudIds.has(e.from) || G.fraudIds.has(e.to)) {
        opacity = 0;
      } else {
        color = 'rgba(58,130,247,0.4)'; opacity = 0.8; width = 1.5;
      }
    }
    
    if(opacity > 0) {
      svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" opacity="${opacity}"/>`;
    }
  });

  G.nodes.forEach(n => {
    const [x, y] = G.pos.get(n.id);
    let isFraud = G.fraudIds.has(n.id);
    let color = '#57575a', opacity = 1, radius = 3;

    if (currentStep === 1) {
      color = '#57575a';
    } else if (currentStep === 2) {
      if (isFraud) {
        let inSelectedRing = selectedRingIdx !== null ? G.fraudRings[selectedRingIdx].includes(n.id) : true;
        color = inSelectedRing ? '#e0483d' : '#2a2a2d';
        opacity = inSelectedRing ? 1 : 0.4;
        radius = inSelectedRing ? 5 : 3;
      } else {
        color = '#1a1a1d'; opacity = 0.5;
      }
    } else if (currentStep === 3) {
      if (isFraud) {
        color = '#1a1a1d'; opacity = 0.3;
      } else {
        color = '#3a82f7'; opacity = 1; radius = 4;
      }
    }

    svg += `<circle cx="${x}" cy="${y}" r="${radius}" fill="${color}" opacity="${opacity}"><title>${n.label}</title></circle>`;
  });

  svg += `</svg>`;
  document.getElementById('graph').innerHTML = svg;
}

// Inicializadores
document.getElementById('regen').addEventListener('click', analyzeAndInit);
document.querySelectorAll('.step').forEach(el => {
  el.addEventListener('click', () => setStep(parseInt(el.dataset.step)));
});

analyzeAndInit();