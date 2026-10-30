// Simulador de balance de Atlas Merge.
// Uso: node simular.js [dias] [ruta-al-engine]  (por defecto busca engine.js en esta carpeta)
const path = require('path');
const fs = require('fs');
const candidatos = [process.argv[3], path.join(__dirname, 'engine.js'), path.join(__dirname, '..', 'prototipos', 'atlas-merge', 'engine.js')].filter(Boolean);
const E = require(candidatos.find(p => fs.existsSync(p)));
const DAYS = Number(process.argv[2]) || 7;

// sesiones: horas del dia en que abre el juego y cuantos segundos juega
const PERFILES = {
  'Activo   (3 x 15 min/dia)': { horas: [8, 14, 21], dur: 900 },
  'Casual   (2 x 3 min/dia) ': { horas: [9, 21], dur: 180 },
  'Chequeo  (3 x 1 min/dia) ': { horas: [7, 15, 23], dur: 60 },
  'Minimo   (1 x 1 min/dia) ': { horas: [20], dur: 60 },
};

function simular(perfil) {
  const s = E.newState(42);
  const hitos = new Array(E.CFG.regions.length).fill(null);
  const ayud = new Array(E.helperMax()).fill(null);
  let ahora = 0, perdido = 0;
  let primeraEd = null;
  const sesiones = [];
  for (let d = 0; d < DAYS; d++) for (const h of perfil.horas) sesiones.push(d * 86400 + h * 3600);
  for (const inicio of sesiones) {
    const gap = inicio - ahora;
    if (gap > E.CFG.offlineCapSec) perdido += gap - E.CFG.offlineCapSec;
    if (gap > 0) E.advanceOffline(s, gap);
    ahora = inicio;
    for (let t = 0; t < perfil.dur; t += 1.5) {
      E.advance(s, 1.5); ahora += 1.5;
      const a = E.playerAct(s);
      if (a === 'region' && hitos[s.regions - 1] === null) hitos[s.regions - 1] = ahora;
      if (a === 'helper' && ayud[s.helper - 1] === null) ayud[s.helper - 1] = ahora;
      if (a === 'prestige' && primeraEd === null) primeraEd = ahora;
    }
  }
  return { s, hitos, ayud, perdido, primeraEd };
}

const fmt = (sec) => sec === null ? '   -  ' : sec < 172800 ? (sec / 3600).toFixed(1).padStart(5) + 'h' : (sec / 86400).toFixed(1).padStart(5) + 'd';
const num = (n) => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : n.toFixed(1);

console.log(`\nATLAS MERGE - simulacion de ${DAYS} dias\n`);
console.log('Momento en que se restaura cada region (h = horas, d = dias, "-" = no llega):\n');
console.log('Perfil'.padEnd(27) + E.CFG.regions.map((r) => r.name.slice(0, 6).padStart(7)).join(''));
const resumen = [];
for (const [nombre, p] of Object.entries(PERFILES)) {
  const r = simular(p);
  console.log(nombre.padEnd(27) + r.hitos.map((h) => fmt(h).padStart(7)).join(''));
  resumen.push([nombre, r]);
}
console.log('\nEstado final:\n');
console.log('Perfil'.padEnd(27) + 'regiones  ayudante  paginas  ediciones  1ra edicion  ingreso/s');
for (const [nombre, r] of resumen) {
  console.log(nombre.padEnd(27) + String(r.s.regions).padStart(8) + String(r.s.helper).padStart(10) +
    String(r.s.pages).padStart(9) + String(r.s.editions).padStart(11) + fmt(r.primeraEd).padStart(13) + num(E.incomePerSec(r.s)).padStart(12));
}
console.log('\nHoras offline por encima del tope (8 h) que se pierden, en total:');
for (const [nombre, r] of resumen) console.log('  ' + nombre + (r.perdido / 3600).toFixed(0) + ' h');

// Alertas de balance
console.log('\nAlertas:');
let alertas = 0;
for (const [nombre, r] of resumen) {
  let prev = 0;
  r.hitos.forEach((h, i) => {
    if (h !== null && h - prev > 2 * 86400) { console.log(`  - ${nombre.trim()}: ${((h - prev) / 86400).toFixed(1)} dias esperando la region ${i + 1}`); alertas++; }
    if (h !== null) prev = h;
  });
}
if (!alertas) console.log('  (ninguna espera de mas de 2 dias entre regiones)');
