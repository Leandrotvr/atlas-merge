// Motor de "Atlas Merge": logica pura, sin DOM. Se usa en el navegador y en el simulador (Node).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AtlasEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const CFG = {
    cols: 5, rows: 4,
    maxTier: 10,
    tierBase: 0.05,        // ingreso/s de un item tier 1
    tierGrowth: 2.3,      // cada fusion multiplica el ingreso por 2.3 (> 2 = conviene fusionar)
    startCells: 8, cellsPerRegion: 2,
    regions: [            // costo y multiplicador de ingreso de cada region
      { name: 'Costa', icon: '🏖️' },
      { name: 'Selva', icon: '🌴' },
      { name: 'Montaña', icon: '⛰️' },
      { name: 'Desierto', icon: '🏜️' },
      { name: 'Glaciar', icon: '🧊' },
      { name: 'Archipiélago', icon: '🏝️' },
      { name: 'Sabana', icon: '🦁' },
      { name: 'Volcán', icon: '🌋' },
    ],
    regionCostBase: 100, regionCostGrowth: 10.5,
    manualMergeSec: 40,   // fusionar a mano da un premio = 40 s del ingreso del item resultante
    regionMult: 1.5,
    spawnCostBase: 6, spawnCostGrowth: 1.9,   // por region restaurada
    spawnBonusTier2: 0.06,                       // prob. extra de nacer tier 2 por region
    helperIntervals: [0, 30, 15, 8, 4, 2],     // segundos entre acciones del ayudante
    helperCostBase: 500, helperCostGrowth: 9,
    pageBonus: 0.02, pageCap: 50,      // cada "pagina del atlas" (fusion de tier 10) da +5% de ingreso
    offlineCapSec: 8 * 3600,
    energyMax: 100, energyRegen: 0.25,
    editionCostMult: 1.8, // cada edicion encarece las regiones x1.8 (el ingreso solo sube +50%)
    editionBonus: 0.5,    // cada edicion del atlas (prestigio) suma +50% de ingreso permanente
    comboWindow: 4, comboStep: 0.25, comboMax: 8,   // fusiones seguidas en menos de 4 s suben el premio   // 1 energia cada 4 s; cada spawn gasta 1
  };

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function newState(seed) {
    return {
      coins: 20, energy: 100, editions: 0, combo: 0, comboT: 0, lastGain: 0, stats: { merges: 0, spawns: 0 }, board: new Array(CFG.cols * CFG.rows).fill(0),
      regions: 0, helper: 0, pages: 0, helperTimer: 0,
      boost: 0,            // segundos restantes de x2 (anuncio recompensado)
      seed: seed || 1, rngCalls: 0, totalEarned: 0, t: 0,
    };
  }

  function rng(s) { const f = mulberry32(s.seed + s.rngCalls * 977); s.rngCalls++; return f(); }
  const cells = (s) => Math.min(CFG.cols * CFG.rows, CFG.startCells + s.regions * CFG.cellsPerRegion);
  const tierIncome = (t) => CFG.tierBase * Math.pow(CFG.tierGrowth, t - 1);
  const regionCost = (s) => Math.floor(CFG.regionCostBase * Math.pow(CFG.regionCostGrowth, s.regions) * Math.pow(CFG.editionCostMult, s.editions || 0));
  const spawnCost = (s) => Math.ceil(CFG.spawnCostBase * Math.pow(CFG.spawnCostGrowth, s.regions));
  const helperCost = (s) => Math.floor(CFG.helperCostBase * Math.pow(CFG.helperCostGrowth, s.helper));
  const helperMax = () => CFG.helperIntervals.length - 1;

  function incomePerSec(s) {
    let sum = 0;
    const n = cells(s);
    for (let i = 0; i < n; i++) if (s.board[i]) sum += tierIncome(s.board[i]);
    return sum * multiplier(s);
  }
  function multiplier(s) {
    return Math.pow(CFG.regionMult, s.regions) * (1 + CFG.pageBonus * Math.min(s.pages, CFG.pageCap)) * (1 + CFG.editionBonus * (s.editions || 0)) * (s.boost > 0 ? 2 : 1);
  }

  function emptyCell(s) {
    const n = cells(s);
    for (let i = 0; i < n; i++) if (!s.board[i]) return i;
    return -1;
  }

  function spawn(s) {
    const i = emptyCell(s);
    if (i < 0 || s.energy < 1 || s.coins < spawnCost(s)) return false;
    s.coins -= spawnCost(s); s.energy -= 1; s.stats.spawns++;
    s.board[i] = rng(s) < Math.min(0.6, CFG.spawnBonusTier2 * s.regions) ? 2 : 1;
    return true;
  }

  // Fusiona dos celdas del mismo tier. Devuelve true si se pudo.
  function merge(s, a, b, manual) {
    if (a === b || !s.board[a] || s.board[a] !== s.board[b]) return false;
    if (a >= cells(s) || b >= cells(s)) return false;
    const t = s.board[a];
    s.board[b] = 0; s.stats.merges++; s.lastGain = 0;
    if (t >= CFG.maxTier) { s.board[a] = 0; s.pages++; }
    else {
      s.board[a] = t + 1;
      if (manual) {
        s.combo = s.comboT > 0 ? Math.min(CFG.comboMax, s.combo + 1) : 1; s.comboT = CFG.comboWindow;
        const g = tierIncome(t + 1) * CFG.manualMergeSec * multiplier(s) * (1 + CFG.comboStep * (s.combo - 1));
        s.coins += g; s.totalEarned += g; s.lastGain = g;
      }
    }
    return true;
  }

  // Busca el par fusionable de menor tier.
  function findPair(s) {
    const n = cells(s);
    let best = null;
    for (let t = 1; t <= CFG.maxTier && !best; t++) {
      let first = -1;
      for (let i = 0; i < n; i++) {
        if (s.board[i] === t) { if (first < 0) first = i; else { best = [first, i]; break; } }
      }
    }
    return best;
  }

  function buyRegion(s) {
    if (s.regions >= CFG.regions.length || s.coins < regionCost(s)) return false;
    s.coins -= regionCost(s); s.regions++; return true;
  }
  function buyHelper(s) {
    if (s.helper >= helperMax() || s.coins < helperCost(s)) return false;
    s.coins -= helperCost(s); s.helper++; return true;
  }

  // Prestigio: reedita el atlas. Reinicia regiones, tablero y monedas; conserva paginas, ayudante y ediciones.
  function canPrestige(s) { return s.regions >= CFG.regions.length; }
  function prestige(s) {
    if (!canPrestige(s)) return false;
    s.editions = (s.editions || 0) + 1;
    s.coins = 20; s.energy = CFG.energyMax; s.regions = 0; s.board = new Array(CFG.cols * CFG.rows).fill(0);
    s.helperTimer = 0; s.combo = 0; s.comboT = 0;
    return true;
  }

  // Una accion del ayudante automatico.
  function helperAct(s) {
    const p = findPair(s);
    if (p) { merge(s, p[0], p[1]); return true; }
    return spawn(s);
  }

  // Avanza el tiempo dt segundos (online u offline). Ingreso + ayudante.
  function advance(s, dt) {
    const STEP = 1;
    let left = dt;
    while (left > 0) {
      const d = Math.min(STEP, left); left -= d;
      const inc = incomePerSec(s) * d;
      s.coins += inc; s.totalEarned += inc; s.t += d;
      s.energy = Math.min(CFG.energyMax, s.energy + CFG.energyRegen * d * (s.boost > 0 ? 2 : 1));
      if (s.boost > 0) s.boost = Math.max(0, s.boost - d);
      if (s.comboT > 0) { s.comboT = Math.max(0, s.comboT - d); if (!s.comboT) s.combo = 0; }
      const iv = CFG.helperIntervals[s.helper];
      if (iv > 0) {
        s.helperTimer += d;
        while (s.helperTimer >= iv) { s.helperTimer -= iv; if (!helperAct(s)) { s.helperTimer = 0; break; } }
      }
    }
  }

  // Tiempo offline: aplica el tope y avanza en pasos gruesos para ir rapido.
  function advanceOffline(s, dt) {
    const eff = Math.min(dt, CFG.offlineCapSec);
    let left = eff;
    while (left > 0) { const d = Math.min(10, left); advanceCoarse(s, d); left -= d; }
    return eff;
  }
  function advanceCoarse(s, d) {
    const inc = incomePerSec(s) * d;
    s.coins += inc; s.totalEarned += inc; s.t += d;
    s.energy = Math.min(CFG.energyMax, s.energy + CFG.energyRegen * d * (s.boost > 0 ? 2 : 1));
    if (s.boost > 0) s.boost = Math.max(0, s.boost - d);
    s.comboT = 0; s.combo = 0;
    const iv = CFG.helperIntervals[s.helper];
    if (iv > 0) {
      s.helperTimer += d;
      let guard = 0;
      while (s.helperTimer >= iv && guard++ < 50) { s.helperTimer -= iv; if (!helperAct(s)) { s.helperTimer = 0; break; } }
    }
  }

  // Accion "inteligente" de un jugador activo. Devuelve la accion hecha o null.
  function playerAct(s) {
    const p = findPair(s);
    if (p) { merge(s, p[0], p[1], true); return 'merge'; }
    if (canPrestige(s)) { prestige(s); return 'prestige'; }
    if (buyRegion(s)) return 'region';
    if (s.regions >= 1 && buyHelper(s)) return 'helper';
    if (spawn(s)) return 'spawn';
    return null;
  }

  return { CFG, newState, advance, advanceOffline, incomePerSec, multiplier, cells, tierIncome, regionCost, spawnCost,
    helperCost, helperMax, spawn, merge, findPair, canPrestige, prestige, buyRegion, buyHelper, playerAct, emptyCell };
});
