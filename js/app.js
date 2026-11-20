/* ==========================================================
   1. CONSTANTES Y ESTADO
   ========================================================== */
const TOTAL = 151;
const STORAGE_KEY = 'pokemonCapturados';
const API = 'https://pokeapi.co/api/v2/pokemon/';
const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

const ICONOS = {
  normal: '⚪', fire: '🔥', water: '💧', electric: '⚡', grass: '🌿', ice: '❄️', fighting: '🥊', poison: '☠️', ground: '⛰️',
  flying: '🕊️', psychic: '🔮', bug: '🐛', rock: '🪨', ghost: '👻', dragon: '🐉', fairy: '✨', steel: '⚙️', dark: '🌑',
};
const STATS_ES = { hp: 'HP', attack: 'Ataque', defense: 'Defensa', 'special-attack': 'At. esp.', 'special-defense': 'Def. esp.', speed: 'Velocidad' };

let capturados = cargarColeccion();
let pendiente = null;   // Pokémon consultado, esperando confirmación
let lector = null;      // instancia de Html5Qrcode
let ocupado = false;    // evita procesar varios QR a la vez

/* ==========================================================
   2. UTILIDADES
   ========================================================== */
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const pad = (n, l = 3) => String(n).padStart(l, '0');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const sprite = (id) => `${SPRITES}/${id}.png`;

/* ==========================================================
   3. localStorage
   ========================================================== */
function cargarColeccion() {
  try {
    const datos = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(datos) ? datos : [];   // vacío o dañado → colección nueva
  } catch {
    return [];
  }
}

function persistirColeccion() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(capturados));
  } catch {
    mostrarToast('No se pudo guardar tu colección en este dispositivo.', 'error');
  }
}

/* ==========================================================
   4. TOAST
   ========================================================== */
let temporizadorToast;
function mostrarToast(mensaje, tipo = 'info') {
  const toast = $('#toast');
  toast.textContent = mensaje;
  toast.className = `toast show ${tipo}`;
  clearTimeout(temporizadorToast);
  temporizadorToast = setTimeout(() => toast.classList.remove('show'), 3200);
}

/* ==========================================================
   5. NAVEGACIÓN Y TEMA
   ========================================================== */
function mostrarVista(vista) {
  $$('.view').forEach((v) => v.classList.toggle('hidden', v.id !== `view-${vista}`));
  $$('.nav button').forEach((b) => b.classList.toggle('on', b.dataset.view === vista));
  scrollTo({ top: 0 });
}

function cambiarTema() {
  const oscuro = document.documentElement.classList.toggle('dark');
  localStorage.setItem('tema', oscuro ? 'dark' : 'light');
}

/* ==========================================================
   6. PLANTILLAS HTML
   ========================================================== */
const insignias = (tipos) =>
  tipos.map((t) => `<span class="badge t-${t}">${ICONOS[t] || ''} ${cap(t)}</span>`).join('');

const tarjeta = (p) => `
  <button data-id="${p.id}" class="card t-${p.types[0]} p-3 text-left transition active:scale-95">
    <div class="tint relative flex h-32 items-center justify-center rounded-2xl">
      <span class="absolute left-3 top-3 text-[10px] font-extrabold">#${pad(p.id)}</span>
      <span class="absolute right-3 top-3 text-lg">${ICONOS[p.types[0]] || ''}</span>
      <img loading="lazy" class="h-28 w-28 drop-shadow-md" src="${p.image}" alt="${cap(p.name)}">
    </div>
    <h3 class="f mt-3 px-1 font-extrabold">${cap(p.name)}</h3>
    <div class="mt-2 flex flex-wrap gap-1 px-1">${insignias(p.types)}</div>
  </button>`;

const bloqueada = (id) => `
  <div class="card p-3 text-center">
    <div class="dots c2 flex h-20 items-center justify-center rounded-xl">
      <img loading="lazy" class="lock h-16 w-16" src="${sprite(id)}" alt="">
    </div>
    <p class="mut mt-2 text-[10px] font-extrabold">#${pad(id)}</p>
    <p class="soft text-[10px] font-bold">? ???</p>
  </div>`;

const htmlCargando = `
  <div class="py-10 text-center">
    <div class="spin mx-auto"></div>
    <p class="f mt-4 font-bold">Consultando Pokédex...</p>
  </div>`;

const htmlError = `
  <div class="py-8 text-center">
    <div class="text-5xl">⚠️</div>
    <p class="f mt-3 font-extrabold">No pudimos consultar la PokéAPI</p>
    <p class="soft mt-1 text-xs">Revisa tu conexión a Internet e inténtalo de nuevo.</p>
    <button data-act="cancelar" class="btn btn-sec mt-5 w-full">Cerrar</button>
  </div>`;

function ficha(p, modo) {
  const stats = p.stats.map((s) => `
    <div class="flex items-center gap-3">
      <span class="soft w-20 font-bold">${STATS_ES[s.name] || s.name}</span>
      <b class="w-7 text-right">${s.value}</b>
      <div class="track flex-1"><i style="width:${Math.min(100, s.value / 1.8)}%;background:rgb(var(--c))"></i></div>
    </div>`).join('');

  const habilidades = p.abilities.map((a) => `<span class="c2 rounded-full px-3 py-1.5 text-[11px] font-bold">${cap(a.replace(/-/g, ' '))}</span>`).join('');

  const acciones = modo === 'captura'
    ? `<div class="mt-6 flex gap-3"><button data-act="cancelar" class="btn btn-sec">Cancelar</button><button data-act="confirmar" class="btn btn-pri">Capturar</button></div>`
    : `<p class="mut mt-5 text-center text-[11px] font-bold">Capturado el ${new Date(p.capturedAt).toLocaleDateString('es-MX', { dateStyle: 'medium' })}</p>
       <button data-act="cancelar" class="btn btn-sec mt-3 w-full">Cerrar</button>`;

  return `
    <div class="t-${p.types[0]}">
      <div class="tint flex items-center justify-between rounded-3xl p-5">
        <div>
          <span class="text-[10px] font-extrabold">#${pad(p.id)}</span>
          <h3 class="f text-3xl font-extrabold" style="color:var(--tx)">${cap(p.name)}</h3>
          <div class="mt-3 flex flex-wrap gap-2">${insignias(p.types)}</div>
        </div>
        <img class="h-32 w-32 drop-shadow-lg" src="${p.image}" alt="${cap(p.name)}">
      </div>
      <div class="mt-4 grid grid-cols-2 gap-3">
        <div class="c2 rounded-2xl p-4"><p class="mut text-[10px] font-bold">ALTURA</p><p class="f text-lg font-extrabold">${p.height} m</p></div>
        <div class="c2 rounded-2xl p-4"><p class="mut text-[10px] font-bold">PESO</p><p class="f text-lg font-extrabold">${p.weight} kg</p></div>
      </div>
      <p class="mut mt-4 text-[10px] font-bold">HABILIDADES</p>
      <div class="mt-2 flex flex-wrap gap-2">${habilidades}</div>
      <p class="mut mt-5 text-[10px] font-bold">ESTADÍSTICAS BASE</p>
      <div class="mt-3 space-y-3 text-xs">${stats}</div>
      ${acciones}
    </div>`;
}

/* ==========================================================
   7. RENDER Y PROGRESO
   ========================================================== */
function renderizarPokedex() {
  const ordenados = [...capturados].sort((a, b) => a.id - b.id);
  const ids = new Set(ordenados.map((p) => p.id));

  $('#vacio').classList.toggle('hidden', ordenados.length > 0);
  $('#capturados').classList.toggle('hidden', ordenados.length === 0);
  $('#capturados').innerHTML = ordenados.map(tarjeta).join('');
  $('#bloqueados').innerHTML = Array.from({ length: TOTAL }, (_, i) => i + 1)
    .filter((id) => !ids.has(id)).map(bloqueada).join('');

  actualizarProgreso();
}

function actualizarProgreso() {
  const n = capturados.length;
  const pct = (n / TOTAL) * 100;
  const valores = { pad: pad(n, 2), count: n, pending: TOTAL - n, pct: pct.toFixed(1) };

  $$('[data-bind]').forEach((el) => { el.textContent = valores[el.dataset.bind]; });
  $$('[data-bar]').forEach((el) => { el.style.width = `${pct}%`; });
  $('#donut').style.background = `conic-gradient(#ef5350 0 ${pct * 3.6}deg, var(--bd) ${pct * 3.6}deg)`;
}

/* ==========================================================
   8. BOTTOM SHEET Y DETALLE
   ========================================================== */
function abrirSheet(html) {
  $('#sheet-body').innerHTML = html;
  $('#sheet').classList.add('open');
}

function cerrarSheet() {
  $('#sheet').classList.remove('open');
  pendiente = null;
  if (ocupado && $('#scanner').classList.contains('open')) reanudarLector(0);  // seguir escaneando
}

function abrirDetalle(id) {
  const p = capturados.find((x) => x.id === id);
  if (p) abrirSheet(ficha(p, 'detalle'));
}

/* ==========================================================
   9. POKÉAPI Y CAPTURA
   ========================================================== */
function validarQR(texto) {
  const m = /^pokemon:(\d+)$/.exec(String(texto).trim());
  if (!m) return null;
  const id = Number(m[1]);
  return id >= 1 && id <= TOTAL ? id : null;
}

async function buscarPokemon(id) {
  if (!navigator.onLine) throw new Error('sin conexión');
  const res = await fetch(API + id);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const d = await res.json();
  return {
    id: d.id,
    name: d.name,
    image: d.sprites.other['official-artwork'].front_default || d.sprites.front_default,
    types: d.types.map((t) => t.type.name),
    height: d.height / 10,
    weight: d.weight / 10,
    abilities: d.abilities.map((a) => a.ability.name),
    stats: d.stats.map((s) => ({ name: s.stat.name, value: s.base_stat })),
    capturedAt: null,
  };
}

function guardarPokemon(p) {
  if (capturados.some((x) => x.id === p.id)) return false;   // sin duplicados
  capturados.push({ ...p, capturedAt: new Date().toISOString() });
  persistirColeccion();
  renderizarPokedex();
  return true;
}

function confirmarCaptura() {
  if (!pendiente) return;
  const p = pendiente;
  if (guardarPokemon(p)) mostrarToast(`¡${cap(p.name)} fue agregado a tu Pokédex! ${ICONOS[p.types[0]] || ''}`, 'ok');
  else mostrarToast('Este Pokémon ya había sido capturado.', 'info');
  pendiente = null;
  ocupado = false;
  $('#sheet').classList.remove('open');
  cerrarEscaner();
  mostrarVista('pokedex');
}

/* ==========================================================
   10. ESCÁNER QR
   ========================================================== */
function errorCamara(mensaje) {
  $('#estado-cam').textContent = '';
  $('#err-cam-txt').textContent = mensaje;
  $('#err-cam').classList.remove('hidden');
}

async function abrirEscaner() {
  $('#scanner').classList.add('open');
  $('#err-cam').classList.add('hidden');
  $('#estado-cam').textContent = 'Iniciando cámara...';
  ocupado = false;

  if (typeof Html5Qrcode === 'undefined') return errorCamara('No se pudo cargar el lector QR. Conéctate a Internet una vez e inténtalo de nuevo.');

  try {
    lector = lector || new Html5Qrcode('reader');
    await lector.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 230, height: 230 } }, leerQR, () => {});
    $('#estado-cam').textContent = '● Esperando código QR...';
  } catch (e) {
    const rechazado = /permission|notallowed|denied/i.test(String(e));
    errorCamara(rechazado ? 'Permiso de cámara rechazado. Actívalo en los ajustes del navegador.' : 'No se pudo acceder a la cámara de este dispositivo.');
  }
}

async function cerrarEscaner() {
  $('#scanner').classList.remove('open');
  try { if (lector && lector.isScanning) await lector.stop(); } catch {}
}

function reanudarLector(retraso) {
  setTimeout(() => {
    ocupado = false;
    try { lector.resume(); } catch {}
  }, retraso);
}

async function leerQR(texto) {
  if (ocupado) return;
  ocupado = true;
  try { lector.pause(true); } catch {}

  const id = validarQR(texto);
  if (!id) {
    mostrarToast('Este código QR no pertenece a la Pokédex.', 'error');
    return reanudarLector(1800);
  }
  if (capturados.some((p) => p.id === id)) {
    mostrarToast('Este Pokémon ya había sido capturado.', 'info');
    return reanudarLector(1800);
  }

  abrirSheet(htmlCargando);
  try {
    pendiente = await buscarPokemon(id);
    abrirSheet(ficha(pendiente, 'captura'));
  } catch {
    abrirSheet(htmlError);
    mostrarToast('No fue posible consultar la información del Pokémon.', 'error');
  }
}

/* ==========================================================
   11. EVENTOS
   ========================================================== */
const ACCIONES = {
  tema: cambiarTema,
  escanear: abrirEscaner,
  reintentar: abrirEscaner,
  'cerrar-scan': cerrarEscaner,
  cancelar: cerrarSheet,
  confirmar: confirmarCaptura,
};

document.addEventListener('click', (e) => {
  const accion = e.target.closest('[data-act]');
  if (accion) return ACCIONES[accion.dataset.act]?.();

  const vista = e.target.closest('[data-view]');
  if (vista) return mostrarVista(vista.dataset.view);

  const carta = e.target.closest('#capturados [data-id]');
  if (carta) abrirDetalle(Number(carta.dataset.id));
});

window.addEventListener('offline', () => mostrarToast('Sin conexión: tu colección sigue disponible.', 'info'));
window.addEventListener('online', () => mostrarToast('Conexión restablecida.', 'ok'));

/* ==========================================================
   12. INICIO Y SERVICE WORKER
   ========================================================== */
renderizarPokedex();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}
