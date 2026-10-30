/* ================================================================
   CONFIG + Supabase. Las llaves y datos van en config.js.
   El proxy (Edge Function) es quien guarda las API keys de
   InfoSiniestral y PlacApi.
   ================================================================ */
const CONFIG = window.VEHITRACK_CONFIG || {};
const SB_OK = !!(CONFIG.SUPABASE_URL && !CONFIG.SUPABASE_URL.includes('TU-PROYECTO') && CONFIG.SUPABASE_ANON_KEY && !CONFIG.SUPABASE_ANON_KEY.includes('TU-LLAVE'));
const sb = SB_OK ? window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY) : null;

/* ================================================================
   DATOS DE MUESTRA — solo para vista previa sin backend.
   ================================================================ */
const SAMPLE = {"placa":"HEW146","infosiniestral":{"placa":"HEW146","vehiculo":{"marca":"CHEVROLET","modelo":"2020","clase":"CAMIONETA PASAJ.","tipo":"TRACKER [FL] LT TP 1800CC","valor":59900000},"aseguradoras":[{"compania":"ALLIANZ","placa":"HEW146","ini_vigencia":"04/05/2026","fin_vigencia":"04/05/2027","estado":"VIGENTE"},{"compania":"HDI-LIBERTY","placa":"HEW146","ini_vigencia":"04/05/2026","fin_vigencia":"04/05/2027","estado":"CADUCO"},{"compania":"MUNDIAL","placa":"HEW146","ini_vigencia":"21/01/2026","fin_vigencia":"21/01/2027","estado":"VIGENTE"}],"siniestros":[],"polizas_soat":[{"compania":"MUNDIAL","placa":"HEW146","ini_vigencia":"21/01/2026","fin_vigencia":"20/01/2027","estado":"VIGENTE"},{"compania":"MUNDIAL","placa":"HEW146","ini_vigencia":"21/01/2025","fin_vigencia":"20/01/2026","estado":"CADUCÓ"},{"compania":"MUNDIAL","placa":"HEW146","ini_vigencia":"18/01/2024","fin_vigencia":"17/01/2025","estado":"CADUCÓ"}],"guia_valores":{"guia":"362","codigo":"01606232","marca":"CHEVROLET","modelo":"2020","clase":"CAMIONETA PASAJ.","valor_guia":"$59.900.000","tipo":"TRACKER [FL] LT TP 1800CC"}},"infosiniestralError":null,"placapi":{"vehicle":{"data":{"placa":"HEW146","marca":"CHEVROLET","linea":"TRACKER","modelo":2020,"cilindraje":1800,"combustible":"GASOLINA","servicio":"Particular","carroceria":"CAMIONETA","color":"BLANCO","motor":"CLL902730","chasis":"3GNCJ8EE4LL902730","vin":"3GNCJ8EE4LL902730","fechaMatricula":"2020-03-15","organismoTransito":"SECRETARIA DE MOVILIDAD DE BARRANQUILLA","estado":"activo","clase":"CAMIONETA","puertas":5,licenciaTransito:"10035451456","regrabados":[],"importado":false}},"soat":{"data":{"vigente":true,"aseguradora":"MUNDIAL","poliza":"14614842715","fechaExpedicion":"21/01/2026","fechaVencimiento":"20/01/2027","diasParaVencer":106}},"rtm":{"data":{"vigente":true,"cda":"CDA DEL CARIBE","fechaExpedicion":"10/02/2026","fechaVencimiento":"10/02/2027","diasParaVencer":126,"certificadoNumero":"189733821"}},"antecedentes":{"data":{"prendas":[],"embargos":[],"historicoPropietarios":1}},"simit":{"data":{"totalDeuda":0,"totalMultas":0,"pazSalvo":true}},"impuestos":{"data":{"departamento":"Atlántico","anios":[{"anio":2026,"valor":398000,"pagado":true}],"totalPendiente":0}},"fasecolda":{"data":{"codigo":"01606232","valorComercial":59900000}},"picoYPlaca":{"data":[{"ciudad":"Barranquilla","hoyAplica":false,"manianaAplica":false,"horarios":"L–V"}]}},"placapiError":null};

/* ================================================================
   CAPA DE PROVEEDOR — aquí se enchufa la API real.
   ================================================================ */
const sleep = ms => new Promise(r=>setTimeout(r,ms));
/* ================================================================
   Utilidades
   ================================================================ */
const $ = s => document.querySelector(s);
const money = n => '$ ' + Number(n||0).toLocaleString('es-CO');
function fmtDate(s){ if(!s) return '—'; const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s); return m? `${m[3]}/${m[2]}/${m[1]}` : s; }
function vence(dias){ if(dias==null) return 'info'; if(dias<0) return 'bad'; if(dias<=30) return 'warn'; return 'ok'; }

/* ================================================================
   Sesión y tipo de informe (pago directo, sin wallet)
   ================================================================ */
let sesion = null;
let saldo = 0;
const COSTO_CONSULTA = 20000; // precio único por consulta
let toastT;
function toast(msg){ const t=$('#toast'); if(!t) return; t.textContent=msg; t.style.opacity='1'; t.style.transform='translateX(-50%) translateY(0)'; clearTimeout(toastT); toastT=setTimeout(()=>{ t.style.opacity='0'; t.style.transform='translateX(-50%) translateY(20px)'; }, 3000); }

/* --- Estado de sesión en el header --- */
function pintarSesion(){
  const login=$('#loginBtn'), acct=$('#acctChip'), wallet=$('#walletChip');
  if(!sb){ login.hidden=true; acct.hidden=true; wallet.hidden=true; const hb0=$('#histBtn'); if(hb0) hb0.hidden=true; return; }      // modo demo
  const hb=$('#histBtn');
  if(sesion){ login.hidden=true; acct.hidden=false; wallet.hidden=false; if(hb) hb.hidden=false; $('#acctEmail').textContent=sesion.user.email; }
  else { login.hidden=false; acct.hidden=true; wallet.hidden=true; if(hb) hb.hidden=true; }
}
function pintarWallet(){ const el=$('#walletCr'); if(el) el.textContent = money(saldo); }
async function cargarSaldo(){
  if(!sb || !sesion) return;
  const { data } = await sb.from('wallets').select('creditos').maybeSingle();
  saldo = data?.creditos ?? 0; pintarWallet();
}

/* --- Login / logout --- */
let lgModo = 'signin'; // 'signin' | 'signup'
function abrirLogin(){ lgModo='signin'; pintarModoLogin(); $('#loginOv').classList.remove('hidden'); }
function cerrarLogin(){ $('#loginOv').classList.add('hidden'); }
function toggleLoginMode(){
  lgModo = (lgModo==='signin') ? 'signup' : 'signin';
  pintarModoLogin();
}
function pintarModoLogin(){
  $('#lgErr').classList.add('hidden'); $('#lgOk').classList.add('hidden');
  if(lgModo==='signup'){
    $('#lgTitulo').textContent = 'Crear cuenta';
    $('#lgSub').textContent = 'Regístrate para empezar a consultar y llevar tu saldo.';
    $('#lgBtn').textContent = 'Crear cuenta';
    $('#lgBtn').dataset.act='registrar';
    $('#lgTogglePre').textContent = '¿Ya tienes cuenta?';
    $('#lgToggleLink').textContent = 'Ingresar';
    $('#lgAcc').hidden = false; $('#lgNacBox').hidden = false;
    { const hoy=new Date(); $('#lgNac').max = hoy.toISOString().slice(0,10); }
  } else {
    $('#lgTitulo').textContent = 'Ingresar';
    $('#lgSub').textContent = 'Accede a tu cuenta para consultar y ver tu saldo.';
    $('#lgBtn').textContent = 'Ingresar';
    $('#lgBtn').dataset.act='login';
    $('#lgTogglePre').textContent = '¿No tienes cuenta?';
    $('#lgToggleLink').textContent = 'Crear cuenta';
    $('#lgAcc').hidden = true; $('#lgNacBox').hidden = true;
  }
}
async function login(){
  const email=$('#lgEmail').value.trim(), password=$('#lgPass').value, err=$('#lgErr');
  err.classList.add('hidden'); $('#lgOk').classList.add('hidden');
  if(!email||!password){ err.textContent='Escribe tu correo y contraseña.'; err.classList.remove('hidden'); return; }
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if(error){ err.textContent = error.message.includes('Invalid')?'Correo o contraseña incorrectos.':error.message; err.classList.remove('hidden'); return; }
  cerrarLogin();
}
function edadEnAnios(iso){
  const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(iso||''); if(!m) return null;
  const y=+m[1], mo=+m[2], d=+m[3], hoy=new Date();
  const f=new Date(y,mo-1,d); if(f.getFullYear()!==y||f.getMonth()!==mo-1||f.getDate()!==d||f>hoy) return null;
  let e=hoy.getFullYear()-y; if(hoy.getMonth()<mo-1||(hoy.getMonth()===mo-1&&hoy.getDate()<d)) e--; return e;
}
async function registrar(){
  const email=$('#lgEmail').value.trim(), password=$('#lgPass').value, err=$('#lgErr'), ok=$('#lgOk');
  err.classList.add('hidden'); ok.classList.add('hidden');
  if(!email||!password){ err.textContent='Escribe tu correo y contraseña.'; err.classList.remove('hidden'); return; }
  if(password.length<8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)){ err.textContent='La contraseña debe tener al menos 8 caracteres, con letras y números.'; err.classList.remove('hidden'); return; }
  // Verificación de edad: solo mayores de 18 años. La fecha se usa para validar y NO se guarda.
  const nac = $('#lgNac').value;
  if(!nac){ err.textContent='Escribe tu fecha de nacimiento.'; err.classList.remove('hidden'); return; }
  const edad = edadEnAnios(nac);
  if(edad===null || edad>120){ err.textContent='La fecha de nacimiento no es válida.'; err.classList.remove('hidden'); return; }
  if(edad<18){ err.textContent='VehiTrack es solo para mayores de 18 años. No podemos crear tu cuenta.'; err.classList.remove('hidden'); return; }
  if(!$('#lgAccChk').checked){ err.textContent='Debes aceptar los Términos y Condiciones y el tratamiento de datos.'; err.classList.remove('hidden'); return; }
  const btn=$('#lgBtn'); btn.textContent='Creando cuenta…'; btn.disabled=true;
  const { data, error } = await sb.auth.signUp({ email, password, options:{ data:{ mayor_de_edad:true, acepto_terminos_at:new Date().toISOString(), version_terminos:'1.0' } } });
  btn.disabled=false; btn.textContent='Crear cuenta';
  if(error){ err.textContent = error.message.includes('already registered')?'Ese correo ya tiene una cuenta. Inicia sesión.':error.message; err.classList.remove('hidden'); return; }
  if(data?.session){ // confirmación de correo desactivada: ya quedó logueado
    cerrarLogin();
  } else { // confirmación de correo activada: falta que confirme el enlace
    ok.textContent = 'Cuenta creada. Revisa tu correo y confirma el enlace para poder ingresar.';
    ok.classList.remove('hidden');
  }
}
async function logout(){ await sb.auth.signOut(); sesion = null; pintarSesion(); mostrar('vConsulta'); }

/* --- Recarga (Wompi: Nequi, PSE, tarjeta) --- */
/* ================================================================
   Recarga de saldo (Wompi) — el saldo se descuenta al instante al
   consultar, sin pasar por Wompi en cada consulta individual.
   ================================================================ */
function abrirRecarga(){ if(sb && !sesion){ abrirLogin(); return; } $('#recargaOv').classList.remove('hidden'); }
function cerrarRecarga(){ $('#recargaOv').classList.add('hidden'); }
async function recargar(monto){
  if(!sb){ // vista previa: Supabase/Wompi aún no están conectados
    saldo += monto; pintarWallet(); cerrarRecarga();
    toast('Vista previa: se simuló la recarga (Wompi aún no está conectado).');
    return;
  }
  cerrarRecarga();
  toast('Preparando el pago seguro…');
  const { data, error } = await sb.functions.invoke('recarga-firma', { body:{ monto } });
  if(error || !data?.reference){ toast('No pudimos iniciar la recarga. Intenta de nuevo en un minuto.'); return; }
  const f = document.createElement('form');
  f.method='GET'; f.action='https://checkout.wompi.co/p/';
  const add=(k,v)=>{ const i=document.createElement('input'); i.type='hidden'; i.name=k; i.value=String(v); f.appendChild(i); };
  add('public-key', data.publicKey);
  add('currency', 'COP');
  add('amount-in-cents', data.amountInCents);
  add('reference', data.reference);
  add('signature:integrity', data.signature);
  add('redirect-url', location.origin + location.pathname);
  document.body.appendChild(f); f.submit();
}

/* ================================================================
   Motor de riesgo — calcula el semáforo desde el informe
   ================================================================ */
function esVigente(estado){ return (estado||'').toString().toUpperCase().startsWith('VIGENTE'); }

/* ----------------------------------------------------------------
   REGLAS DEL SEMÁFORO (ajustables aquí)
   VERDE    : sin señales, o solo "ninguna póliza de aseguradora vigente".
   AMARILLO : 1 o más de: SOAT vencido · tecnomecánica vencida ·
              1 siniestro de menos de UMBRAL_SINIESTRO · 1 o más multas/comparendos ·
              impuesto pendiente.
   ROJO     : 1 o más de: siniestro de UMBRAL_SINIESTRO o más · más de 1 siniestro ·
              embargo o gravamen (prenda) · multas por MULTAS_ROJO o más.
   ---------------------------------------------------------------- */
const UMBRAL_SINIESTRO = 8000000;   // pesos
const MULTAS_ROJO = 2000000;        // pesos de deuda en multas desde la cual pasa a rojo

// Convierte "$ 1.234.567", "1234567,50" o 1234567 en número; null si no se puede leer.
function aPesos(v){
  if(typeof v==='number') return isFinite(v)?v:null;
  let t=String(v??'').replace(/&[a-z#0-9]+;/gi,'').replace(/[^\d.,-]/g,'');
  if(!/\d/.test(t)) return null;
  t = /,\d{1,2}$/.test(t) ? t.replace(/\./g,'').replace(',','.') : t.replace(/[.,]/g,'');
  const n=Number(t); return isFinite(n)?n:null;
}
// Valor de un siniestro = suma del "valor reclamado" de sus amparos (o un campo de valor directo).
function valorSiniestro(x){
  if(!x||typeof x!=='object') return null;
  const gk=(o,k)=>{ const f=Object.keys(o||{}).find(q=>q.toLowerCase().replace(/[\s_]/g,'')===k); return f?o[f]:undefined; };
  let tot=0, hay=false;
  for(const am of (Array.isArray(x.amparos)?x.amparos:[])){ const n=aPesos(gk(am,'valorreclamado')); if(n!=null){ tot+=n; hay=true; } }
  if(hay) return tot;
  for(const k of ['valor_reclamado','valorreclamado','valor_siniestro','valor_pagado','valor']){ const n=aPesos(gk(x,k.replace(/_/g,''))); if(n!=null) return n; }
  return null;
}

function calcularRiesgo(r){
  const flags = [];
  const push = (nivel, texto) => flags.push({nivel, texto});

  const info = (r.infosiniestral && !r.infosiniestral.sinResultados) ? r.infosiniestral : null;
  const pla = r.placapi || null;
  const aseg = info?.aseguradoras||[];
  const soatInfoArr = info?.polizas_soat||[];
  const siniestros = info?.siniestros||[];

  const v = pla?.vehicle?.data||{}, a = pla?.antecedentes?.data||{};
  const s = pla?.simit?.data, imp = pla?.impuestos?.data, soatPla = pla?.soat?.data||{}, rtm = pla?.rtm?.data||{};

  const asegVigente = aseg.some(x=>esVigente(x.estado));
  const soatInfoVigente = soatInfoArr.some(x=>esVigente(x.estado));

  // --- Siniestros ---
  if(siniestros.length>1){
    push('rojo', `${siniestros.length} siniestros registrados`);
  } else if(siniestros.length===1){
    const val = valorSiniestro(siniestros[0]);
    if(val==null) push('amarillo', '1 siniestro registrado (valor no informado: verifica el monto)');
    else if(val>=UMBRAL_SINIESTRO) push('rojo', `1 siniestro de ${money(val)} (8 millones o más)`);
    else push('amarillo', `1 siniestro de ${money(val)} (menos de 8 millones)`);
  } else if(aseg.length || soatInfoArr.length){
    push('verde', 'Sin siniestros registrados');
  }

  // --- Aseguradora: sin póliza vigente NO cambia el semáforo (solo informa) ---
  if(asegVigente) push('verde', 'Tiene una póliza de aseguradora vigente');
  else if(aseg.length) push('verde', 'Sin póliza de aseguradora vigente actualmente (no afecta el semáforo)');

  // --- SOAT / tecnomecánica vencidos: amarillo ---
  if(soatPla.vigente===false) push('amarillo', 'SOAT vencido');
  else if(!pla && soatInfoArr.length && !soatInfoVigente) push('amarillo', 'SOAT vencido');
  if(rtm.vigente===false) push('amarillo', 'Tecnomecánica vencida');

  if(pla){
    // --- Rojo: embargo o gravamen ---
    if((a.embargos||[]).length) push('rojo', `Embargo(s) vigente(s): ${a.embargos.length}`);
    if((a.prendas||[]).length) push('rojo', `Gravamen / prenda vigente ante ${(a.prendas[0].acreedor||'').split(' ').slice(0,3).join(' ')}…`);
    if(v.estado && v.estado.toLowerCase()!=='activo') push('rojo', `Estado del registro: ${v.estado}`);
    if((v.regrabados||[]).length) push('rojo', 'Regrabación de seriales detectada');
    // --- Multas: amarillo desde 1; rojo si la deuda llega a MULTAS_ROJO ---
    const deuda = s ? (Number(s.totalDeuda)||0) : 0;
    if(deuda>=MULTAS_ROJO) push('rojo', `Multas SIMIT: ${money(deuda)}`);
    else if(deuda>0) push('amarillo', `Multas o comparendos SIMIT: ${money(deuda)}`);
    // --- Impuesto pendiente: amarillo ---
    if(imp && imp.totalPendiente>0) push('amarillo', `Impuesto pendiente: ${money(imp.totalPendiente)}`);

    // --- Señales positivas / informativas ---
    if(!(a.embargos||[]).length && !(a.prendas||[]).length) push('verde', 'Sin gravámenes ni embargos');
    if(s && s.pazSalvo) push('verde', 'Paz y salvo de multas (SIMIT)');
    if(soatPla.vigente) push('verde', soatPla.diasParaVencer!=null && soatPla.diasParaVencer<=30 ? `SOAT vigente (vence en ${soatPla.diasParaVencer} días)` : 'SOAT vigente');
    if(rtm.vigente) push('verde', rtm.diasParaVencer!=null && rtm.diasParaVencer<=30 ? `Tecnomecánica vigente (vence en ${rtm.diasParaVencer} días)` : 'Tecnomecánica vigente');
  }

  const nivel = flags.some(f=>f.nivel==='rojo') ? 'rojo' : flags.some(f=>f.nivel==='amarillo') ? 'amarillo' : 'verde';
  const verdict = {
    verde:'Sin señales de alerta con la información disponible.',
    amarillo:'Requiere atención. Hay pendientes o condiciones que debes verificar y negociar antes de cerrar el negocio.',
    rojo:'Alto riesgo. Se detectaron condiciones graves; recomendamos no comprar hasta aclararlas por completo.'
  }[nivel];
  return {nivel, verdict, flags};
}

/* ================================================================
   Render del informe
   ================================================================ */
const check = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`;
const warnIco = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>`;
function row(k,v){ return `<div class="rrow"><span class="rk">${k}</span><span class="rv">${v??'—'}</span></div>`; }
function icoBox(path){ return `<span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg></span>`; }
function badge(estado){ const map={ok:'Al día',warn:'Atención',bad:'Vencido',info:'Informativo'}; return `<span class="badge ${estado}">${map[estado]||estado}</span>`; }

function escHtml(s){ return String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function asegVigenteBadge(lista){ return lista.some(a=>esVigente(a.estado)) ? 'ok' : 'warn'; }

let ultimoInforme = null; // para el botón de WhatsApp

// Escapa recursivamente TODO texto que viene de proveedores externos antes de pintarlo con innerHTML.
function sanear(x){
  if(typeof x==='string') return escHtml(x);
  if(Array.isArray(x)) return x.map(sanear);
  if(x && typeof x==='object'){ const o={}; for(const k in x) o[escHtml(k)] = sanear(x[k]); return o; }
  return x;
}

function renderInforme(raw){
  ultimoInforme = raw;            // crudo, solo para el texto de WhatsApp
  const r = sanear(raw);          // saneado, para el HTML
  const escHtml = x => x ?? '';   // ya está escapado arriba; evita doble escape
  const folio = 'VHT-' + (r.placa||'') + '-' + Date.now().toString(36).toUpperCase().slice(-6);

  const info = (r.infosiniestral && !r.infosiniestral.sinResultados) ? r.infosiniestral : null;
  const sinInfoSiniestral = r.infosiniestral?.sinResultados;
  const pla = r.placapi || null;

  const v = pla?.vehicle?.data || info?.vehiculo || {};
  const a = pla?.antecedentes?.data, s = pla?.simit?.data, soatPla = pla?.soat?.data, rtm = pla?.rtm?.data, fc = pla?.fasecolda?.data, lic = pla?.licencia?.data;
  const impSec = pla?.impuestos || {}, imp = impSec.data;

  const aseg = info?.aseguradoras||[];
  const soatInfoArr = info?.polizas_soat||[];
  const siniestros = info?.siniestros||[];
  const gv = info?.guia_valores||null;

  const riesgo = calcularRiesgo(r);
  const lights = ['rojo','amarillo','verde'].map(n=>`<span class="light ${n===riesgo.nivel?'on':''}"></span>`).join('');
  const lvlTxt = {verde:'RIESGO BAJO',amarillo:'RIESGO MEDIO',rojo:'RIESGO ALTO'}[riesgo.nivel];

  const flagsHTML = riesgo.flags.length ? riesgo.flags.map(f=>{
    const c = f.nivel==='verde'?'ok':f.nivel==='amarillo'?'warn':'bad';
    return `<div class="alerta ${c==='bad'?'bad':''}" style="margin-bottom:6px;${f.nivel==='verde'?'background:var(--verde-soft);border-color:#bfe6d3;':''}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:${f.nivel==='verde'?'var(--verde)':f.nivel==='amarillo'?'var(--ambar)':'var(--rojo)'}">${f.nivel==='verde'?'<path d="M20 6L9 17l-5-5"/>':'<path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>'}</svg>
      <div class="t">${escHtml(f.texto)}</div></div>`;
  }).join('') : `<div class="empty-sec">No se detectaron señales relevantes con la información disponible.</div>`;

  const estadoTag = estado => esVigente(estado) ? `<span class="tag ok">Vigente</span>` : `<span class="tag bad">${escHtml(estado||'No vigente')}</span>`;
  const asegRows = aseg.length ? aseg.map(x=>row(escHtml(x.compania), `${escHtml(x.ini_vigencia)} → ${escHtml(x.fin_vigencia)} ${estadoTag(x.estado)}`)).join('')
    : `<div class="empty-sec">${r.infosiniestralError?'No disponible en esta consulta.':'Sin historial de aseguradoras para esta placa.'}</div>`;
  const soatInfoRows = soatInfoArr.length ? soatInfoArr.map(x=>row(escHtml(x.compania), `${escHtml(x.ini_vigencia)} → ${escHtml(x.fin_vigencia)} ${estadoTag(x.estado)}`)).join('')
    : `<div class="empty-sec">${r.infosiniestralError?'No disponible en esta consulta.':'Sin historial de SOAT (aseguradoras) para esta placa.'}</div>`;

  // Siniestros: cada uno se muestra ordenado (aseguradora, fecha, vehículo, valores y amparos).
  // Los datos personales del asegurado (cédula, póliza, nombre completo) NO se muestran: el nombre sale con iniciales.
  const enmascarar = s => String(s??'').replace(/&[a-z#0-9]+;/gi,'').trim().split(/\s+/).filter(Boolean).map(w=>w[0]+'***').join(' ');
  const gk = (o,k)=>{ if(!o||typeof o!=='object') return undefined; const f=Object.keys(o).find(q=>q.toLowerCase().replace(/[\s_]/g,'')===k); return f?o[f]:undefined; };
  const NO_EXTRA = /^(detalle|amparos|numero|aseguradora|compania|fecha|asegurado|cedula|poliza|motor|chasis|marca|clase|modelo|valor_asegurado)$/i;
  const PERSONAL = /nombre|name|document|c[eé]dula|identific|propiet|titular|tel[eé]fono|celular|direcci|correo|e-?mail|licencia|asegurad|p[oó]liza/i;
  function siniestroHTML(x){
    if(!x || typeof x!=='object') return row('Registro', escHtml(x));
    const aseg = x.aseguradora || x.compania;
    const veh = [x.marca,x.clase,x.modelo].filter(Boolean).join(' · ');
    const amp = Array.isArray(x.amparos) ? x.amparos : [];
    const ampHTML = amp.map(a=>{
      const nombre = gk(a,'amparo'), estado = gk(a,'estado'), aviso = gk(a,'aviso'), valor = gk(a,'valorreclamado');
      return `<div class="amp"><div class="amp-t"><span>${escHtml(nombre||'Amparo')}</span>${estado?`<span class="tag warn">${escHtml(estado)}</span>`:''}</div>
        <div class="amp-s">${aviso?`Aviso: ${escHtml(aviso)}`:''}${aviso&&valor?' · ':''}${valor?`Valor reclamado: <b>${escHtml(valor)}</b>`:''}</div></div>`;
    }).join('');
    const extras = Object.entries(x).filter(([k,val])=>!NO_EXTRA.test(k) && !PERSONAL.test(k) && val!=null && typeof val!=='object' && String(val).trim()!=='')
      .map(([k,val])=>row(escHtml(k.replace(/_/g,' ')), escHtml(val))).join('');
    return `<div class="sin" data-siniestro="1">
      <div class="sin-h"><b>${escHtml(aseg||'Siniestro')}</b>${x.fecha?`<span>${escHtml(x.fecha)}</span>`:''}</div>
      ${veh?row('Vehículo', escHtml(veh)):''}
      ${x.valor_asegurado?row('Valor asegurado', escHtml(x.valor_asegurado)):''}
      ${x.asegurado?row('Asegurado', escHtml(enmascarar(x.asegurado))):''}
      ${extras}
      ${ampHTML?`<div class="amp-wrap"><div class="amp-h">Amparos reclamados</div>${ampHTML}</div>`:''}
    </div>`;
  }
  const siniestrosHTML = siniestros.length ? siniestros.map(siniestroHTML).join('')
    : `<div class="empty-sec">${r.infosiniestralError?'No disponible en esta consulta.':'Sin siniestros registrados para esta placa.'}</div>`;

  // Ficha técnica Fasecolda (PlacApi)
  const ft = fc?.fichaTecnica||{};
  const fichaCampos = [['Potencia',ft.potencia?ft.potencia+' hp':'—'],['Cilindraje',ft.cilindraje?ft.cilindraje+' cc':'—'],['Transmisión',ft.transmision],['Caja',ft.tipoCaja],['Tracción',ft.traccion],['Peso',ft.peso?ft.peso+' kg':'—']].filter(([,val])=>val && val!=='—');
  const impRows = (imp?.anios||[]).map(x=>row(`Año ${x.anio}`, `${money(x.valor)} <span class="tag ${x.pagado?'ok':'bad'}">${x.pagado?'Pagado':'Pendiente'}</span>`)).join('');
  const pp = (pla?.picoYPlaca?.data||[])[0]||null;

  $('#informeBody').innerHTML = `
  <div class="report-logo-print"><img src="logo.png" alt="VehiTrack" /></div>
  <div class="report-head">
    <div class="rh-left">
      <span class="plate">${escHtml((r.placa||'').replace(/(.{3})(.*)/,'$1·$2'))}</span>
      <h2>${escHtml(v.marca)} ${escHtml(v.linea||v.tipo||v.clase)} ${escHtml(v.modelo)}</h2>
      <div class="sub">${escHtml(v.servicio||'')} ${v.combustible?'· '+escHtml(v.combustible):''} ${v.color?'· '+escHtml(v.color):''}</div>
      <div class="rh-figs">
        <div class="fig"><div class="n">${gv?escHtml(gv.valor_guia):(fc?money(fc.valorComercial):'—')}</div><div class="l">Avalúo comercial</div></div>
        <div class="fig"><div class="n">${aseg.length}</div><div class="l">Aseguradoras en historial</div></div>
        <div class="fig"><div class="n ${siniestros.length?'red':''}">${siniestros.length}</div><div class="l">Siniestros</div></div>
      </div>
    </div>
    <div class="semaforo ${riesgo.nivel}">
      <div class="sem-top"><div class="lights">${lights}</div><div class="sem-lvl">${lvlTxt}</div></div>
      <div class="sem-verdict">${riesgo.verdict}</div>
    </div>
  </div>

  <div class="grid">
    <!-- Señales -->
    <div class="rcard wide">
      <div class="rc-head">${icoBox('<path d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>')}<h3>Señales detectadas</h3></div>
      ${flagsHTML}
      ${sinInfoSiniestral? `<div class="note" style="margin-top:8px">No se encontraron registros de aseguradoras, SOAT, siniestros ni avalúo para esta placa; el resto del informe sí se pudo consultar.</div>`:''}
      ${r.infosiniestralError? `<div class="note" style="margin-top:8px">Aseguradoras, SOAT, siniestros y avalúo no estuvieron disponibles en esta consulta.</div>`:''}
      ${r.placapiError? `<div class="note" style="margin-top:8px">RUNT, SOAT, tecnomecánica, SIMIT, impuestos y Fasecolda no estuvieron disponibles en esta consulta.</div>`:''}
    </div>

    ${v.marca||v.placa ? `
    <!-- Identificación -->
    <div class="rcard wide">
      <div class="rc-head">${icoBox('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 15h.01M11 15h6"/>')}<h3>Identificación del vehículo${pla?' (RUNT)':''}</h3>${v.estado?badge(v.estado.toLowerCase()==='activo'?'ok':'bad'):''}</div>
      <div class="ficha">
        ${[['Marca',v.marca],['Línea',v.linea||v.tipo],['Modelo',v.modelo],['Clase',v.clase],['Combustible',v.combustible],['Color',v.color],['Chasis',v.chasis]].filter(([,val])=>val).map(([k,val])=>`<div class="fc"><div class="v">${escHtml(val)}</div><div class="k">${k}</div></div>`).join('')}
      </div>
    </div>` : ''}

    <!-- Situación legal (PlacApi) -->
    ${a ? `
    <div class="rcard">
      <div class="rc-head">${icoBox('<path d="M12 3 4 7v5c0 4 3 7 8 9 5-2 8-5 8-9V7l-8-4z"/>')}<h3>Situación legal</h3>${badge((a.prendas||[]).length||(a.embargos||[]).length?'warn':'ok')}</div>
      ${row('Prendas', (a.prendas||[]).length? `<span class="tag bad">${a.prendas.length}</span>` : `<span class="tag ok">Ninguna</span>`)}
      ${row('Embargos', (a.embargos||[]).length? `<span class="tag bad">${a.embargos.length}</span>` : `<span class="tag ok">Ninguno</span>`)}
      ${row('Propietarios registrados', a.historicoPropietarios)}
    </div>` : `<div class="rcard"><div class="rc-head">${icoBox('<path d="M12 3 4 7v5c0 4 3 7 8 9 5-2 8-5 8-9V7l-8-4z"/>')}<h3>Situación legal</h3>${badge('info')}</div><div class="empty-sec">No disponible en esta consulta.</div></div>`}

    <!-- Multas SIMIT (PlacApi) -->
    <div class="rcard">
      <div class="rc-head">${icoBox('<circle cx="12" cy="12" r="9"/><path d="M12 8v4l2.5 2.5"/>')}<h3>Multas (SIMIT)</h3>${s?badge(s.totalDeuda>0?'bad':'ok'):badge('info')}</div>
      ${s? `
        ${row('Deuda total', `<b>${money(s.totalDeuda)}</b>`)}
        ${row('Estado', s.pazSalvo? '<span class="tag ok">Paz y salvo</span>' : '<span class="tag bad">Con deuda</span>')}
      ` : `<div class="empty-sec">No disponible en esta consulta.</div>`}
    </div>

    <!-- SOAT (PlacApi) -->
    <div class="rcard">
      <div class="rc-head">${icoBox('<path d="M12 3 4 7v5c0 4 3 7 8 9 5-2 8-5 8-9V7l-8-4z"/><path d="M9 12l2 2 4-4"/>')}<h3>SOAT (vigencia)</h3>${soatPla?badge(soatPla.vigente?vence(soatPla.diasParaVencer):'bad'):badge('info')}</div>
      ${soatPla? `
        ${row('Estado', soatPla.vigente? `<span class="tag ok">Vigente</span>`:`<span class="tag bad">Vencido</span>`)}
        ${row('Aseguradora', soatPla.aseguradora)}
        ${row('Vence', `${fmtDate(soatPla.fechaVencimiento)} <span class="tag ${vence(soatPla.diasParaVencer)}">${soatPla.diasParaVencer} días</span>`)}
      ` : `<div class="empty-sec">No disponible en esta consulta.</div>`}
    </div>

    <!-- Tecnomecánica (PlacApi) -->
    <div class="rcard">
      <div class="rc-head">${icoBox('<path d="M14.7 6.3a5 5 0 0 0-6.4 6.4L3 18l3 3 5.3-5.3a5 5 0 0 0 6.4-6.4l-2.8 2.8-2.3-2.3 2.8-2.8z"/>')}<h3>Tecnomecánica</h3>${rtm?badge(rtm.vigente?vence(rtm.diasParaVencer):'bad'):badge('info')}</div>
      ${rtm? `
        ${row('Estado', rtm.vigente? `<span class="tag ok">Vigente</span>`:`<span class="tag bad">Vencida</span>`)}
        ${row('CDA', rtm.cda)}
        ${row('Vence', `${fmtDate(rtm.fechaVencimiento)} <span class="tag ${vence(rtm.diasParaVencer)}">${rtm.diasParaVencer} días</span>`)}
      ` : `<div class="empty-sec">No disponible en esta consulta.</div>`}
    </div>

    <!-- Impuestos (PlacApi) -->
    <div class="rcard">
      <div class="rc-head">${icoBox('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 9h8M8 13h5"/>')}<h3>Impuestos</h3>${imp?badge(imp.totalPendiente>0?'warn':'ok'):badge('info')}</div>
      ${imp? `
        ${impRows}
        ${row('Total pendiente', `<b>${money(imp.totalPendiente)}</b>`)}
        <div class="note">${imp.departamento}</div>
      ` : `<div class="empty-sec">${impSec.error||'No disponible en esta consulta.'}</div>`}
    </div>

    <!-- Aseguradoras (InfoSiniestral) -->
    <div class="rcard wide">
      <div class="rc-head">${icoBox('<path d="M12 3 4 7v5c0 4 3 7 8 9 5-2 8-5 8-9V7l-8-4z"/>')}<h3>Historial de aseguradoras</h3>${badge(aseg.length?(asegVigenteBadge(aseg)):'info')}</div>
      ${asegRows}
    </div>

    <!-- SOAT histórico (InfoSiniestral) -->
    <div class="rcard wide">
      <div class="rc-head">${icoBox('<path d="M12 3 4 7v5c0 4 3 7 8 9 5-2 8-5 8-9V7l-8-4z"/><path d="M9 12l2 2 4-4"/>')}<h3>Historial de SOAT</h3>${badge(soatInfoArr.length?(asegVigenteBadge(soatInfoArr)):'info')}</div>
      ${soatInfoRows}
    </div>

    <!-- Siniestros (InfoSiniestral) -->
    <div class="rcard wide">
      <div class="rc-head">${icoBox('<path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>')}<h3>Siniestros</h3>${siniestros.length?'<span class="badge bad">Con siniestros</span>':badge('ok')}</div>
      ${siniestrosHTML}
    </div>

    <!-- Avalúo -->
    <div class="rcard wide">
      <div class="rc-head">${icoBox('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>')}<h3>Avalúo comercial${!gv&&fc?' (Fasecolda)':''}</h3></div>
      ${gv? `
        ${row('Valor guía', `<span class="rv big">${escHtml(gv.valor_guia)}</span>`)}
        ${row('Código', gv.codigo)}
      ` : fc ? `
        ${row('Valor comercial', `<span class="rv big">${money(fc.valorComercial)}</span>`)}
        ${row('Código Fasecolda', fc.codigo)}
        ${fichaCampos.length? `<div class="ficha" style="margin-top:12px">${fichaCampos.map(([k,val])=>`<div class="fc"><div class="v">${val}</div><div class="k">${k}</div></div>`).join('')}</div>`:''}
      ` : `<div class="empty-sec">Avalúo no disponible para esta consulta.</div>`}
    </div>

    <!-- Pico y placa (PlacApi) -->
    ${pp ? `
    <div class="rcard">
      <div class="rc-head">${icoBox('<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h4"/>')}<h3>Pico y placa · ${escHtml(pp.ciudad||'')}</h3></div>
      ${row('Hoy', pp.hoyAplica? `<span class="tag bad">Aplica restricción</span>`:`<span class="tag ok">Libre</span>`)}
      ${row('Mañana', pp.manianaAplica? `<span class="tag warn">Restringido</span>`:`<span class="tag ok">Libre</span>`)}
      ${row('Horario', pp.horarios)}
    </div>` : ''}

    <!-- Propietario / Licencia (PlacApi) -->
    ${lic ? `
    <div class="rcard" data-pii="propietario">
      <div class="rc-head">${icoBox('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>')}<h3>Propietario y licencia</h3>${badge(lic.driverStatus==='ACTIVO'?'ok':'info')}</div>
      ${row('Titular', lic.fullName)}
      ${row('Estado licencia', lic.driverStatus)}
      ${row('Multas conductor', lic.infractions?.tieneMultas==='NO'? '<span class="tag ok">No</span>':'<span class="tag warn">Sí</span>')}
    </div>` : ''}
  </div>

  <div class="report-foot">
    <span class="folio">Folio <b>${folio}</b> · Generado ${new Date().toLocaleString('es-CO')} · Fuentes: RUNT, SIMIT, Fasecolda y aseguradoras</span>
    <div class="rf-actions">
      <button class="btn-o" data-act="descargarPdf">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg>
        Descargar PDF
      </button>
      <button class="btn-o" data-act="compartirWhatsApp" style="color:#1BA551;border-color:#bfe6c9">
        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M17.5 14.4c-.3-.1-1.6-.8-1.9-.9-.2-.1-.4-.1-.6.1-.2.2-.6.9-.8 1.1-.1.2-.3.2-.5.1-1.4-.6-2.4-1.3-3.3-2.8-.1-.2-.1-.4.1-.6l.5-.6c.1-.2.1-.4 0-.5-.1-.2-.6-1.4-.8-1.9-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.5.1-.7.4-.2.2-.9.9-.9 2.2 0 1.3 1 2.6 1.1 2.8.1.2 1.9 3 4.7 4.1 2.3.9 2.3.6 2.7.5.4 0 1.3-.5 1.5-1.1.2-.5.2-1 .1-1.1-.1-.1-.2-.2-.4-.3z"/><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l4.9-1.4A10 10 0 1 0 12 2zm0 18.1a8.1 8.1 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.1 8.1 0 1 1 12 20.1z"/></svg>
        Enviar por WhatsApp
      </button>
      <button class="btn-o dark" data-act="irConsulta">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
        Nueva consulta
      </button>
    </div>
  </div>`;
}

/* Genera el PDF real del informe (librería cargada solo al usarla). */
let h2pPromise = null;
function cargarHtml2Pdf(){
  if(window.html2pdf) return Promise.resolve();
  if(h2pPromise) return h2pPromise;
  h2pPromise = new Promise((ok, fail)=>{
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js';
    s.onload = ok; s.onerror = ()=>{ h2pPromise = null; fail(new Error('No se pudo cargar el generador de PDF')); };
    document.head.appendChild(s);
  });
  return h2pPromise;
}
/* Copia del informe SIN datos personales del propietario: es la que se convierte en PDF
   (para descargar y para enviar por WhatsApp). En pantalla, la persona que consultó sí los ve. */
const CLAVE_PERSONAL = /nombre|name|document|c[eé]dula|identific|propiet|titular|tel[eé]fono|celular|direcci|correo|e-?mail|licencia|^asegurado$|p[oó]liza/i;
function copiaSinDatosPersonales(){
  const c = $('#informeBody').cloneNode(true);
  c.querySelectorAll('.report-foot').forEach(n => n.remove());
  // 1) Tarjeta del propietario/licencia: se quita completa y se deja un aviso.
  c.querySelectorAll('[data-pii]').forEach(n => {
    const a = document.createElement('div'); a.className = 'rcard';
    a.innerHTML = '<div class="rc-head"><h3>Propietario y licencia</h3></div><div class="note">Información omitida en este documento para proteger los datos personales del propietario (Ley 1581 de 2012).</div>';
    n.replaceWith(a);
  });
  // 2) Siniestros: se muestran campos genéricos del proveedor; se tapa cualquiera que parezca dato personal.
  c.querySelectorAll('[data-siniestro] .rrow').forEach(f => {
    if (CLAVE_PERSONAL.test((f.querySelector('.rk')?.textContent || '').trim())) f.querySelector('.rv').textContent = '(omitido)';
  });
  // 3) Correos electrónicos en cualquier texto.
  const w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) n.nodeValue = n.nodeValue.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '(correo omitido)');
  const nota = document.createElement('p');
  nota.style.cssText = 'font-size:11px;color:#5A6577;margin:14px 0 0';
  nota.textContent = 'Por protección de datos personales (Ley 1581 de 2012), este documento no incluye información del propietario.';
  c.appendChild(nota);
  return c;
}
async function descargarPdf(){
  if(!ultimoInforme) return;
  toast('Preparando el PDF…');
  try {
    const pdf = await generarPdfInforme(ultimoInforme.placa);
    const url = URL.createObjectURL(pdf);
    const a = document.createElement('a'); a.href = url; a.download = pdf.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 60000);
  } catch(e){ console.error(e); toast('No se pudo generar el PDF. Intenta de nuevo.'); }
}
async function generarPdfInforme(placa){
  await cargarHtml2Pdf();
  const el = copiaSinDatosPersonales();
  const lg = el.querySelector('.report-logo-print');
  if(lg){ lg.style.display='block'; lg.style.textAlign='center'; lg.style.margin='0 0 16px'; const im=lg.querySelector('img'); if(im){ im.style.height='90px'; im.style.width='auto'; } }
  const nombre = `VehiTrack-${String(placa||'informe').replace(/[^A-Za-z0-9_-]/g,'')}.pdf`;
  const blob = await window.html2pdf().set({
    margin: [10, 8, 10, 8],
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollY: 0 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'], avoid: ['.rcard'] },
  }).from(el).outputPdf('blob');
  return new File([blob], nombre, { type: 'application/pdf' });
}
async function compartirWhatsApp(){
  const r = ultimoInforme; if(!r) return;
  const riesgo = calcularRiesgo(r);
  const v = r.placapi?.vehicle?.data || r.infosiniestral?.vehiculo || {};
  const lvlTxt = {verde:'Riesgo bajo',amarillo:'Riesgo medio',rojo:'Riesgo alto'}[riesgo.nivel];
  const texto = `Informe VehiTrack — Placa ${r.placa}\n${[v.marca,v.linea||v.tipo,v.modelo].filter(Boolean).join(' ')}\nSemáforo: ${lvlTxt}\n\nGenera tu propio informe en https://vehitrack.app`;
  // ¿Este dispositivo puede compartir archivos directo a WhatsApp? (celulares sí; la mayoría de computadores no)
  let puedeArchivo = false;
  try { puedeArchivo = !!(navigator.canShare && navigator.canShare({ files:[new File(['x'],'a.pdf',{type:'application/pdf'})] })); } catch(_) {}
  // En computador abrimos WhatsApp ya (antes de esperar) para que el navegador no bloquee la ventana.
  const win = puedeArchivo ? null : window.open('', '_blank');
  toast('Preparando el PDF…');
  try {
    const pdf = await generarPdfInforme(r.placa);
    if(puedeArchivo){
      try { await navigator.share({ files:[pdf], text: texto, title: pdf.name }); }
      catch(e){ if(e && e.name !== 'AbortError') throw e; }
      return;
    }
    const url = URL.createObjectURL(pdf);
    const a = document.createElement('a'); a.href = url; a.download = pdf.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 60000);
    if(win) win.location.href = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    toast('PDF descargado: adjúntalo en la conversación de WhatsApp');
  } catch(e){
    if(win) win.close();
    console.error(e);
    toast('No se pudo generar el PDF. Intenta con "Descargar PDF".');
  }
}

/* ================================================================
   Flujo de consulta
   ================================================================ */
function mostrar(vista){ ['vConsulta','vLoading','vInforme','vHistorial'].forEach(id=>$('#'+id).classList.toggle('hidden', id!==vista)); }
function irConsulta(){ mostrar('vConsulta'); window.scrollTo({top:0,behavior:'smooth'}); }


/* ================================================================
   Mis consultas (solo las de la cuenta; la base de datos lo impone
   con una política de seguridad por fila: user_id = auth.uid())
   ================================================================ */
async function verHistorial(){
  if(!sb || !sesion){ abrirLogin(); return; }
  mostrar('vHistorial'); window.scrollTo({top:0,behavior:'smooth'});
  const body=$('#histBody'); body.innerHTML='<div class="hist-vacio">Cargando…</div>';
  try{
    const { data, error } = await sb.from('consultas')
      .select('id,placa,created_at,costo,info_err:payload->>infosiniestralError,pla_err:payload->>placapiError')
      .order('created_at',{ascending:false}).limit(100);
    if(error) throw error;
    if(!data || !data.length){ body.innerHTML='<div class="hist-vacio">Aún no has hecho consultas.</div>'; return; }
    body.innerHTML = '<div class="hist-list">' + data.map(c=>{
      const f = new Date(c.created_at).toLocaleString('es-CO',{ timeZone:'America/Bogota', dateStyle:'medium', timeStyle:'short' });
      const incompleto = c.info_err || c.pla_err;
      return `<div class="hist-item"><span class="pl">${escHtml(c.placa)}</span>
        <span class="meta">${escHtml(f)} · ${escHtml(money(c.costo))}</span>
        ${incompleto?'<span class="tag warn">Incompleto</span>':'<span class="tag">Completo</span>'}
        <button class="btn-o" data-hid="${escHtml(c.id)}">Ver informe</button></div>`;
    }).join('') + '</div>';
  }catch(e){
    console.error(e);
    body.innerHTML='<div class="hist-vacio">No pudimos cargar tus consultas. Intenta de nuevo.</div>';
  }
}
document.addEventListener('click', async e=>{
  const b = e.target.closest('[data-hid]'); if(!b) return;
  b.disabled = true;
  try{
    const { data, error } = await sb.from('consultas').select('placa,payload').eq('id', Number(b.dataset.hid)).maybeSingle();
    if(error || !data) throw error || new Error('no_encontrada');
    const p = data.payload || {};
    if(!('infosiniestral' in p) && !('placapi' in p)) { toast('Esta consulta es de un formato anterior y no se puede mostrar.'); b.disabled=false; return; }
    renderInforme(p);
    mostrar('vInforme');
    window.scrollTo({top:0,behavior:'smooth'});
  }catch(err){
    console.error(err); toast('No se pudo abrir el informe.');
  }
  b.disabled = false;
});

let consultando = false;
async function consultar(){
  if(consultando) return;
  const placa = $('#placa').value.trim().toUpperCase();
  const docType = $('#docType').value;
  const docNumber = $('#docNumber').value.trim();
  const primerApellido = $('#primerApellido').value.trim().toUpperCase();
  const ciudad = $('#ciudad').value.trim();
  const err = $('#formErr'); err.classList.add('hidden');

  if(!/^[A-Z0-9]{5,7}$/.test(placa)){ err.textContent='Escribe una placa válida (ej. ABC123).'; err.classList.remove('hidden'); return; }
  if(docNumber.length<5){ err.textContent='Escribe el documento del propietario. El RUNT lo exige para entregar la ficha.'; err.classList.remove('hidden'); return; }

  if(sb && !sesion){ abrirLogin(); return; }

  if(!sb){ // sin backend configurado: vista previa con datos de muestra
    mostrar('vLoading');
    const msgs = ['Consultando el RUNT…','Verificando SOAT y tecnomecánica…','Consultando aseguradoras y siniestros…','Revisando multas e impuestos…','Calculando semáforo de riesgo…'];
    let i=0; const t=setInterval(()=>{ $('#loadMsg').textContent = msgs[i++%msgs.length]; }, 380);
    await sleep(1400);
    clearInterval(t);
    renderInforme(SAMPLE);
    mostrar('vInforme');
    window.scrollTo({top:0,behavior:'smooth'});
    return;
  }

  consultando = true;
  mostrar('vLoading');
  const msgs = ['Consultando el RUNT…','Verificando SOAT y tecnomecánica…','Consultando aseguradoras y siniestros…','Revisando multas e impuestos…','Calculando semáforo de riesgo…'];
  let i=0; const t=setInterval(()=>{ $('#loadMsg').textContent = msgs[i++%msgs.length]; }, 380);

  try{
    const limite = new Promise((_, rej)=> setTimeout(()=> rej(new Error('La consulta tardó demasiado. Si se descontó saldo, aparecerá en tu historial; revisa y vuelve a intentar.')), 90000));
    const { data, error } = await Promise.race([ sb.functions.invoke('consulta', { body:{ placa, docType, docNumber, primerApellido, ciudad } }), limite ]);
    clearInterval(t);
    if(error){
      let pl=null; try{ pl=await error.context.json(); }catch(_){}
      if(pl?.error==='saldo_insuficiente'){ mostrar('vConsulta'); abrirRecarga(); return; }
      const AMIGABLES = { demasiadas_consultas:'Hiciste muchas consultas seguidas. Espera un minuto.', placa_invalida:'La placa no es válida.', documento_invalido:'El documento no es válido.', proveedor_no_disponible:'Las fuentes no respondieron. No se te cobró; intenta en unos minutos.', no_autenticado:'Tu sesión expiró. Inicia sesión de nuevo.' };
      throw new Error(AMIGABLES[pl?.error] || pl?.error || error.message);
    }
    if(data.saldo!=null){ saldo = data.saldo; pintarWallet(); }
    renderInforme(data.informe);
    mostrar('vInforme');
    window.scrollTo({top:0,behavior:'smooth'});
  }catch(e){
    clearInterval(t);
    mostrar('vConsulta');
    err.textContent = 'No pudimos completar la consulta: '+(e.message||'error')+'. Intenta de nuevo.'; err.classList.remove('hidden');
    console.error(e);
  }finally{ consultando = false; }
}

$('#placa').addEventListener('keydown', e=>{ if(e.key==='Enter') $('#docNumber').focus(); });
$('#ciudad').addEventListener('keydown', e=>{ if(e.key==='Enter') consultar(); });
$('#lgPass')?.addEventListener('keydown', e=>{ if(e.key==='Enter') login(); });

/* --- Arranque --- */
async function init(){
  pintarSesion();
  if(sb){
    const { data:{ session } } = await sb.auth.getSession();
    sesion = session; pintarSesion(); await cargarSaldo();
    // OJO: dentro de este callback NO se debe hacer 'await' a otras llamadas de Supabase (bloquea la sesión y
    // deja las consultas cargando para siempre). Por eso el saldo se pide fuera del callback, con setTimeout.
    sb.auth.onAuthStateChange((_e, s)=>{ sesion = s; pintarSesion(); if(s){ setTimeout(()=>{ cargarSaldo(); }, 0); } });

    // ¿Volvió del checkout de Wompi tras recargar? Confirmar y refrescar saldo.
    const params = new URLSearchParams(location.search);
    if(params.get('id')){
      toast('Confirmando tu pago…');
      history.replaceState({}, '', location.pathname);
      let tries=0; const iv=setInterval(async ()=>{ await cargarSaldo(); if(++tries>=5){ clearInterval(iv); toast('Saldo actualizado.'); } }, 2500);
    }
  }
}
init();
/* Manejador central de clics (reemplaza los onclick en línea, para poder quitar 'unsafe-inline' de la CSP) */
document.addEventListener('click', function(e){
  const el = e.target.closest('[data-act]'); if(!el) return;
  const f = window[el.dataset.act]; if(typeof f !== 'function') return;
  if(el.tagName === 'A') e.preventDefault();
  if(el.dataset.arg !== undefined) f(Number(el.dataset.arg)); else f();
});
