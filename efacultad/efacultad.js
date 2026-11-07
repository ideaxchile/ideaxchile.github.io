/* IDEAX eFacultad · aplicación de una sola página.
   Conversa con el servicio de Apps Script definido en config.js. */
(function () {
  'use strict';

  const API = window.EFACULTAD_API;
  const S = { token: null, usuario: null, ambiente: null, clienteGoogle: '', salir: null, datos: {} };
  const app = document.getElementById('app');

  /* =================== utilidades =================== */
  const h = s => String(s === undefined || s === null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const $ = (sel, raiz) => (raiz || document).querySelector(sel);
  const $$ = (sel, raiz) => Array.from((raiz || document).querySelectorAll(sel));
  const coma = n => String(n).replace('.', ',');
  const leer = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const escribir = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { } };
  function fecha(iso, larga) {
    if (!iso) return '';
    const d = new Date(iso);
    return larga ? d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
      : d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function fechaHora(iso) { if (!iso) return ''; const d = new Date(iso); return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }); }
  function haceCuanto(iso) {
    if (!iso) return '';
    const m = Math.round((Date.now() - new Date(iso)) / 60000);
    if (m < 1) return 'recién'; if (m < 60) return 'hace ' + m + ' min';
    const hh = Math.round(m / 60); if (hh < 24) return 'hace ' + hh + ' h';
    return fecha(iso);
  }
  function notaHtml(n, grande) {
    if (!n) return '<span class="etq">Sin nota</span>';
    if (grande) return '<div class="nota-grande' + (n.aprobado ? '' : ' reprobada') + '"><div><b>' + coma(n.pct) + '%</b></div><div><span>Escala de 1 a 7</span><br><b style="font-size:20px">' + coma(n.n7.toFixed(1)) + '</b></div><div><span>Escala de 1 a 10</span><br><b style="font-size:20px">' + coma(n.n10.toFixed(1)) + '</b></div><div><span class="etq ' + (n.aprobado ? 'verde' : 'rojo') + '">' + (n.aprobado ? 'Aprobado' : 'Reprobado') + '</span></div></div>';
    return '<span class="nota' + (n.aprobado ? '' : ' reprobada') + '"><span class="pct">' + coma(n.pct) + '%</span><small>' + coma(n.n7.toFixed(1)) + ' · ' + coma(n.n10.toFixed(1)) + '</small></span>';
  }
  function iniciales(nombre) { return String(nombre || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase(); }
  function avatar(nombre, foto, clase) { return foto ? '<img class="avatar ' + (clase || '') + '" src="' + h(foto) + '" alt="" referrerpolicy="no-referrer">' : '<span class="avatar ' + (clase || '') + '">' + h(iniciales(nombre)) + '</span>'; }
  function toast(msg, error) {
    const t = document.createElement('div'); t.className = 'toast' + (error ? ' error' : ''); t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), error ? 6000 : 3200);
  }
  function cargando(msg) { return '<div class="cargando">' + h(msg || 'Cargando') + '</div>'; }
  function vacio(titulo, texto) { return '<div class="vacio"><b>' + h(titulo) + '</b>' + h(texto || '') + '</div>'; }
  function etqEstado(e) {
    const m = { disponible: ['naranja', 'Disponible'], 'en curso': ['naranja', 'En curso'], enviada: ['azul', 'Enviada'], corregida: ['verde', 'Calificada'],
      devuelta: ['rojo', 'Devuelta'], bloqueada: ['', 'Bloqueada'], programada: ['', 'Próximamente'], congelada: ['amarillo', 'Congelada'],
      Enviada: ['azul', 'Por corregir'], Corregida: ['verde', 'Calificada'], Devuelta: ['rojo', 'Devuelta'], Borrador: ['', 'Borrador'],
      Pendiente: ['naranja', 'Pendiente'], Aprobada: ['verde', 'Aprobada'], Rechazada: ['rojo', 'Rechazada'], Activa: ['verde', 'Activa'],
      Congelada: ['amarillo', 'Congelada'], Retirada: ['', 'Retirada'], Finalizada: ['azul', 'Finalizada'], Anulada: ['rojo', 'Anulada'], 'No finalizada': ['rojo', 'No finalizada'] }[e];
    return m ? '<span class="etq ' + m[0] + '">' + m[1] + '</span>' : '<span class="etq">' + h(e) + '</span>';
  }
  function descargar(nombre, contenido, tipo) {
    const blob = contenido instanceof Blob ? contenido : new Blob([contenido], { type: tipo || 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  const libs = {};
  function cargarLib(nombre, url, global) {
    if (window[global]) return Promise.resolve(window[global]);
    if (!libs[nombre]) libs[nombre] = new Promise((ok, mal) => { const s = document.createElement('script'); s.src = url; s.onload = () => ok(window[global]); s.onerror = () => mal(new Error('No se pudo cargar ' + nombre)); document.head.appendChild(s); });
    return libs[nombre];
  }
  const XLSXlib = () => cargarLib('xlsx', 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js', 'XLSX');
  const ZIPlib = () => cargarLib('jszip', 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', 'JSZip');
  function leerArchivo(file, comoTexto) {
    return new Promise((ok, mal) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => mal(new Error('No pude leer el archivo.'));
      if (comoTexto === 'buffer') r.readAsArrayBuffer(file); else r.readAsDataURL(file); });
  }
  function modal(html, clase) {
    const v = document.createElement('div'); v.className = 'velo';
    v.innerHTML = '<div class="modal ' + (clase || '') + '" role="dialog" aria-modal="true">' + html + '</div>';
    document.body.appendChild(v);
    const cerrar = () => v.remove();
    v.addEventListener('click', e => { if (e.target === v || e.target.closest('[data-cerrar]')) cerrar(); });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { cerrar(); document.removeEventListener('keydown', esc); } });
    return { el: v.firstChild, cerrar };
  }
  function confirmar(texto, boton) {
    return new Promise(ok => {
      const m = modal('<h3>' + h(texto) + '</h3><div class="acciones" style="justify-content:flex-end;margin-top:16px"><button class="btn claro" data-cerrar>Cancelar</button><button class="btn naranja" data-si>' + h(boton || 'Confirmar') + '</button></div>');
      m.el.querySelector('[data-si]').onclick = () => { m.cerrar(); ok(true); };
      m.el.querySelectorAll('[data-cerrar]').forEach(b => b.addEventListener('click', () => ok(false)));
    });
  }

  /* =================== servicio =================== */
  async function api(accion, datos, opciones) {
    if (!API || /PEGA_AQUI/.test(API)) throw new Error('Falta configurar la dirección del servicio en config.js.');
    let r;
    try {
      const resp = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ accion, token: S.token }, datos || {})) });
      r = await resp.json();
    } catch (e) { throw new Error('No pudimos conectar con la eFacultad. Revisa tu conexión e inténtalo de nuevo.'); }
    if (!r.ok) {
      if (/sesión venció|Debes ingresar/.test(r.error) && !(opciones && opciones.silencio)) { cerrarLocal(); irA('#/ingresar'); }
      if (/cambiar tu clave temporal/.test(r.error)) { irA('#/clave'); }
      throw new Error(r.error);
    }
    return r.datos;
  }

  /* =================== sesión =================== */
  function guardarSesion(token, usuario) { S.token = token; S.usuario = usuario; escribir('ef_token', token); }
  function cerrarLocal() { S.token = null; S.usuario = null; S.datos = {}; escribir('ef_token', null); }
  function ambientesDe(u) {
    const p = u.permisos, a = [];
    if (u.roles.indexOf('estudiante') >= 0) a.push(['estudiante', 'Estudiante']);
    if (p.indexOf('corregir') >= 0 || p.indexOf('editar_contenido') >= 0) a.push(['docente', 'Docente']);
    if (['gestion_academica', 'gestion_administrativa', 'crm', 'certificados'].some(x => p.indexOf(x) >= 0)) a.push(['gestion', 'Gestión']);
    return a;
  }
  const tiene = p => S.usuario && S.usuario.permisos.indexOf(p) >= 0;

  /* =================== rutas =================== */
  const RUTAS = [
    [/^#\/verificar(?:\/(\w+))?$/, vVerificar, 'publica'],
    [/^#\/ingresar$/, vIngresar, 'publica'],
    [/^#\/clave$/, vCambiarClave, 'sola'],
    [/^#\/imprimir\/entrega\/([\w-]+)$/, vImprimirEntrega, 'sola'],
    [/^#\/imprimir\/portafolio\/([\w-]+)$/, vImprimirPortafolio, 'sola'],
    [/^#\/inicio$/, vInicio, 'estudiante'],
    [/^#\/curso\/([\w-]+)$/, vCurso, 'estudiante'],
    [/^#\/semana\/([\w-]+)\/([\w-]+)$/, vSemana, 'estudiante'],
    [/^#\/vista\/([\w-]+)$/, vVistaPrevia, 'docente'],
    [/^#\/notas$/, vNotas, 'estudiante'],
    [/^#\/documentos$/, vDocumentos, 'estudiante'],
    [/^#\/solicitudes$/, vSolicitudes, 'estudiante'],
    [/^#\/mensajes$/, vMensajes, null],
    [/^#\/hilo\/([\w-]+)$/, vHilo, null],
    [/^#\/perfil$/, vPerfil, null],
    [/^#\/bandeja$/, vBandeja, 'docente'],
    [/^#\/corregir\/([\w-]+)$/, vCorregir, 'docente'],
    [/^#\/libro(?:\/([\w-]+))?$/, vLibro, 'docente'],
    [/^#\/contenidos$/, vContenidos, 'docente'],
    [/^#\/programa\/([\w-]+)$/, vProgramaSemanas, 'docente'],
    [/^#\/editar\/([\w-]+)$/, vEditarSemana, 'docente'],
    [/^#\/gestion$/, vResumenGestion, 'gestion'],
    [/^#\/matriculas$/, vMatriculas, 'gestion'],
    [/^#\/cuentas$/, vCuentas, 'gestion'],
    [/^#\/solicitudes-gestion$/, vSolicitudesGestion, 'gestion'],
    [/^#\/programas$/, vContenidos, 'gestion'],
    [/^#\/crm$/, vCrm, 'gestion']
  ];
  const INICIO = { estudiante: '#/inicio', docente: '#/bandeja', gestion: '#/gestion' };

  function irA(hash) { if (location.hash === hash) router(); else location.hash = hash; }

  async function router() {
    if (S.salir) { const f = S.salir; S.salir = null; try { await f(); } catch (e) { } }
    const hash = location.hash || '#/';
    const ruta = RUTAS.find(r => r[0].test(hash));
    if (ruta && ruta[2] === 'publica' && !(ruta[1] === vIngresar && S.token)) { ruta[1].apply(null, hash.match(ruta[0]).slice(1)); return; }
    if (!S.token) { irA('#/ingresar'); return; }
    if (!S.usuario) {
      try { S.usuario = await api('perfil', {}, { silencio: true }); }
      catch (e) { cerrarLocal(); irA('#/ingresar'); return; }
    }
    if (S.usuario.claveTemporal && hash !== '#/clave') { irA('#/clave'); return; }
    const ambs = ambientesDe(S.usuario);
    if (!ambs.length) { pintarVacio('Tu cuenta no tiene un ambiente asignado', 'Escribe a contacto@ideax.cl para que revisemos tus permisos.'); return; }
    if (!ruta || hash === '#/' || ruta[1] === vIngresar) {
      const amb = leer('ef_ambiente');
      S.ambiente = ambs.find(a => a[0] === amb) ? amb : ambs[0][0];
      irA(INICIO[S.ambiente]); return;
    }
    if (ruta[2] && ruta[2] !== 'sola' && ambs.find(a => a[0] === ruta[2])) S.ambiente = ruta[2];
    if (!S.ambiente || !ambs.find(a => a[0] === S.ambiente)) S.ambiente = ambs[0][0];
    escribir('ef_ambiente', S.ambiente);
    if (ruta[2] === 'sola') { app.innerHTML = '<main id="vista"></main>'; }
    else pintarMarco(hash);
    window.scrollTo(0, 0);
    try { await ruta[1].apply(null, hash.match(ruta[0]).slice(1)); }
    catch (e) { const v = $('#vista'); if (v) v.innerHTML = '<div class="aviso error">' + h(e.message) + '</div>'; }
  }

  function navDe(amb) {
    if (amb === 'estudiante') return [['#/inicio', 'Inicio'], ['#/notas', 'Notas'], ['#/mensajes', 'Mensajes', 'msj'], ['#/documentos', 'Documentos'], ['#/solicitudes', 'Solicitudes']];
    if (amb === 'docente') return [['#/bandeja', 'Bandeja'], ['#/libro', 'Libro de notas'], ['#/contenidos', 'Contenidos'], ['#/mensajes', 'Mensajes']];
    const n = [['#/gestion', 'Resumen']];
    if (tiene('gestion_administrativa')) n.push(['#/matriculas', 'Matrículas'], ['#/cuentas', 'Cuentas']);
    if (tiene('gestion_administrativa') || tiene('certificados')) n.push(['#/solicitudes-gestion', 'Solicitudes']);
    if (tiene('gestion_academica')) n.push(['#/programas', 'Programas']);
    if (tiene('crm')) n.push(['#/crm', 'CRM']);
    n.push(['#/mensajes', 'Mensajes']);
    return n;
  }

  function pintarMarco(hash) {
    const u = S.usuario, ambs = ambientesDe(u);
    const nav = navDe(S.ambiente).map(n => '<a href="' + n[0] + '"' + (hash.indexOf(n[0]) === 0 || (n[0] === '#/inicio' && /^#\/(curso|semana)/.test(hash)) || (n[0] === '#/bandeja' && /^#\/corregir/.test(hash)) || (n[0] === '#/contenidos' && /^#\/(programa|editar)\//.test(hash) && S.ambiente === 'docente') || (n[0] === '#/programas' && /^#\/(programa|editar)\//.test(hash)) || (n[0] === '#/mensajes' && /^#\/hilo/.test(hash)) ? ' class="activo"' : '') + '>' + h(n[1]) + (n[2] ? '<span class="burbuja oculto" id="burbuja-msj"></span>' : '') + '</a>').join('');
    app.innerHTML = '<header class="barra no-imprimir"><a class="marca" href="' + INICIO[S.ambiente] + '"><img src="../img/logo-ideax-blanco.png" alt=""><span>IDEA<i>X</i></span><small>eFACULTAD</small></a>' +
      '<nav class="nav" aria-label="Secciones">' + nav + '</nav><span class="espacio"></span>' +
      (ambs.length > 1 ? '<div class="ambientes" role="tablist">' + ambs.map(a => '<button data-amb="' + a[0] + '" class="' + (a[0] === S.ambiente ? 'activo' : '') + '">' + a[1] + '</button>').join('') + '</div>' : '') +
      '<button class="usuario" id="btn-usuario" aria-label="Mi cuenta">' + avatar(u.nombre, u.foto) + '</button></header><main id="vista">' + cargando() + '</main>';
    $$('[data-amb]').forEach(b => b.onclick = () => { S.ambiente = b.dataset.amb; escribir('ef_ambiente', S.ambiente); irA(INICIO[S.ambiente]); });
    $('#btn-usuario').onclick = e => {
      e.stopPropagation();
      const viejo = $('.menu-usuario'); if (viejo) { viejo.remove(); return; }
      const m = document.createElement('div'); m.className = 'menu-usuario';
      m.innerHTML = '<div class="quien"><b>' + h(u.nombre) + '</b><span>' + h(u.correo) + '</span><br><span>' + h(u.roles.join(' · ')) + '</span></div>' +
        '<a href="#/perfil">Mi perfil y foto</a><a href="#/clave">Cambiar clave</a><a href="https://www.ideax.cl" target="_blank" rel="noopener">Ir a www.ideax.cl</a><button id="btn-salir">Cerrar sesión</button>';
      document.body.appendChild(m);
      m.querySelector('#btn-salir').onclick = async () => { try { await api('salir'); } catch (er) { } cerrarLocal(); if (window.google && google.accounts) google.accounts.id.disableAutoSelect(); irA('#/ingresar'); };
      setTimeout(() => document.addEventListener('click', function f() { m.remove(); document.removeEventListener('click', f); }), 0);
    };
  }
  function pintarVacio(t, x) { app.innerHTML = '<main>' + vacio(t, x) + '</main>'; }
  function vista(html) { const v = $('#vista'); if (v) v.innerHTML = html; return v; }
  function burbujaMensajes(n) { const b = $('#burbuja-msj'); if (b) { b.textContent = n; b.classList.toggle('oculto', !n); } }

  /* =================== ingreso =================== */
  async function vIngresar() {
    app.innerHTML = '<div class="ingreso"><section class="lado"><a class="marca" href="https://www.ideax.cl"><img src="../img/logo-ideax-blanco.png" alt=""><span>IDEA<i>X</i></span><small>eFACULTAD</small></a>' +
      '<div><h1>Tu facultad, donde estés.</h1><p>Estudia cada semana, entrega tus casos, revisa tus notas y conversa con tus docentes. Todo en un solo lugar.</p></div>' +
      '<div class="bandas"><i style="background:#0F2747;border:1px solid #3B5679"></i><i style="background:#1D4E89"></i><i style="background:#14947F"></i><i style="background:#6E3A9C"></i><i style="background:#F07C1B"></i></div></section>' +
      '<section class="form"><div class="caja"><h2>Ingresar</h2><p style="color:var(--gris)">Usa el mismo correo con que te inscribiste.</p>' +
      '<div id="msg-ingreso"></div><div id="boton-google"></div><div class="separador" id="sep-google">o con tu correo y clave</div>' +
      '<form id="f-ingreso"><label class="campo"><span>Correo</span><input type="email" name="correo" autocomplete="username" required></label>' +
      '<label class="campo"><span>Clave</span><input type="password" name="clave" autocomplete="current-password" required></label>' +
      '<button class="btn naranja" style="width:100%">Ingresar</button></form>' +
      '<p style="margin-top:14px;text-align:center"><button class="btn texto" id="btn-olvido">¿Olvidaste tu clave?</button></p>' +
      '<p style="margin-top:24px;font-size:13px;color:var(--gris);text-align:center"><a href="#/verificar">Verificar un certificado</a> · <a href="https://www.ideax.cl">www.ideax.cl</a></p></div></section></div>';
    const msg = (t, tipo) => { $('#msg-ingreso').innerHTML = t ? '<div class="aviso ' + (tipo || 'error') + '">' + h(t) + '</div>' : ''; };
    $('#f-ingreso').onsubmit = async e => {
      e.preventDefault(); const f = e.target, b = f.querySelector('button'); b.disabled = true; msg('');
      try { const r = await api('ingresarClave', { correo: f.correo.value, clave: f.clave.value }); guardarSesion(r.token, r.usuario); irA('#/'); }
      catch (er) { msg(er.message); b.disabled = false; }
    };
    $('#btn-olvido').onclick = () => {
      const m = modal('<div class="modal-cab"><h3>Recuperar tu clave</h3><button class="cerrar" data-cerrar>×</button></div><p>Te enviaremos una clave temporal a tu correo.</p>' +
        '<form><label class="campo"><span>Correo</span><input type="email" name="correo" required value="' + h($('#f-ingreso').correo.value) + '"></label><button class="btn naranja">Enviar clave temporal</button></form>');
      m.el.querySelector('form').onsubmit = async e => {
        e.preventDefault(); try { await api('recuperarClave', { correo: e.target.correo.value }); m.cerrar(); msg('Si el correo está registrado, te llegará una clave temporal en unos minutos. Revisa también tu carpeta de spam.', 'ok'); }
        catch (er) { toast(er.message, true); }
      };
    };
    try {
      if (!S.clienteGoogle) { const c = await api('config'); S.clienteGoogle = c.clienteGoogle; }
      if (!S.clienteGoogle) { $('#sep-google').classList.add('oculto'); return; }
      const iniciar = () => {
        google.accounts.id.initialize({ client_id: S.clienteGoogle, ux_mode: 'popup', auto_select: false,
          callback: async resp => { msg(''); try { const r = await api('ingresarGoogle', { credencial: resp.credential }); guardarSesion(r.token, r.usuario); irA('#/'); } catch (er) { msg(er.message); } } });
        google.accounts.id.renderButton($('#boton-google'), { theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', width: 320, locale: 'es' });
      };
      if (window.google && google.accounts) iniciar();
      else { let n = 0; const t = setInterval(() => { if (window.google && google.accounts) { clearInterval(t); iniciar(); } else if (++n > 40) { clearInterval(t); $('#sep-google').classList.add('oculto'); } }, 150); }
    } catch (e) { msg(e.message); $('#sep-google').classList.add('oculto'); }
  }

  function vCambiarClave() {
    const tempo = S.usuario && S.usuario.claveTemporal;
    vista('<div class="tarjeta" style="max-width:460px;margin:40px auto"><h2>' + (tempo ? 'Crea tu clave personal' : 'Cambiar clave') + '</h2>' +
      (tempo ? '<p>Estás usando una clave temporal. Elige una clave nueva para continuar.</p>' : '') +
      '<form id="f-clave">' + (tempo ? '' : '<label class="campo"><span>Clave actual</span><input type="password" name="actual" autocomplete="current-password"><small>Si siempre has entrado con Google, déjala en blanco.</small></label>') +
      '<label class="campo"><span>Clave nueva</span><input type="password" name="nueva" autocomplete="new-password" required minlength="8"><small>Al menos 8 caracteres, con letras y números.</small></label>' +
      '<label class="campo"><span>Repite la clave nueva</span><input type="password" name="repite" autocomplete="new-password" required></label>' +
      '<div class="acciones"><button class="btn naranja">Guardar clave</button>' + (tempo ? '' : '<a class="btn claro" href="#/">Volver</a>') + '</div></form></div>');
    $('#f-clave').onsubmit = async e => {
      e.preventDefault(); const f = e.target;
      if (f.nueva.value !== f.repite.value) { toast('Las claves no coinciden.', true); return; }
      try { await api('cambiarClave', { actual: f.actual ? f.actual.value : '', nueva: f.nueva.value }); S.usuario = await api('perfil'); toast('Tu clave quedó guardada.'); irA('#/'); }
      catch (er) { toast(er.message, true); }
    };
  }

  /* =================== verificación pública =================== */
  async function vVerificar(codigo) {
    app.innerHTML = '<header class="barra"><a class="marca" href="https://www.ideax.cl"><img src="../img/logo-ideax-blanco.png" alt=""><span>IDEA<i>X</i></span><small>VERIFICACIÓN</small></a></header>' +
      '<main><div class="tarjeta" style="max-width:620px;margin:20px auto"><h2>Verificar un documento de IDEAX</h2><p style="color:var(--gris)">Escribe el código de verificación o el folio que aparece en el documento.</p>' +
      '<form id="f-ver" class="acciones"><input type="text" name="codigo" value="' + h(codigo || '') + '" placeholder="Ej. 7F3A9C21B0" style="flex:1;text-transform:uppercase" required><button class="btn naranja">Verificar</button></form><div id="res-ver" style="margin-top:18px"></div></div></main>';
    const verificar = async c => {
      const out = $('#res-ver'); out.innerHTML = cargando('Verificando');
      try {
        const r = await api('verificarCertificado', { codigo: c });
        if (!r.valido) { out.innerHTML = '<div class="aviso error"><b>No encontramos un documento con ese código.</b> Revisa que esté bien escrito.</div>'; return; }
        out.innerHTML = '<div class="aviso ok"><b>Documento auténtico emitido por IDEAX.</b></div><table class="tabla">' +
          [['Tipo', r.tipo], ['Folio', r.folio], ['Nombre', r.nombre], r.documento ? ['Documento', r.documento] : null, ['Programa', r.programa], r.horas ? ['Horas', r.horas] : null,
            ['Emitido', fecha(r.emitido)], r.vigenteHasta ? ['Matrícula vigente hasta', fecha(r.vigenteHasta)] : null,
            r.clase === 'Constancia' ? ['Situación actual', r.matriculaVigente ? 'Estudiante regular vigente' : 'La matrícula ya no está vigente'] : null,
            r.nota ? ['Nota final a la fecha', coma(r.nota.pct) + '%'] : null].filter(Boolean).map(x => '<tr><td style="color:var(--gris);width:40%">' + h(x[0]) + '</td><td><b>' + h(x[1]) + '</b></td></tr>').join('') + '</table>';
      } catch (e) { out.innerHTML = '<div class="aviso error">' + h(e.message) + '</div>'; }
    };
    $('#f-ver').onsubmit = e => { e.preventDefault(); verificar(e.target.codigo.value.trim()); };
    if (codigo) verificar(codigo);
  }

  /* =================== ESTUDIANTE =================== */
  async function vInicio() {
    const d = await api('panel');
    burbujaMensajes(d.noLeidos);
    const u = S.usuario;
    const mats = d.matriculas;
    const contenedores = mats.filter(m => m.contenedor);
    const cursos = mats.filter(m => !m.contenedor);
    const tarjeta = m => {
      const p = m.programa || {}; const pct = m.semanas ? Math.round(m.enviadas / m.semanas * 100) : 0;
      return '<article class="prog" style="--c:' + h(p.color) + '"><div class="franja"></div><div class="cuerpo"><div class="tipo">' + h({ gratuito: 'Curso gratuito', ejecutivo: 'Curso ejecutivo', diplomado: 'Diplomado', paper: 'Paper', emprendedores: 'Emprendedores' }[p.tipo] || p.tipo) + '</div>' +
        '<h3>' + h(p.nombre) + '</h3><div style="font-size:13px;color:var(--gris)">' + (m.inicio ? 'Inicio ' + fecha(m.inicio) : '') + (m.termino ? ' · Plazo hasta ' + fecha(m.termino) : '') + '</div>' +
        '<div class="barra-avance"><i style="width:' + pct + '%"></i></div><div style="font-size:12px;color:var(--gris)">' + m.enviadas + ' de ' + m.semanas + ' semanas enviadas</div>' +
        (m.actual ? '<div class="actual"><b>Semana ' + m.actual.n + ':</b> ' + h(m.actual.tema) + '</div>' : m.proxima ? '<div class="actual" style="background:var(--papel);border-color:var(--linea)">' + h(m.proxima.mensaje) + '</div>' : '') +
        '</div><div class="pie">' + (m.final ? notaHtml(m.final) : etqEstado(m.estado)) +
        '<div class="acciones">' + (m.actual ? '<a class="btn naranja chico" href="#/semana/' + m.id + '/' + m.actual.id + '">Ir a mi semana</a>' : '') + '<a class="btn claro chico" href="#/curso/' + m.id + '">Ver programa</a></div></div></article>';
    };
    vista('<div class="encabezado-vista"><div><h1>Hola, ' + h(u.nombres) + '</h1><p>' + (cursos.some(m => m.actual) ? 'Tienes semanas disponibles. ¡A trabajar!' : 'Aquí están tus programas.') + '</p></div>' +
      '<div class="acciones"><a class="btn claro" href="#/mensajes">Escribir a IDEAX</a></div></div>' +
      (contenedores.length ? contenedores.map(c => '<div class="aviso info">Estás inscrito en el <b>' + h(c.programa.nombre) + '</b>. Sus diplomados, la Metodología y el paper aparecen abajo como programas separados, cada uno con su calendario.</div>').join('') : '') +
      (cursos.length ? '<div class="rejilla r2">' + cursos.map(tarjeta).join('') + '</div>' : vacio('Aún no tienes programas en la eFacultad', 'Cuando se confirme tu inscripción aparecerán aquí.')));
  }

  async function vCurso(mat) {
    const d = await api('curso', { matricula: mat });
    const p = d.programa;
    let html = '<div class="miga"><a href="#/inicio">Inicio</a> › ' + h(p.nombre) + '</div><div class="encabezado-vista"><div><h1>' + h(p.nombre) + '</h1><p>' +
      (d.matricula.inicio ? 'Inicio ' + fecha(d.matricula.inicio) : '') + (d.matricula.termino ? ' · Plazo hasta ' + fecha(d.matricula.termino) : '') + ' · ' + p.horas + ' horas</p></div>' +
      '<div class="acciones">' + (d.notas.final ? notaHtml(d.notas.final) : '') + '<a class="btn claro chico" href="#/imprimir/portafolio/' + mat + '" target="_blank">Portafolio (PDF)</a></div></div>';
    if (/congel/i.test(d.matricula.estado)) html += '<div class="aviso alerta">Tu matrícula está congelada. Puedes consultar lo que ya hiciste, pero no hacer entregas.</div>';
    let materia = null;
    html += '<div class="semanas">';
    d.calendario.forEach(s => {
      if (s.materia_n !== materia && d.calendario.some(x => x.materia_n !== s.materia_n)) { materia = s.materia_n; html += '<div class="materia-tit">Materia ' + s.materia_n + ' · ' + h(s.materia) + '</div>'; }
      const abierta = /disponible|en curso|devuelta/.test(s.estado), hecha = /enviada|corregida/.test(s.estado), cerrada = /bloqueada|programada|congelada/.test(s.estado);
      const inner = '<span class="n">' + s.n + '</span><span class="t"><b>' + h(s.tema) + '</b><small>' + (cerrada ? h(s.mensaje) : s.estado === 'corregida' ? 'Calificada' : s.estado === 'enviada' ? 'Enviada, en revisión' : 'Abierta desde el ' + fecha(s.abre, true)) + '</small></span>' +
        (s.nota ? notaHtml(s.nota) : etqEstado(s.estado));
      html += cerrada ? '<div class="sem cerrada">' + inner + '</div>' : '<a class="sem ' + (abierta ? 'abierta' : hecha ? 'hecha' : '') + '" href="#/semana/' + mat + '/' + s.id + '">' + inner + '</a>';
    });
    vista(html + '</div>');
  }

  const ICONOS = { cuaderno: ['📘', 'Cuaderno de estudio', 'Conceptos y herramientas'], caso: ['🗂️', 'Caso de la semana', 'Lo que debes resolver'], herramienta: ['🧰', 'Herramienta', 'Plantilla o planilla'], lectura: ['📄', 'Lectura complementaria', 'Opcional'] };

  function htmlRubrica(rub, puntajes, editable) {
    const niveles = [['destacado', 'Destacado'], ['logrado', 'Logrado'], ['en_desarrollo', 'En desarrollo'], ['insuficiente', 'Insuficiente']];
    return '<div class="tabla-cont"><table class="rubrica"><thead><tr><th>Criterio</th>' + niveles.map(n => '<th>' + n[1] + (rub.niveles ? ' <small style="font-weight:400;opacity:.8">' + rub.niveles[n[0]] + '%</small>' : '') + '</th>').join('') + (puntajes || editable ? '<th style="width:90px">%</th>' : '') + '</tr></thead><tbody>' +
      rub.criterios.map(c => {
        const v = puntajes ? puntajes[c.id] : undefined;
        const elegido = v !== undefined && v !== '' ? niveles.map(n => n[0]).reduce((best, k) => Math.abs(rub.niveles[k] - v) < Math.abs(rub.niveles[best] - v) ? k : best, 'destacado') : null;
        return '<tr><td>' + h(c.criterio) + '<span class="peso">' + c.peso + '% de la nota</span></td>' + niveles.map(n => '<td class="' + (editable ? 'nivel ' : '') + (elegido === n[0] ? 'elegido' : '') + '" data-crit="' + h(c.id) + '" data-nivel="' + n[0] + '">' + h(c[n[0]]) + '</td>').join('') +
          (editable ? '<td><input type="number" min="0" max="100" step="1" data-pct="' + h(c.id) + '" value="' + (v !== undefined ? h(v) : '') + '" style="width:70px;padding:6px"></td>' : puntajes ? '<td class="num"><b>' + (v !== undefined ? coma(v) + '%' : '') + '</b></td>' : '') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  function htmlRubricaCompacta(rub, puntajes) {
    const niveles = [['destacado', 'Destacado'], ['logrado', 'Logrado'], ['en_desarrollo', 'En desarrollo'], ['insuficiente', 'Insuficiente']];
    return rub.criterios.map(c => {
      const v = puntajes[c.id];
      return '<div class="bloque-editor" style="background:#fff"><div class="cab"><b>' + h(c.criterio) + ' <small style="font-weight:400;color:var(--gris)">' + c.peso + '%</small></b>' +
        '<label style="display:flex;align-items:center;gap:6px;font-size:13px">Logro <input type="number" min="0" max="100" step="1" data-pct="' + h(c.id) + '" value="' + (v !== undefined ? h(v) : '') + '" style="width:72px;padding:6px"> %</label></div>' +
        '<div class="acciones" style="gap:6px">' + niveles.map(n => '<button type="button" class="btn chico claro nivel-btn" data-crit="' + h(c.id) + '" data-nivel="' + n[0] + '" title="' + h(c[n[0]]) + '">' + n[1] + ' · ' + rub.niveles[n[0]] + '%</button>').join('') + '</div>' +
        '<div class="desc-nivel" data-desc="' + h(c.id) + '" style="font-size:13px;color:var(--gris);margin-top:8px"></div></div>';
    }).join('');
  }

  function contarPalabras(t) { return String(t || '').trim().split(/\s+/).filter(Boolean).length; }

  function htmlAdjuntos(lista, editable) {
    if (!lista || !lista.length) return '';
    return '<div class="adjuntos">' + lista.map(a => '<div class="adjunto">' + (a.miniatura ? '<img src="' + h(a.miniatura) + '" alt="" referrerpolicy="no-referrer">' : '<span style="font-size:20px">📎</span>') +
      '<a href="' + h(a.url) + '" target="_blank" rel="noopener" title="' + h(a.nombre) + '">' + h(a.nombre) + '</a><small style="color:var(--gris)">' + a.kb + ' KB</small>' +
      (editable ? '<button data-quitar="' + h(a.id) + '" title="Quitar">×</button>' : '') + '</div>').join('') + '</div>';
  }

  async function vSemana(mat, sem) {
    const d = await api('semana', { matricula: mat, semana: sem });
    pintarSemana(d, mat);
  }
  async function vVistaPrevia(sem) {
    const d = await api('semana', { semana: sem });
    pintarSemana(d, null);
  }

  function pintarSemana(d, mat) {
    const s = d.semana, p = d.programa, e = d.entrega;
    const editable = !!mat && !d.vistaPrevia && !d.soloLectura && (!e || /Borrador|Devuelta/.test(e.estado));
    const contenido = Object.assign({}, e ? e.contenido : {});
    const claveLocal = 'ef_borrador_' + (mat || '') + '_' + s.id;
    if (editable) {
      const local = JSON.parse(leer(claveLocal) || 'null');
      if (local && (!e || !e.guardado || local.t > new Date(e.guardado).getTime())) Object.assign(contenido, local.c);
    }
    const rec = Object.keys(ICONOS).map(k => {
      const url = s.recursos[k], i = ICONOS[k];
      if (!url && k === 'lectura') return '';
      return url ? '<a class="recurso" href="' + h(url) + '" target="_blank" rel="noopener"><span class="ico">' + i[0] + '</span><span><b>' + i[1] + '</b><small>' + i[2] + '</small></span></a>'
        : '<div class="recurso pendiente"><span class="ico">' + i[0] + '</span><span><b>' + i[1] + '</b><small>Disponible pronto</small></span></div>';
    }).join('');
    const pest = [['ficha', 'Mi entrega'], ['rubrica', 'Rúbrica'], d.autoevaluacion.preguntas.length ? ['auto', 'Autoevaluación'] : null].filter(Boolean);
    let html = '<div class="miga no-imprimir">' + (mat ? '<a href="#/inicio">Inicio</a> › <a href="#/curso/' + mat + '">' + h(p.nombre) + '</a>' : '<a href="#/programa/' + p.cod + '">' + h(p.nombre) + '</a> › Vista previa') + ' › Semana ' + s.n + '</div>' +
      '<div class="semana-cab" style="--c:' + h(p.color) + '"><div class="sup">' + (s.materia && s.materia !== p.nombre ? 'Materia ' + s.materia_n + ' · ' + h(s.materia) + ' · ' : '') + 'Semana ' + s.n + '</div><h1>' + h(s.tema) + '</h1>' +
      (s.descripcion ? '<p>' + h(s.descripcion) + '</p>' : '') + (s.entrega ? '<p style="margin-top:8px"><b style="color:#F8B57A">Entrega:</b> ' + h(s.entrega) + '</p>' : '') + '</div>' +
      (d.vistaPrevia ? '<div class="aviso info">Vista previa del docente: así ven esta semana los estudiantes. No se puede escribir.</div>' : '') +
      (!s.materialListo && !d.vistaPrevia ? '<div class="aviso alerta">El material de esta semana se está terminando de cargar. Te avisaremos apenas esté completo.</div>' : '') +
      '<div class="recursos">' + rec + '</div>' +
      '<div class="pestanas">' + pest.map((x, i) => '<button data-pest="' + x[0] + '" class="' + (i === 0 ? 'activo' : '') + '">' + x[1] + '</button>').join('') + '</div>';

    // ---- ficha
    let ficha = '';
    if (e && e.estado === 'Corregida') ficha += '<h3>Tu calificación</h3>' + notaHtml(e.nota, true) + (e.retro ? '<h4>Retroalimentación de tu docente</h4><div class="retro" style="margin-bottom:16px">' + h(e.retro) + '</div>' : '');
    if (e && e.estado === 'Devuelta') ficha += '<div class="aviso error"><b>Tu docente te devolvió esta entrega para corregirla.</b><div style="white-space:pre-wrap;margin-top:6px">' + h(e.retro) + '</div></div>';
    if (editable) ficha += '<div class="ficha-estado"><span class="guardado" id="estado-guardado">' + (e && e.guardado ? 'Guardado ' + haceCuanto(e.guardado) : 'Se guarda automáticamente mientras escribes') + '</span>' +
      '<div class="acciones"><button class="btn claro chico" id="btn-guardar">Guardar ahora</button><button class="btn naranja chico" id="btn-enviar">Enviar entrega definitiva</button></div></div>';
    else if (e && /Enviada|Corregida/.test(e.estado)) ficha += '<div class="ficha-estado"><span>' + etqEstado(e.estado) + ' Enviada el ' + fechaHora(e.enviada) + '</span><a class="btn claro chico" href="#/imprimir/entrega/' + e.id + '" target="_blank">Descargar PDF</a></div>';
    else if (d.soloLectura && mat) ficha += '<div class="aviso alerta">El plazo de tu programa terminó. Puedes solicitar una prórroga en Solicitudes.</div>';
    ficha += d.ficha.casillas.map((c, i) => {
      const val = contenido[c.id] || '';
      return '<section class="casilla" data-casilla="' + h(c.id) + '"><h3><em>' + (i + 1) + '</em>' + h(c.titulo) + '</h3>' + (c.instruccion ? '<div class="instr">' + h(c.instruccion) + '</div>' : '') +
        '<div class="ayudas">' + (c.explicacion ? '<button class="ayuda-btn" data-ayuda="explicacion">Explicación</button>' : '') + (c.ejemplo ? '<button class="ayuda-btn" data-ayuda="ejemplo">Ejemplo</button>' : '') + (c.pauta ? '<button class="ayuda-btn" data-ayuda="pauta">Qué se evalúa</button>' : '') + '</div>' +
        (c.explicacion ? '<div class="ayuda explicacion oculto">' + h(c.explicacion) + '</div>' : '') + (c.ejemplo ? '<div class="ayuda ejemplo oculto">' + h(c.ejemplo) + '</div>' : '') + (c.pauta ? '<div class="ayuda pauta oculto">' + h(c.pauta) + '</div>' : '') +
        (editable ? '<textarea data-id="' + h(c.id) + '" rows="' + (c.tipo === 'corto' ? 2 : 7) + '" placeholder="Escribe aquí">' + h(val) + '</textarea><div class="contador" data-cont="' + h(c.id) + '" data-max="' + (c.palabras_max || 0) + '"></div>'
          : '<div class="solo-lectura">' + (val ? h(val) : '<span style="color:var(--gris2)">Sin respuesta</span>') + '</div>') + '</section>';
    }).join('');
    ficha += '<section class="casilla"><h3>Archivos adjuntos <small style="font-weight:400;color:var(--gris);font-size:13px">opcional · hasta 5 archivos de 10 MB</small></h3><p style="color:var(--gris);font-size:14px">Planillas de cálculo, fotografías, PDF u otros respaldos de tu entrega.</p><div id="lista-adjuntos">' + htmlAdjuntos(e ? e.adjuntos : [], editable) + '</div>' +
      (editable ? '<label class="btn claro chico" style="margin-top:10px">Adjuntar archivo<input type="file" id="in-adjunto" class="sr" accept="image/*,.pdf,.xlsx,.xls,.csv,.docx,.pptx"></label> <span id="subiendo" style="font-size:13px;color:var(--gris)"></span>' : '') + '</section>';

    // ---- autoevaluación
    const auto = d.autoevaluacion;
    let autoHtml = '<p>Comprueba que entendiste los conceptos de la semana antes de resolver el caso. No lleva nota y puedes repetirla.</p><form id="f-auto">' +
      auto.preguntas.map((q, i) => '<div class="tarjeta plana"><b>' + (i + 1) + '. ' + h(q.pregunta) + '</b><div style="margin-top:8px">' + q.opciones.map((o, j) => '<label class="check" style="margin:6px 0"><input type="radio" name="q' + i + '" value="' + (j + 1) + '"> ' + h(o) + '</label>').join('') + '</div><div class="res-q" data-q="' + i + '"></div></div>').join('') +
      '<button class="btn naranja">Revisar mis respuestas</button></form>' + (auto.intento ? '<p style="margin-top:10px;color:var(--gris);font-size:13px">Último intento: ' + auto.intento.aciertos + ' de ' + auto.intento.total + ' (' + fechaHora(auto.intento.fecha) + ').</p>' : '');

    html += '<div data-panel="ficha">' + ficha + '</div><div data-panel="rubrica" class="oculto"><p>Así se evaluará tu entrega. Cada criterio pesa lo que indica y la nota final es el promedio ponderado, en porcentaje; se aprueba con 60%.</p>' +
      htmlRubrica(d.rubrica, e && e.puntajes) + '</div><div data-panel="auto" class="oculto">' + autoHtml + '</div>';
    vista(html);

    $$('[data-pest]').forEach(b => b.onclick = () => { $$('[data-pest]').forEach(x => x.classList.toggle('activo', x === b)); $$('[data-panel]').forEach(p => p.classList.toggle('oculto', p.dataset.panel !== b.dataset.pest)); });
    $$('.ayuda-btn').forEach(b => b.onclick = () => { const caja = b.closest('.casilla').querySelector('.ayuda.' + b.dataset.ayuda); caja.classList.toggle('oculto'); b.classList.toggle('activo'); });

    if (auto.preguntas.length) $('#f-auto').onsubmit = async ev => {
      ev.preventDefault();
      const resp = auto.preguntas.map((q, i) => { const x = ev.target.querySelector('input[name=q' + i + ']:checked'); return x ? Number(x.value) : null; });
      if (resp.some(x => x === null)) { toast('Responde todas las preguntas.', true); return; }
      try {
        const r = await api('autoevaluar', { semana: s.id, respuestas: resp });
        r.detalle.forEach((x, i) => { $('.res-q[data-q="' + i + '"]').innerHTML = '<div class="aviso ' + (x.ok ? 'ok' : 'error') + '" style="margin:10px 0 0">' + (x.ok ? '¡Correcto!' : 'La respuesta correcta es la ' + x.correcta + '.') + (x.explicacion ? ' ' + h(x.explicacion) : '') + '</div>'; });
        toast('Obtuviste ' + r.aciertos + ' de ' + r.total + '.');
      } catch (er) { toast(er.message, true); }
    };

    if (!editable) return;
    // ---- guardado automático
    const estado = $('#estado-guardado');
    let pendiente = false, temporizador = null, guardando = null;
    const marcar = (t, clase) => { estado.textContent = t; estado.className = 'guardado ' + (clase || ''); };
    const recolectar = () => { $$('textarea[data-id]').forEach(t => contenido[t.dataset.id] = t.value); return contenido; };
    const contar = t => {
      const c = $('[data-cont="' + t.dataset.id + '"]'), max = Number(c.dataset.max), n = contarPalabras(t.value);
      c.textContent = n + ' palabra' + (n === 1 ? '' : 's') + (max ? ' de ' + max + ' sugeridas' : '');
      c.classList.toggle('excede', !!max && n > max);
      t.style.height = 'auto'; t.style.height = Math.min(Math.max(t.scrollHeight + 4, 150), 900) + 'px';
    };
    const guardar = async () => {
      clearTimeout(temporizador);
      if (!pendiente) return;
      if (guardando) await guardando;
      pendiente = false; marcar('Guardando…', 'pendiente');
      const c = recolectar();
      guardando = api('guardarEntrega', { matricula: mat, semana: s.id, contenido: c })
        .then(r => { marcar('Guardado ' + new Date(r.guardado).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })); escribir(claveLocal, null); })
        .catch(er => { pendiente = true; marcar('No se pudo guardar: ' + er.message + ' Tu texto queda guardado en este equipo.', 'error'); })
        .finally(() => { guardando = null; });
      return guardando;
    };
    $$('textarea[data-id]').forEach(t => {
      contar(t);
      t.addEventListener('input', () => {
        contar(t); pendiente = true; marcar('Cambios sin guardar', 'pendiente');
        escribir(claveLocal, JSON.stringify({ t: Date.now(), c: recolectar() }));
        clearTimeout(temporizador); temporizador = setTimeout(guardar, 2500);
      });
    });
    if (leer(claveLocal)) { pendiente = true; marcar('Recuperamos texto guardado en este equipo; se sincronizará en un momento', 'pendiente'); temporizador = setTimeout(guardar, 1500); }
    S.salir = guardar;
    window.onbeforeunload = () => pendiente ? 'Tienes cambios sin guardar.' : undefined;
    $('#btn-guardar').onclick = () => { pendiente = true; guardar(); };
    $('#btn-enviar').onclick = async () => {
      recolectar();
      const vacias = d.ficha.casillas.filter(c => !String(contenido[c.id] || '').trim());
      if (vacias.length) { toast('Completa todas las casillas antes de enviar. Falta: ' + vacias.map(c => c.titulo).join(', ') + '.', true); return; }
      if (!await confirmar('¿Enviar tu entrega definitiva? Después no podrás modificarla.', 'Sí, enviar')) return;
      try {
        pendiente = true; await guardar();
        await api('enviarEntrega', { matricula: mat, semana: s.id });
        escribir(claveLocal, null); window.onbeforeunload = null; S.salir = null;
        toast('¡Entrega enviada! Te llegará una confirmación por correo.');
        vSemana(mat, s.id);
      } catch (er) { toast(er.message, true); }
    };
    // ---- adjuntos
    const listaAdj = $('#lista-adjuntos');
    const enlazarQuitar = () => $$('[data-quitar]', listaAdj).forEach(b => b.onclick = async () => {
      if (!await confirmar('¿Quitar este archivo de tu entrega?', 'Quitar')) return;
      try { const r = await api('quitarAdjunto', { matricula: mat, semana: s.id, id: b.dataset.quitar }); listaAdj.innerHTML = htmlAdjuntos(r.adjuntos, true); enlazarQuitar(); } catch (er) { toast(er.message, true); }
    });
    enlazarQuitar();
    $('#in-adjunto').onchange = async ev => {
      const f = ev.target.files[0]; ev.target.value = ''; if (!f) return;
      if (f.size > 10 * 1024 * 1024) { toast('El archivo supera los 10 MB.', true); return; }
      $('#subiendo').textContent = 'Subiendo ' + f.name + '…';
      try {
        let datos = await leerArchivo(f), tipo = f.type || 'application/octet-stream';
        if (/^image\/(jpeg|png|webp)$/.test(tipo) && f.size > 1.5 * 1024 * 1024) { datos = await reducirImagen(datos, 1800); tipo = 'image/jpeg'; }
        const r = await api('subirAdjunto', { matricula: mat, semana: s.id, nombre: f.name, tipo, datos });
        listaAdj.innerHTML = htmlAdjuntos(r.adjuntos, true); enlazarQuitar(); toast('Archivo adjuntado.');
      } catch (er) { toast(er.message, true); }
      $('#subiendo').textContent = '';
    };
  }

  function reducirImagen(dataUrl, max, cuadrada) {
    return new Promise((ok, mal) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, hh = img.height, sx = 0, sy = 0, sw = w, sh = hh;
        if (cuadrada) { const m = Math.min(w, hh); sx = (w - m) / 2; sy = (hh - m) / 2; sw = sh = m; w = hh = Math.min(m, max); }
        else { const k = Math.min(1, max / Math.max(w, hh)); w = Math.round(w * k); hh = Math.round(hh * k); }
        const c = document.createElement('canvas'); c.width = w; c.height = hh;
        c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, w, hh);
        ok(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => mal(new Error('No pude leer la imagen.'));
      img.src = dataUrl;
    });
  }

  async function vNotas() {
    const d = await api('notas');
    if (!d.length) { vista('<h1>Notas</h1>' + vacio('Aún no tienes notas', 'Aparecerán aquí cuando tu docente califique tus entregas.')); return; }
    vista('<div class="encabezado-vista"><div><h1>Mis notas</h1><p>En porcentaje de logro, con sus equivalencias en las escalas de 1 a 7 y de 1 a 10. Se aprueba con 60%.</p></div></div>' + d.map(x => {
      const r = x.resumen;
      return '<section class="tarjeta"><div class="encabezado-vista" style="margin-bottom:10px"><div><h2 style="margin:0">' + h(x.programa.nombre) + '</h2><p>' + r.corregidas + ' de ' + r.semanas + ' semanas calificadas</p></div>' +
        '<div class="acciones">' + (r.final ? notaHtml(r.final) : '') + '<a class="btn claro chico" href="#/imprimir/portafolio/' + x.matricula + '" target="_blank">Descargar portafolio</a></div></div>' +
        (r.materias.length > 1 ? '<div class="tabla-cont" style="margin-bottom:12px;box-shadow:none;border:1px solid var(--linea)"><table class="tabla"><thead><tr><th>Materia</th><th>Calificadas</th><th class="num">Nota</th></tr></thead><tbody>' +
          r.materias.map(m => '<tr><td>' + m.n + '. ' + h(m.nombre) + '</td><td>' + m.corregidas + ' de ' + m.semanas + '</td><td class="num">' + notaHtml(m.nota) + '</td></tr>').join('') + '</tbody></table></div>' : '') +
        '<div class="tabla-cont" style="box-shadow:none;border:1px solid var(--linea)"><table class="tabla"><thead><tr><th>Semana</th><th>Tema</th><th>Estado</th><th class="num">Nota</th></tr></thead><tbody>' +
        x.semanas.map(s => '<tr class="' + (/corregida|enviada|disponible|en curso|devuelta/.test(s.estado) ? 'clic' : '') + '" data-ir="#/semana/' + x.matricula + '/' + s.id + '"><td>' + s.n + '</td><td>' + h(s.tema) + '</td><td>' + etqEstado(s.estado) + '</td><td class="num">' + (s.nota ? notaHtml(s.nota) : '') + '</td></tr>').join('') +
        '</tbody></table></div></section>';
    }).join(''));
    $$('tr.clic').forEach(tr => tr.onclick = () => irA(tr.dataset.ir));
  }

  async function vDocumentos() {
    const [docs, panel] = await Promise.all([api('misDocumentos'), api('panel')]);
    const vigentes = panel.matriculas.filter(m => !m.contenedor && m.vigente);
    const conNotas = panel.matriculas.filter(m => !m.contenedor);
    vista('<h1>Mis documentos</h1>' +
      '<div class="rejilla r2"><section class="tarjeta"><h3>Certificado de alumno regular</h3><p style="color:var(--gris)">Acredita que eres estudiante vigente. Se genera al instante, con folio y código de verificación, y te llega también por correo.</p>' +
      (vigentes.length ? '<div class="acciones"><select id="sel-ar" style="flex:1">' + vigentes.map(m => '<option value="' + m.id + '">' + h(m.programa.nombre) + '</option>').join('') + '</select><button class="btn naranja" id="btn-ar">Generar</button></div>'
        : '<div class="aviso info" style="margin:0">Necesitas una matrícula activa y vigente para generarlo.</div>') + '</section>' +
      '<section class="tarjeta"><h3>Portafolio de entregas</h3><p style="color:var(--gris)">Todas tus entregas con su calificación, rúbrica y retroalimentación, en un PDF con código de verificación.</p>' +
      (conNotas.length ? '<div class="acciones"><select id="sel-por" style="flex:1">' + conNotas.map(m => '<option value="' + m.id + '">' + h(m.programa.nombre) + '</option>').join('') + '</select><button class="btn claro" id="btn-por">Abrir</button></div>' : vacio('Sin programas')) + '</section></div>' +
      '<h2 style="margin-top:10px">Documentos emitidos</h2>' +
      (docs.length ? '<div class="tabla-cont"><table class="tabla"><thead><tr><th>Documento</th><th>Programa</th><th>Folio</th><th>Emitido</th><th></th></tr></thead><tbody>' +
        docs.map(x => '<tr><td><b>' + (x.clase === 'Constancia' ? 'Alumno regular' : 'Certificado') + '</b>' + (x.nota ? '<br>' + notaHtml(x.nota) : '') + (x.beca ? '<br><small>Código de beca: <b>' + h(x.beca) + '</b></small>' : '') + '</td><td>' + h(x.nombrePrograma) + '</td><td>' + h(x.folio) + '<br><small>Código ' + h(x.codigo) + '</small></td><td>' + fecha(x.emitido) + '</td><td>' +
          (x.url ? '<a class="btn claro chico" href="' + h(x.url) + '" target="_blank" rel="noopener">Ver PDF</a>' : '') + '</td></tr>').join('') + '</tbody></table></div>'
        : vacio('Aún no tienes documentos emitidos', 'Cuando apruebes un programa, solicita tu certificado en Solicitudes.')));
    if ($('#btn-ar')) $('#btn-ar').onclick = async () => {
      const b = $('#btn-ar'); b.disabled = true; b.textContent = 'Generando…';
      try { const r = await api('alumnoRegular', { matricula: $('#sel-ar').value }); toast('Certificado ' + r.folio + ' listo.'); if (r.url) window.open(r.url, '_blank'); vDocumentos(); }
      catch (er) { toast(er.message, true); b.disabled = false; b.textContent = 'Generar'; }
    };
    if ($('#btn-por')) $('#btn-por').onclick = () => window.open('#/imprimir/portafolio/' + $('#sel-por').value, '_blank');
  }

  async function vSolicitudes() {
    const [lista, panel] = await Promise.all([api('misSolicitudes'), api('panel')]);
    const mats = panel.matriculas.filter(m => !m.contenedor);
    vista('<div class="encabezado-vista"><div><h1>Solicitudes</h1><p>Certificados, prórrogas, congelamientos y retiros.</p></div><button class="btn naranja" id="btn-nueva">Nueva solicitud</button></div>' +
      (lista.length ? '<div class="tabla-cont"><table class="tabla"><thead><tr><th>Tipo</th><th>Programa</th><th>Estado</th><th>Fecha</th><th>Respuesta</th></tr></thead><tbody>' +
        lista.map(s => '<tr><td><b>' + h(s.tipo) + '</b></td><td>' + h(s.programa) + '</td><td>' + etqEstado(s.estado) + '</td><td>' + fecha(s.creado) + '</td><td style="white-space:pre-wrap">' + h(s.respuesta) + '</td></tr>').join('') + '</tbody></table></div>'
        : vacio('No tienes solicitudes', '')));
    $('#btn-nueva').onclick = () => {
      const m = modal('<div class="modal-cab"><h3>Nueva solicitud</h3><button class="cerrar" data-cerrar>×</button></div><form>' +
        '<label class="campo"><span>Programa</span><select name="matricula">' + mats.map(x => '<option value="' + x.id + '">' + h(x.programa.nombre) + (x.aprobado ? ' (aprobado)' : '') + '</option>').join('') + '</select></label>' +
        '<label class="campo"><span>Tipo</span><select name="tipo"><option>Certificado</option><option>Prórroga</option><option>Congelamiento</option><option>Retiro parcial</option><option>Otra</option></select>' +
        '<small id="ayuda-tipo">El certificado se solicita cuando todas tus entregas están calificadas y tu nota final es de al menos 60%.</small></label>' +
        '<label class="campo"><span>Detalle</span><textarea name="detalle" placeholder="Cuéntanos el motivo. En congelamientos por fuerza mayor, describe tu situación."></textarea></label>' +
        '<button class="btn naranja">Enviar solicitud</button></form>');
      const f = m.el.querySelector('form');
      f.tipo.onchange = () => { $('#ayuda-tipo').textContent = { Certificado: 'El certificado se solicita cuando todas tus entregas están calificadas y tu nota final es de al menos 60%.', 'Prórroga': 'La primera prórroga es gratuita; la segunda tiene costo (ver el manual del estudiante).', Congelamiento: 'Por fuerza mayor, por 6 meses prorrogables. Mientras dura, no puedes hacer entregas.', 'Retiro parcial': 'Conservas lo aprobado y lo no cursado queda como saldo a favor por 24 meses.', Otra: '' }[f.tipo.value]; };
      f.onsubmit = async e => { e.preventDefault(); try { await api('solicitar', { matricula: f.matricula.value, tipo: f.tipo.value, detalle: f.detalle.value }); m.cerrar(); toast('Solicitud enviada.'); vSolicitudes(); } catch (er) { toast(er.message, true); } };
    };
  }

  /* =================== MENSAJES =================== */
  async function vMensajes() {
    const equipo = S.ambiente !== 'estudiante';
    const d = await api('mensajes', { como: equipo ? 'equipo' : 'alumno' });
    if (!equipo) burbujaMensajes(d.hilos.filter(x => x.noLeido).length);
    vista('<div class="encabezado-vista"><div><h1>Mensajes</h1><p>' + (equipo ? 'Consultas de estudiantes en tus programas.' : 'Escríbenos tus consultas académicas o administrativas. Respondemos en hasta dos días hábiles.') + '</p></div>' +
      (!equipo ? '<button class="btn naranja" id="btn-nuevo">Nueva consulta</button>' : '') + '</div>' +
      (d.hilos.length ? '<div class="hilos">' + d.hilos.map(x => '<a class="hilo-item' + (x.noLeido ? ' nuevo' : '') + '" href="#/hilo/' + x.hilo + '"><span class="t"><b>' + h(x.asunto) + '</b><small>' + h(x.tipo) + (x.programa ? ' · ' + h(x.programa) : '') + (equipo ? ' · ' + h(x.alumno) : '') + ' · ' + haceCuanto(x.ultimo) + '</small><p>' + h(x.extracto) + '</p></span>' + (x.noLeido ? '<span class="etq naranja">Nuevo</span>' : '') + '</a>').join('') + '</div>'
        : vacio('No hay conversaciones', equipo ? '' : 'Usa "Nueva consulta" para escribirnos.')));
    if (!equipo) $('#btn-nuevo').onclick = async () => {
      const panel = await api('panel');
      const progs = panel.matriculas.filter(m => !m.contenedor);
      const m = modal('<div class="modal-cab"><h3>Nueva consulta</h3><button class="cerrar" data-cerrar>×</button></div><form>' +
        '<label class="campo"><span>Tipo de consulta</span><select name="tipo"><option>Académica</option><option>Administrativa</option></select><small>Académica: contenidos, casos y entregas (la responde tu docente). Administrativa: pagos, plazos, certificados, accesos.</small></label>' +
        '<label class="campo"><span>Programa</span><select name="programa">' + progs.map(x => '<option value="' + x.programa.cod + '">' + h(x.programa.nombre) + '</option>').join('') + '</select></label>' +
        '<label class="campo"><span>Asunto</span><input type="text" name="asunto" maxlength="160" required></label>' +
        '<label class="campo"><span>Mensaje</span><textarea name="texto" required></textarea><small>Una consulta por mensaje. Si es sobre una semana, indica cuál.</small></label><button class="btn naranja">Enviar</button></form>');
      const f = m.el.querySelector('form');
      f.onsubmit = async e => { e.preventDefault(); try { const r = await api('escribir', { tipo: f.tipo.value, programa: f.programa.value, asunto: f.asunto.value, texto: f.texto.value }); m.cerrar(); irA('#/hilo/' + r.hilo); } catch (er) { toast(er.message, true); } };
    };
  }

  async function vHilo(id) {
    const d = await api('hilo', { hilo: id });
    vista('<div class="miga"><a href="#/mensajes">Mensajes</a> › ' + h(d.asunto) + '</div><div class="encabezado-vista"><div><h1>' + h(d.asunto) + '</h1><p>' + h(d.tipo) + (d.programa ? ' · ' + h(d.programa) : '') + (S.ambiente !== 'estudiante' ? ' · ' + h(d.alumno) : '') + '</p></div></div>' +
      '<div class="burbujas">' + d.lista.map(m => '<div class="msj' + (m.propio ? ' propio' : '') + '"><div class="de">' + h(m.autor) + (m.deIdeax && !m.propio ? ' · IDEAX' : '') + ' · ' + fechaHora(m.fecha) + '</div><div class="tx">' + h(m.texto) + '</div></div>').join('') + '</div>' +
      '<form id="f-resp" class="tarjeta"><label class="campo"><span>Responder</span><textarea name="texto" required></textarea></label><button class="btn naranja">Enviar respuesta</button></form>');
    $('#f-resp').onsubmit = async e => { e.preventDefault(); try { await api('escribir', { hilo: id, texto: e.target.texto.value }); vHilo(id); } catch (er) { toast(er.message, true); } };
  }

  /* =================== PERFIL =================== */
  async function vPerfil() {
    const u = S.usuario = await api('perfil');
    vista('<h1>Mi perfil</h1><div class="tarjeta" style="max-width:640px"><div class="acciones" style="gap:20px;align-items:center">' + avatar(u.nombre, u.foto, 'grande') +
      '<div><h2 style="margin:0">' + h(u.nombre) + '</h2><p style="color:var(--gris);margin:0">' + h(u.correo) + (u.documento ? ' · ' + h(u.documento) : '') + '</p><p style="color:var(--gris);margin:0">' + h(u.roles.join(' · ')) + '</p></div></div>' +
      '<div class="acciones" style="margin-top:18px"><label class="btn naranja chico">' + (u.foto ? 'Cambiar foto' : 'Subir foto') + '<input type="file" id="in-foto" class="sr" accept="image/jpeg,image/png,image/webp"></label>' +
      (u.foto ? '<button class="btn claro chico" id="btn-quitar-foto">Quitar foto</button>' : '') + '<a class="btn claro chico" href="#/clave">Cambiar clave</a></div>' +
      '<p style="font-size:13px;color:var(--gris);margin-top:12px">Usa una foto de rostro, clara y de frente. La verán tus docentes y el equipo de IDEAX. Se recorta en formato cuadrado.</p>' +
      '<p style="font-size:13px;color:var(--gris)">Para corregir tu nombre o documento, escríbenos una consulta administrativa.</p></div>');
    $('#in-foto').onchange = async ev => {
      const f = ev.target.files[0]; if (!f) return;
      try { const datos = await reducirImagen(await leerArchivo(f), 480, true); await api('subirFoto', { tipo: 'image/jpeg', datos }); toast('Foto actualizada.'); S.usuario = null; router(); }
      catch (er) { toast(er.message, true); }
    };
    if ($('#btn-quitar-foto')) $('#btn-quitar-foto').onclick = async () => { await api('quitarFoto'); S.usuario = null; router(); };
  }

  /* =================== IMPRESIÓN (PDF) =================== */
  function hojaImpresion(tipo, cuerpo, pie) {
    return '<div class="barra-imprimir no-imprimir"><span>Vista para imprimir o guardar en PDF</span><div class="acciones"><button class="btn naranja chico" onclick="window.print()">Guardar como PDF</button><button class="btn claro chico" onclick="window.close()">Cerrar</button></div></div>' +
      '<div class="hoja-impresion"><div class="imp-cab"><span class="marca"><img src="../img/logo-ideax-blanco.png" alt="" style="width:34px;height:34px"> IDEA<i>X</i></span><span class="doc">' + h(tipo) + '<br>eFacultad</span></div><div class="imp-franja"></div>' +
      cuerpo + '<div class="imp-pie">' + (pie || '') + 'IDEAX · Instituto de Administración y Dirección Ejecutiva · www.ideax.cl · contacto@ideax.cl</div></div>';
  }
  function bloqueEntrega(x) {
    const e = x.entrega;
    return '<div class="imp-cuerpo imp-entrega"><div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:var(--naranja);font-weight:700">Semana ' + h(x.semana.n) + (x.semana.materia && x.semana.materia !== x.programaNombre ? ' · ' + h(x.semana.materia) : '') + '</div><h1>' + h(x.semana.tema) + '</h1>' +
      '<div class="imp-datos"><div><span>Estudiante:</span> <b>' + h(x.estudiante) + '</b></div><div><span>Docente:</span> ' + h(x.docente || 'Por asignar') + '</div><div><span>Enviada:</span> ' + fechaHora(e.enviada) + '</div><div><span>Estado:</span> ' + h(e.estado) + '</div></div>' +
      (e.nota ? notaHtml(e.nota, true) : '') +
      x.ficha.casillas.map((c, i) => '<div class="imp-casilla"><h3>' + (i + 1) + '. ' + h(c.titulo) + '</h3><div class="tx">' + h(e.contenido[c.id] || '') + '</div></div>').join('') +
      (e.adjuntos && e.adjuntos.length ? '<div class="imp-casilla"><h3>Archivos adjuntos</h3>' + e.adjuntos.map(a => '<div>' + h(a.nombre) + ' · <a href="' + h(a.url) + '">' + h(a.url) + '</a></div>').join('') + '</div>' : '') +
      (e.puntajes ? '<div class="imp-casilla"><h3>Evaluación con rúbrica</h3>' + htmlRubrica(x.rubrica, e.puntajes) + '</div>' : '') +
      (e.retro ? '<div class="imp-casilla"><h3>Retroalimentación</h3><div class="retro">' + h(e.retro) + '</div></div>' : '') + '</div>';
  }
  async function vImprimirEntrega(id) {
    vista(cargando('Preparando el documento'));
    const d = await api('imprimible', { id });
    document.title = 'Entrega ' + d.semana.n + ' · ' + d.estudiante;
    vista(hojaImpresion('Entrega', '<div class="imp-cuerpo" style="padding-bottom:0"><div style="color:var(--gris)">' + h(d.programa.nombre) + '</div></div>' +
      bloqueEntrega({ programaNombre: d.programa.nombre, semana: d.semana, entrega: d.entrega, estudiante: d.estudiante, docente: d.docente, ficha: d.ficha, rubrica: d.rubrica })));
  }
  async function vImprimirPortafolio(mat) {
    vista(cargando('Preparando tu portafolio'));
    const d = await api('portafolio', { matricula: mat });
    document.title = 'Portafolio · ' + d.estudiante + ' · ' + d.programa.nombre;
    const r = d.resumen;
    const portada = '<div class="imp-cuerpo"><div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:var(--naranja);font-weight:700">Portafolio de entregas</div><h1 style="font-size:30px">' + h(d.estudiante) + '</h1>' +
      '<div class="imp-datos"><div><span>Programa:</span> <b>' + h(d.programa.nombre) + '</b></div><div><span>Horas:</span> ' + h(d.programa.horas) + '</div><div><span>Inicio:</span> ' + fecha(d.inicio) + '</div><div><span>Entregas incluidas:</span> ' + d.entregas.length + ' de ' + r.semanas + '</div>' +
      (d.documento ? '<div><span>Documento:</span> ' + h(d.documento) + '</div>' : '') + '<div><span>Emitido:</span> ' + fecha(d.emitido) + '</div></div>' +
      (r.final ? '<h3>Nota a la fecha</h3>' + notaHtml(r.final, true) : '') +
      (r.materias.length > 1 ? '<table class="tabla"><thead><tr><th>Materia</th><th>Calificadas</th><th class="num">Nota</th></tr></thead><tbody>' + r.materias.map(m => '<tr><td>' + h(m.nombre) + '</td><td>' + m.corregidas + ' de ' + m.semanas + '</td><td class="num">' + (m.nota ? coma(m.nota.pct) + '%' : '') + '</td></tr>').join('') + '</tbody></table>' : '') + '</div>';
    vista(hojaImpresion('Portafolio', portada + d.entregas.map(x => bloqueEntrega(Object.assign({ estudiante: d.estudiante, programaNombre: d.programa.nombre }, x))).join(''),
      d.codigo ? 'Folio ' + h(d.folio) + ' · Código de verificación <b>' + h(d.codigo) + '</b> · Verifica en www.ideax.cl/efacultad/#/verificar<br>' : ''));
  }

  /* =================== DOCENTE =================== */
  async function vBandeja() {
    const estado = S.datos.filtroBandeja || 'Enviada';
    const [d, progs] = await Promise.all([api('bandeja', { estado }), api('programas').catch(() => [])]);
    const pendientes = d.entregas.filter(x => x.estado === 'Enviada');
    const conEntregas = progs.filter(p => p.semanas).sort((a, b) => (pendientes.some(x => x.cod === b.cod) ? 1 : 0) - (pendientes.some(x => x.cod === a.cod) ? 1 : 0));
    vista('<div class="encabezado-vista"><div><h1>Bandeja de corrección</h1><p>' + (estado === 'Enviada' ? d.entregas.length + ' entrega' + (d.entregas.length === 1 ? '' : 's') + ' por corregir.' : 'Entregas ' + estado.toLowerCase() + 's.') + '</p></div>' +
      '<div class="acciones"><select id="f-estado"><option value="Enviada">Por corregir</option><option value="Corregida">Calificadas</option><option value="Devuelta">Devueltas</option><option value="Todas">Todas</option></select></div></div>' +
      '<section class="tarjeta"><h3>Corrección en bloque</h3><p style="color:var(--gris);font-size:14px">Descarga todas las entregas de una semana en un ZIP, con cada entrega lista para leer o imprimir y una planilla de calificación con la rúbrica. Después sube la planilla completa y se cargan juntas las notas y las retroalimentaciones.</p>' +
      '<div class="fila-campos" style="align-items:end"><label class="campo" style="margin:0"><span>Programa</span><select id="m-prog">' + conEntregas.map(p => '<option value="' + p.cod + '">' + h(p.nombre) + '</option>').join('') + '</select></label>' +
      '<label class="campo" style="margin:0"><span>Semana</span><select id="m-sem"></select></label>' +
      '<label class="check" style="margin-bottom:10px"><input type="checkbox" id="m-todas"> Incluir las ya calificadas</label></div>' +
      '<div class="acciones" style="margin-top:12px"><button class="btn" id="btn-zip">Descargar paquete (ZIP)</button><label class="btn claro">Cargar planilla calificada<input type="file" id="in-planilla" class="sr" accept=".xlsx,.xls,.csv"></label></div></section>' +
      (d.entregas.length ? '<div class="tabla-cont"><table class="tabla"><thead><tr><th>Estudiante</th><th>Programa</th><th>Semana</th><th>Enviada</th><th>Estado</th><th></th></tr></thead><tbody>' +
        d.entregas.map(x => '<tr class="clic" data-ir="#/corregir/' + x.id + '"><td><b>' + h(x.estudiante) + '</b><br><small>' + h(x.correo) + '</small></td><td>' + h(x.programa) + '</td><td>' + h(x.semana) + '. ' + h(x.tema) + '</td><td>' + haceCuanto(x.enviada) + '</td><td>' + (x.nota ? notaHtml(x.nota) : etqEstado(x.estado)) + '</td><td><a class="btn chico ' + (x.estado === 'Enviada' ? 'naranja' : 'claro') + '" href="#/corregir/' + x.id + '">' + (x.estado === 'Enviada' ? 'Corregir' : 'Ver') + '</a></td></tr>').join('') + '</tbody></table></div>'
        : vacio(estado === 'Enviada' ? 'No hay entregas por corregir' : 'Sin entregas', estado === 'Enviada' ? '¡Estás al día!' : '')));
    $('#f-estado').value = estado;
    $('#f-estado').onchange = e => { S.datos.filtroBandeja = e.target.value; vBandeja(); };
    $$('tr.clic').forEach(tr => tr.onclick = ev => { if (!ev.target.closest('a')) irA(tr.dataset.ir); });
    const cargarSemanas = async () => {
      const sel = $('#m-sem'); sel.innerHTML = '<option>Cargando…</option>';
      try {
        const cod = $('#m-prog').value, r = await api('semanasPrograma', { programa: cod });
        const conteo = {}; pendientes.filter(x => x.cod === cod).forEach(x => conteo[x.semana_id] = (conteo[x.semana_id] || 0) + 1);
        sel.innerHTML = r.semanas.map(s => '<option value="' + s.id + '">' + s.n + '. ' + h(s.tema) + (conteo[s.id] ? ' (' + conteo[s.id] + ' por corregir)' : '') + '</option>').join('');
        const primera = r.semanas.find(s => conteo[s.id]); if (primera) sel.value = primera.id;
      }
      catch (e) { sel.innerHTML = ''; }
    };
    if (conEntregas.length) { $('#m-prog').onchange = cargarSemanas; cargarSemanas(); }
    $('#btn-zip').onclick = () => descargarPaquete($('#m-sem').value, $('#m-todas').checked);
    $('#in-planilla').onchange = ev => { const f = ev.target.files[0]; ev.target.value = ''; if (f) cargarPlanilla(f); };
  }

  function htmlEntregaSuelta(paq, e) {
    const css = 'body{font-family:Poppins,Segoe UI,Arial,sans-serif;color:#13233B;max-width:820px;margin:0 auto;padding:24px;line-height:1.55}h1{color:#0F2747;font-size:22px;margin:4px 0}h3{color:#0F2747;border-bottom:2px solid #F07C1B;display:inline-block;padding-bottom:3px;margin:22px 0 6px}' +
      '.cab{background:#0F2747;color:#fff;padding:16px 22px;border-radius:10px}.cab b{font-size:20px}.cab i{color:#F07C1B;font-style:normal}.tx{white-space:pre-wrap}.datos{color:#4B5565;font-size:13px;margin:10px 0 18px}' +
      'table{border-collapse:collapse;width:100%;font-size:12px;margin-top:8px}td,th{border:1px solid #DCE2EA;padding:6px;vertical-align:top;text-align:left}th{background:#0F2747;color:#fff}@media print{.cab{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';
    return '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>' + h(e.estudiante) + ' · Semana ' + paq.semana.n + '</title><style>' + css + '</style></head><body>' +
      '<div class="cab"><b>IDEA<i>X</i></b> · eFacultad · ' + h(paq.programa.nombre) + '</div>' +
      '<h1>Semana ' + h(paq.semana.n) + ': ' + h(paq.semana.tema) + '</h1><div class="datos"><b>' + h(e.estudiante) + '</b> · ' + h(e.correo) + ' · Enviada ' + fechaHora(e.enviada) + ' · ID ' + h(e.id) + '</div>' +
      paq.ficha.casillas.map((c, i) => '<h3>' + (i + 1) + '. ' + h(c.titulo) + '</h3><div class="tx">' + h(e.contenido[c.id] || '') + '</div>').join('') +
      (e.adjuntos.length ? '<h3>Adjuntos</h3>' + e.adjuntos.map(a => '<div><a href="' + h(a.url) + '">' + h(a.nombre) + '</a></div>').join('') : '') +
      '<h3>Rúbrica</h3><table><tr><th>Criterio</th><th>Destacado</th><th>Logrado</th><th>En desarrollo</th><th>Insuficiente</th></tr>' +
      paq.rubrica.criterios.map(c => '<tr><td><b>' + h(c.criterio) + '</b> (' + c.peso + '%)</td><td>' + h(c.destacado) + '</td><td>' + h(c.logrado) + '</td><td>' + h(c.en_desarrollo) + '</td><td>' + h(c.insuficiente) + '</td></tr>').join('') + '</table></body></html>';
  }

  async function descargarPaquete(semana, todas) {
    if (!semana) { toast('Elige una semana.', true); return; }
    const b = $('#btn-zip'); b.disabled = true; b.textContent = 'Preparando…';
    try {
      const [paq, XLSX, JSZip] = await Promise.all([api('exportarEntregas', { semana, incluir: todas ? 'todas' : '' }), XLSXlib(), ZIPlib()]);
      if (!paq.entregas.length) { toast('Esa semana no tiene entregas ' + (todas ? '' : 'por corregir') + '.', true); return; }
      const crit = paq.rubrica.criterios;
      const enc = ['ID entrega', 'Estudiante', 'Correo'].concat(crit.map(c => c.criterio + ' (' + c.peso + '%) [' + c.id + ']')).concat(['Retroalimentación', 'Nota calculada (no editar)']);
      const filas = paq.entregas.map((e, i) => {
        const r = i + 2, colIni = 4, colFin = 3 + crit.length;
        const letras = n => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
        const formula = crit.map((c, k) => letras(colIni + k) + r + '*' + c.peso).join('+') + ')/' + crit.reduce((a, c) => a + c.peso, 0);
        return [e.id, e.estudiante, e.correo].concat(crit.map(c => e.puntajes && e.puntajes[c.id] !== undefined ? e.puntajes[c.id] : '')).concat([e.retro || '', { f: 'IF(COUNT(' + letras(colIni) + r + ':' + letras(colFin) + r + ')=' + crit.length + ',ROUND((' + formula + ',1),"")' }]);
      });
      const libro = XLSX.utils.book_new();
      const hoja = XLSX.utils.aoa_to_sheet([enc].concat(filas));
      hoja['!cols'] = [{ wch: 16 }, { wch: 28 }, { wch: 28 }].concat(crit.map(() => ({ wch: 16 }))).concat([{ wch: 60 }, { wch: 14 }]);
      XLSX.utils.book_append_sheet(libro, hoja, 'Calificaciones');
      const rub = XLSX.utils.aoa_to_sheet([['Criterio', 'ID', 'Peso %', 'Destacado (' + paq.rubrica.niveles.destacado + '%)', 'Logrado (' + paq.rubrica.niveles.logrado + '%)', 'En desarrollo (' + paq.rubrica.niveles.en_desarrollo + '%)', 'Insuficiente (' + paq.rubrica.niveles.insuficiente + '%)']]
        .concat(crit.map(c => [c.criterio, c.id, c.peso, c.destacado, c.logrado, c.en_desarrollo, c.insuficiente])));
      rub['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 8 }, { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(libro, rub, 'Rúbrica');
      XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet([['Cómo usar esta planilla'], ['1. Lee cada entrega (carpeta Entregas del ZIP).'], ['2. En la hoja Calificaciones, escribe el porcentaje de logro (0 a 100) de cada criterio. Puedes guiarte por los niveles de la hoja Rúbrica.'],
        ['3. Escribe la retroalimentación para el estudiante. Es obligatoria.'], ['4. No cambies la columna ID entrega ni los encabezados (el código entre corchetes identifica cada criterio).'], ['5. Deja en blanco las filas que aún no corriges: no se cargan.'],
        ['6. En la eFacultad, Bandeja > Cargar planilla calificada. Verás una vista previa antes de confirmar.'], [''], ['Programa: ' + paq.programa.nombre], ['Semana ' + paq.semana.n + ': ' + paq.semana.tema], ['Generada: ' + new Date(paq.generado).toLocaleString('es-CL')]]), 'Instrucciones');
      const zip = new JSZip();
      const nombreBase = (paq.programa.cod + ' semana ' + paq.semana.n).replace(/[^\w áéíóúñ-]/gi, '');
      zip.file('Planilla de calificación ' + nombreBase + '.xlsx', XLSX.write(libro, { type: 'array', bookType: 'xlsx' }));
      const carpeta = zip.folder('Entregas');
      paq.entregas.forEach((e, i) => carpeta.file(String(i + 1).padStart(2, '0') + ' ' + e.estudiante.replace(/[\\/:*?"<>|]/g, '') + '.html', htmlEntregaSuelta(paq, e)));
      descargar('Entregas ' + nombreBase + '.zip', await zip.generateAsync({ type: 'blob' }));
      toast('Paquete descargado: ' + paq.entregas.length + ' entrega' + (paq.entregas.length === 1 ? '' : 's') + '.');
    } catch (e) { toast(e.message, true); }
    finally { b.disabled = false; b.textContent = 'Descargar paquete (ZIP)'; }
  }

  async function cargarPlanilla(file) {
    try {
      const XLSX = await XLSXlib();
      const libro = XLSX.read(await leerArchivo(file, 'buffer'), { type: 'array' });
      const hoja = libro.Sheets['Calificaciones'] || libro.Sheets[libro.SheetNames[0]];
      const filas = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: '' });
      if (filas.length < 2) throw new Error('La planilla no tiene filas.');
      const enc = filas[0].map(String);
      const iId = enc.findIndex(x => /^ID entrega/i.test(x)), iRetro = enc.findIndex(x => /^Retroalimentaci/i.test(x)), iNom = enc.findIndex(x => /^Estudiante/i.test(x));
      const crits = enc.map((x, i) => { const m = x.match(/\[([\w-]+)\]\s*$/); const p = x.match(/\((\d+(?:[.,]\d+)?)%\)/); return m ? { i, id: m[1], peso: p ? Number(p[1].replace(',', '.')) : 0, nombre: x.replace(/\s*\(.*$/, '') } : null; }).filter(Boolean);
      if (iId < 0 || iRetro < 0 || !crits.length) throw new Error('No reconozco el formato. Usa la planilla que descargaste desde la bandeja, sin cambiar los encabezados.');
      const datos = [], omitidas = [];
      filas.slice(1).forEach(f => {
        const id = String(f[iId] || '').trim(); if (!id) return;
        const vals = crits.map(c => f[c.i]);
        if (vals.every(v => v === '' || v === null) && !String(f[iRetro] || '').trim()) { omitidas.push(f[iNom]); return; }
        const puntajes = {}; crits.forEach(c => { const v = f[c.i]; puntajes[c.id] = v === '' ? '' : Number(String(v).replace(',', '.')); });
        const completos = crits.every(c => puntajes[c.id] !== '' && !isNaN(puntajes[c.id]));
        const pesos = crits.reduce((a, c) => a + c.peso, 0);
        datos.push({ id, nombre: f[iNom], puntajes, retro: String(f[iRetro] || '').trim(), nota: completos && pesos ? Math.round(crits.reduce((a, c) => a + puntajes[c.id] * c.peso, 0) / pesos * 10) / 10 : null });
      });
      if (!datos.length) throw new Error('No encontré filas con puntajes para cargar.');
      const m = modal('<div class="modal-cab"><h3>Revisar antes de cargar</h3><button class="cerrar" data-cerrar>×</button></div><p>' + datos.length + ' entrega' + (datos.length === 1 ? '' : 's') + ' con calificación' + (omitidas.length ? '; ' + omitidas.length + ' fila' + (omitidas.length === 1 ? '' : 's') + ' en blanco se omiten' : '') + '.</p>' +
        '<div class="tabla-cont" style="max-height:50vh;overflow:auto"><table class="tabla"><thead><tr><th>Estudiante</th>' + crits.map(c => '<th class="num">' + h(c.nombre) + '</th>').join('') + '<th class="num">Nota</th><th>Retroalimentación</th></tr></thead><tbody>' +
        datos.map(x => '<tr><td>' + h(x.nombre) + '</td>' + crits.map(c => '<td class="num">' + (x.puntajes[c.id] === '' ? '<span class="etq rojo">Falta</span>' : h(x.puntajes[c.id])) + '</td>').join('') + '<td class="num">' + (x.nota !== null ? '<b>' + coma(x.nota) + '%</b>' : '') + '</td><td>' + (x.retro ? h(x.retro.slice(0, 90)) + (x.retro.length > 90 ? '…' : '') : '<span class="etq rojo">Falta</span>') + '</td></tr>').join('') +
        '</tbody></table></div><label class="check" style="margin-top:12px"><input type="checkbox" id="c-avisar" checked> Avisar por correo a cada estudiante</label>' +
        '<div class="acciones" style="justify-content:flex-end;margin-top:14px"><button class="btn claro" data-cerrar>Cancelar</button><button class="btn naranja" id="btn-cargar">Cargar calificaciones</button></div><div id="res-carga"></div>', 'ancho');
      m.el.querySelector('#btn-cargar').onclick = async ev => {
        const b = ev.target; b.disabled = true; b.textContent = 'Cargando…';
        const silencioso = !m.el.querySelector('#c-avisar').checked;
        const resultados = [];
        for (let i = 0; i < datos.length; i += 30) {
          const r = await api('corregirMasivo', { filas: datos.slice(i, i + 30).map(x => ({ id: x.id, puntajes: x.puntajes, retro: x.retro })), silencioso });
          resultados.push.apply(resultados, r.resultados);
        }
        const malas = resultados.filter(r => !r.ok);
        m.el.querySelector('#res-carga').innerHTML = '<div class="aviso ' + (malas.length ? 'alerta' : 'ok') + '" style="margin-top:14px"><b>' + (resultados.length - malas.length) + ' calificaciones cargadas.</b>' +
          (malas.length ? '<br>' + malas.length + ' con problemas:<ul>' + malas.map(r => '<li>' + h((datos.find(x => x.id === r.id) || {}).nombre || r.id) + ': ' + h(r.error) + '</li>').join('') + '</ul>' : '') + '</div>';
        b.textContent = 'Listo'; vBandeja();
      };
    } catch (e) { toast(e.message, true); }
  }

  async function vCorregir(id) {
    const d = await api('corregirVer', { id });
    const e = d.entrega, s = d.semana;
    const puntajes = Object.assign({}, e.puntajes || {});
    vista('<div class="miga"><a href="#/bandeja">Bandeja</a> › ' + h(d.estudiante.nombre) + ' · Semana ' + s.n + '</div>' +
      '<div class="encabezado-vista"><div class="acciones" style="gap:14px">' + avatar(d.estudiante.nombre, d.estudiante.foto) + '<div><h1 style="margin:0">' + h(d.estudiante.nombre) + '</h1><p>' + h(d.programa.nombre) + ' · Semana ' + s.n + ': ' + h(s.tema) + ' · enviada ' + fechaHora(e.enviada) + '</p></div></div>' +
      '<div class="acciones">' + etqEstado(e.estado) + '<a class="btn claro chico" href="#/imprimir/entrega/' + e.id + '" target="_blank">PDF</a></div></div>' +
      '<div class="rejilla" style="grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);align-items:start" id="rej-corr"><div>' +
      d.ficha.casillas.map((c, i) => '<section class="casilla"><h3><em>' + (i + 1) + '</em>' + h(c.titulo) + '</h3>' + (c.pauta ? '<div class="ayuda pauta">' + h(c.pauta) + '</div>' : '') + '<div class="solo-lectura">' + h(e.contenido[c.id] || '') + '</div><div class="contador">' + contarPalabras(e.contenido[c.id]) + ' palabras' + (c.palabras_max ? ' de ' + c.palabras_max + ' sugeridas' : '') + '</div></section>').join('') +
      (e.adjuntos.length ? '<section class="casilla"><h3>Adjuntos</h3>' + htmlAdjuntos(e.adjuntos) + '</section>' : '') + '</div>' +
      '<div style="position:sticky;top:76px;max-height:calc(100vh - 90px);overflow-y:auto"><section class="tarjeta"><h3>Calificación con rúbrica</h3><p style="font-size:13px;color:var(--gris)">Elige un nivel para proponer su porcentaje, o escribe el porcentaje de logro directamente.</p>' + htmlRubricaCompacta(d.rubrica, puntajes) +
      '<div id="nota-calc" style="margin:14px 0"></div><label class="campo"><span>Retroalimentación para el estudiante</span><textarea id="retro" rows="8" placeholder="Qué hizo bien, qué debe mejorar y cómo.">' + h(e.retro || '') + '</textarea></label>' +
      '<div class="acciones"><button class="btn naranja" id="btn-calificar">' + (e.estado === 'Corregida' ? 'Actualizar calificación' : 'Guardar calificación') + '</button><button class="btn claro" id="btn-devolver">Devolver para corregir</button></div></section></div></div>');
    if (window.innerWidth < 900) $('#rej-corr').style.gridTemplateColumns = '1fr';
    const calc = () => {
      const crit = d.rubrica.criterios; let suma = 0, pesos = 0, completo = true;
      crit.forEach(c => { const v = puntajes[c.id]; if (v === '' || v === undefined || isNaN(v)) completo = false; else { suma += Number(v) * c.peso; pesos += c.peso; } });
      $('#nota-calc').innerHTML = completo ? notaHtml({ pct: Math.round(suma / pesos * 10) / 10, n7: (p => p < 60 ? 1 + 3 * p / 60 : 4 + 3 * (p - 60) / 40)(suma / pesos), n10: (p => p < 60 ? 1 + 5 * p / 60 : 6 + 4 * (p - 60) / 40)(suma / pesos), aprobado: suma / pesos >= 60 }, true) : '<div class="aviso info" style="margin:0">Completa todos los criterios para calcular la nota.</div>';
      $$('.nivel-btn').forEach(bt => { const v = puntajes[bt.dataset.crit]; const on = v !== undefined && v !== '' && d.rubrica.niveles[bt.dataset.nivel] === Number(v); bt.classList.toggle('naranja', on); bt.classList.toggle('claro', !on); });
      d.rubrica.criterios.forEach(c => { const v = puntajes[c.id], el = $('[data-desc="' + c.id + '"]'); if (!el) return;
        if (v === undefined || v === '') { el.textContent = ''; return; }
        const k = Object.keys(d.rubrica.niveles).reduce((best, x) => Math.abs(d.rubrica.niveles[x] - v) < Math.abs(d.rubrica.niveles[best] - v) ? x : best, 'destacado');
        el.textContent = c[k] || ''; });
    };
    $$('.nivel-btn').forEach(bt => bt.onclick = () => { puntajes[bt.dataset.crit] = d.rubrica.niveles[bt.dataset.nivel]; $('[data-pct="' + bt.dataset.crit + '"]').value = puntajes[bt.dataset.crit]; calc(); });
    $$('[data-pct]').forEach(i => i.oninput = () => { puntajes[i.dataset.pct] = i.value === '' ? '' : Number(i.value); calc(); });
    calc();
    $('#btn-calificar').onclick = async () => {
      try { const r = await api('corregir', { id, puntajes, retro: $('#retro').value }); toast('Calificación guardada: ' + coma(r.nota.pct) + '%.'); irA('#/bandeja'); }
      catch (er) { toast(er.message, true); }
    };
    $('#btn-devolver').onclick = async () => {
      if (!$('#retro').value.trim()) { toast('Escribe en la retroalimentación qué debe corregir.', true); return; }
      if (!await confirmar('¿Devolver la entrega para que la corrija y la vuelva a enviar?', 'Devolver')) return;
      try { await api('devolver', { id, retro: $('#retro').value }); toast('Entrega devuelta.'); irA('#/bandeja'); } catch (er) { toast(er.message, true); }
    };
  }

  async function vLibro(cod) {
    const progs = await api('programas');
    const conAlumnos = progs.filter(p => p.matriculados && p.semanas);
    cod = cod || (conAlumnos[0] || {}).cod;
    let html = '<div class="encabezado-vista"><div><h1>Libro de notas</h1><p>Notas en porcentaje por semana y nota final de cada estudiante.</p></div><div class="acciones"><select id="sel-libro">' +
      (conAlumnos.length ? conAlumnos : progs.filter(p => p.semanas)).map(p => '<option value="' + p.cod + '"' + (p.cod === cod ? ' selected' : '') + '>' + h(p.nombre) + ' (' + p.matriculados + ')</option>').join('') + '</select><button class="btn claro" id="btn-xlsx-libro">Exportar</button></div></div><div id="libro">' + cargando() + '</div>';
    vista(html);
    $('#sel-libro').onchange = e => irA('#/libro/' + e.target.value);
    if (!cod) { $('#libro').innerHTML = vacio('Sin programas'); return; }
    const d = await api('libroNotas', { programa: cod });
    $('#libro').innerHTML = d.filas.length ? '<div class="tabla-cont"><table class="tabla"><thead><tr><th>Estudiante</th>' + d.semanas.map(s => '<th class="num" title="' + h(s.tema) + '">S' + s.n + '</th>').join('') + '<th class="num">Final</th></tr></thead><tbody>' +
      d.filas.map(f => '<tr><td><b>' + h(f.estudiante) + '</b><br><small>' + h(f.correo) + '</small></td>' + f.semanas.map(x => '<td class="num">' + (!x ? '' : x.pct !== null ? '<a href="#/corregir/' + x.id + '">' + coma(x.pct) + '</a>' : '<a href="#/corregir/' + x.id + '">' + etqEstado(x.estado) + '</a>') + '</td>').join('') + '<td class="num">' + notaHtml(f.final) + '</td></tr>').join('') + '</tbody></table></div>'
      : vacio('Este programa no tiene estudiantes', '');
    $('#btn-xlsx-libro').onclick = async () => {
      const XLSX = await XLSXlib();
      const filas = [['Estudiante', 'Correo', 'Estado'].concat(d.semanas.map(s => 'S' + s.n + ' ' + s.tema)).concat(['Final %', 'Final 1 a 7', 'Final 1 a 10', 'Aprobado'])].concat(
        d.filas.map(f => [f.estudiante, f.correo, f.estado].concat(f.semanas.map(x => x && x.pct !== null ? x.pct : x ? x.estado : '')).concat(f.final ? [f.final.pct, f.final.n7, f.final.n10, f.aprobado ? 'Sí' : 'No'] : ['', '', '', ''])));
      const lb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(lb, XLSX.utils.aoa_to_sheet(filas), 'Notas');
      XLSX.writeFile(lb, 'Libro de notas ' + d.programa.cod + '.xlsx');
    };
  }

  /* =================== CONTENIDOS (docente y gestión académica) =================== */
  const TIPOS = { master: 'Masters Profesionales', diplomado: 'Diplomados', gratuito: 'Cursos gratuitos', ejecutivo: 'Cursos ejecutivos', paper: 'Paper', emprendedores: 'Emprendedores', contenedor: 'Programas agrupadores' };
  async function vContenidos() {
    const progs = await api('programas');
    const academico = tiene('gestion_academica');
    const grupos = {};
    progs.forEach(p => (grupos[p.tipo] = grupos[p.tipo] || []).push(p));
    vista('<div class="encabezado-vista"><div><h1>' + (S.ambiente === 'gestion' ? 'Programas y docentes' : 'Contenidos') + '</h1><p>Todos los programas tienen sus semanas creadas. Carga los recursos, la ficha de entrega, la rúbrica y la autoevaluación de cada semana, y márcala como lista.</p></div>' +
      '<input type="search" id="buscar-prog" placeholder="Buscar programa" style="max-width:280px"></div>' +
      Object.keys(TIPOS).filter(t => grupos[t]).map(t => '<h2 class="grupo-prog" style="margin-top:18px">' + TIPOS[t] + '</h2><div class="tabla-cont grupo-prog"><table class="tabla"><thead><tr><th>Programa</th><th class="num">Semanas listas</th><th class="num">Matriculados</th><th>Docentes</th><th></th></tr></thead><tbody>' +
        grupos[t].map(p => '<tr data-buscar="' + h((p.nombre + ' ' + p.cod).toLowerCase()) + '"><td><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:' + h(p.color) + ';margin-right:8px"></span><b>' + h(p.nombre) + '</b><br><small>' + h(p.cod) + ' · ' + p.horas + ' h</small></td>' +
          '<td class="num">' + (p.semanas ? '<span class="etq ' + (p.listas === p.semanas ? 'verde' : p.listas ? 'naranja' : '') + '">' + p.listas + ' de ' + p.semanas + '</span>' : '') + '</td><td class="num">' + p.matriculados + '</td>' +
          '<td>' + (p.docentes.map(x => h(x.nombre)).join('<br>') || '<small>Sin asignar</small>') + '</td><td class="num"><div class="acciones" style="justify-content:flex-end">' +
          (academico ? '<button class="btn claro chico" data-docentes="' + p.cod + '">Docentes</button>' : '') + (p.semanas ? '<a class="btn chico" href="#/programa/' + p.cod + '">Semanas</a>' : '') + '</div></td></tr>').join('') + '</tbody></table></div>').join(''));
    $('#buscar-prog').oninput = e => { const q = e.target.value.toLowerCase(); $$('tr[data-buscar]').forEach(tr => tr.classList.toggle('oculto', q && tr.dataset.buscar.indexOf(q) < 0)); };
    $$('[data-docentes]').forEach(b => b.onclick = async () => {
      const p = progs.find(x => x.cod === b.dataset.docentes);
      const lista = await api('docentes');
      const m = modal('<div class="modal-cab"><h3>Docentes de ' + h(p.nombre) + '</h3><button class="cerrar" data-cerrar>×</button></div><p style="color:var(--gris);font-size:14px">Corrigen las entregas, responden las consultas académicas y pueden editar las semanas de este programa.</p>' +
        (lista.length ? lista.map(x => '<label class="check" style="margin:8px 0"><input type="checkbox" value="' + x.id + '"' + (p.docentes.some(y => y.id === x.id) ? ' checked' : '') + '> ' + h(x.nombre) + ' <small style="color:var(--gris)">' + h(x.correo) + '</small></label>').join('') : '<p>No hay cuentas con rol docente. Créalas en Gestión › Cuentas.</p>') +
        '<label class="check" style="margin:12px 0 0;color:var(--gris);font-size:13px"><input type="checkbox" id="c-hijos"> Aplicar también a sus diplomados (si es un Master Profesional)</label>' +
        '<div class="acciones" style="justify-content:flex-end;margin-top:16px"><button class="btn claro" data-cerrar>Cancelar</button><button class="btn naranja" id="btn-asig">Guardar</button></div>');
      m.el.querySelector('#btn-asig').onclick = async () => {
        const ids = $$('input[type=checkbox][value]', m.el).filter(i => i.checked).map(i => i.value);
        try {
          await api('asignarDocentes', { programa: p.cod, docentes: ids });
          if (m.el.querySelector('#c-hijos').checked) for (const h2 of progs.filter(x => x.master === p.cod)) await api('asignarDocentes', { programa: h2.cod, docentes: ids });
          m.cerrar(); toast('Docentes asignados.'); vContenidos();
        } catch (er) { toast(er.message, true); }
      };
    });
  }

  async function vProgramaSemanas(cod) {
    const d = await api('semanasPrograma', { programa: cod });
    const volver = S.ambiente === 'gestion' ? '#/programas' : '#/contenidos';
    let materia = null;
    vista('<div class="miga"><a href="' + volver + '">' + (S.ambiente === 'gestion' ? 'Programas' : 'Contenidos') + '</a> › ' + h(d.programa.nombre) + '</div><div class="encabezado-vista"><div><h1>' + h(d.programa.nombre) + '</h1><p>' + d.semanas.filter(s => s.materialListo).length + ' de ' + d.semanas.length + ' semanas listas.</p></div></div>' +
      '<div class="tabla-cont"><table class="tabla"><thead><tr><th>Semana</th><th class="num">Recursos</th><th>Ficha</th><th>Rúbrica</th><th class="num">Autoeval.</th><th>Estado</th><th></th></tr></thead><tbody>' +
      d.semanas.map(s => {
        let fila = '';
        if (s.materia_n !== materia && d.semanas.some(x => x.materia_n !== s.materia_n)) { materia = s.materia_n; fila += '<tr><td colspan="7" style="background:#FBFCFD;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--gris);font-weight:700">Materia ' + s.materia_n + ' · ' + h(s.materia) + '</td></tr>'; }
        return fila + '<tr><td><b>' + s.n + '.</b> ' + h(s.tema) + '</td><td class="num">' + s.recursos + ' de 4</td><td>' + (s.ficha ? '<span class="etq verde">Propia (' + s.ficha + ')</span>' : '<span class="etq">Por defecto</span>') + '</td>' +
          '<td>' + (s.rubrica ? '<span class="etq verde">Propia</span>' : '<span class="etq">Por defecto</span>') + '</td><td class="num">' + (s.autoeval || '') + '</td><td>' + (s.materialListo ? '<span class="etq verde">Lista</span>' : '<span class="etq naranja">Pendiente</span>') + '</td>' +
          '<td class="num"><div class="acciones" style="justify-content:flex-end"><a class="btn claro chico" href="#/vista/' + s.id + '">Vista previa</a><a class="btn chico" href="#/editar/' + s.id + '">Editar</a></div></td></tr>';
      }).join('') + '</tbody></table></div>');
  }

  async function vEditarSemana(id) {
    const d = await api('semanaEditar', { id });
    const s = d.semana;
    let casillas = d.ficha.casillas.map(c => Object.assign({}, c));
    let rubrica = d.rubrica.criterios.map(c => Object.assign({}, c));
    let auto = d.autoevaluacion.map(q => ({ pregunta: q.pregunta, opciones: q.opciones.join('\n'), correcta: q.correcta, explicacion: q.explicacion }));
    const campo = (k, t, tipo, ayuda) => '<label class="campo"><span>' + t + '</span>' + (tipo === 'area' ? '<textarea data-s="' + k + '" rows="3">' + h(s[k]) + '</textarea>' : '<input type="' + (tipo || 'text') + '" data-s="' + k + '" value="' + h(s[k]) + '">') + (ayuda ? '<small>' + ayuda + '</small>' : '') + '</label>';
    const pintarCasillas = () => {
      $('#ed-casillas').innerHTML = casillas.map((c, i) => '<div class="bloque-editor"><div class="cab"><b>Casilla ' + (i + 1) + '</b><div class="acciones"><button class="btn texto chico" data-mover="' + i + '" data-dir="-1">↑</button><button class="btn texto chico" data-mover="' + i + '" data-dir="1">↓</button><button class="btn texto chico" data-quitar-c="' + i + '" style="color:var(--rojo)">Quitar</button></div></div>' +
        '<div class="fila-campos"><label class="campo"><span>Título</span><input type="text" data-c="' + i + '" data-k="titulo" value="' + h(c.titulo) + '"></label><label class="campo"><span>Extensión sugerida (palabras)</span><input type="number" data-c="' + i + '" data-k="palabras_max" value="' + h(c.palabras_max || '') + '"></label></div>' +
        ['instruccion|Instrucción|Lo que debe hacer el estudiante en esta casilla', 'explicacion|Explicación|Se muestra al pulsar "Explicación"', 'ejemplo|Ejemplo|Un ejemplo de respuesta bien hecha', 'pauta|Qué se evalúa|Criterio breve que verá el estudiante'].map(x => { const p = x.split('|'); return '<label class="campo"><span>' + p[1] + '</span><textarea data-c="' + i + '" data-k="' + p[0] + '" rows="2">' + h(c[p[0]] || '') + '</textarea><small>' + p[2] + '</small></label>'; }).join('') + '</div>').join('');
      $$('[data-c]').forEach(inp => inp.oninput = () => { casillas[inp.dataset.c][inp.dataset.k] = inp.value; });
      $$('[data-quitar-c]').forEach(b => b.onclick = () => { casillas.splice(Number(b.dataset.quitarC), 1); pintarCasillas(); });
      $$('[data-mover]').forEach(b => b.onclick = () => { const i = Number(b.dataset.mover), j = i + Number(b.dataset.dir); if (j < 0 || j >= casillas.length) return; const t = casillas[i]; casillas[i] = casillas[j]; casillas[j] = t; pintarCasillas(); });
    };
    const pintarRubrica = () => {
      const suma = rubrica.reduce((a, r) => a + (Number(r.peso) || 0), 0);
      $('#ed-rubrica').innerHTML = '<div class="aviso ' + (suma === 100 ? 'ok' : 'alerta') + '">Los pesos suman ' + suma + '%' + (suma === 100 ? '.' : '; deben sumar 100%.') + '</div>' +
        rubrica.map((r, i) => '<div class="bloque-editor"><div class="cab"><b>Criterio ' + (i + 1) + '</b><button class="btn texto chico" data-quitar-r="' + i + '" style="color:var(--rojo)">Quitar</button></div>' +
          '<div class="fila-campos"><label class="campo"><span>Criterio</span><input type="text" data-r="' + i + '" data-k="criterio" value="' + h(r.criterio) + '"></label><label class="campo"><span>Peso %</span><input type="number" data-r="' + i + '" data-k="peso" value="' + h(r.peso) + '"></label></div>' +
          '<div class="fila-campos">' + [['destacado', 'Destacado'], ['logrado', 'Logrado'], ['en_desarrollo', 'En desarrollo'], ['insuficiente', 'Insuficiente']].map(n => '<label class="campo"><span>' + n[1] + '</span><textarea data-r="' + i + '" data-k="' + n[0] + '" rows="2">' + h(r[n[0]] || '') + '</textarea></label>').join('') + '</div></div>').join('');
      $$('[data-r]').forEach(inp => inp.oninput = () => { rubrica[inp.dataset.r][inp.dataset.k] = inp.dataset.k === 'peso' ? Number(inp.value) : inp.value; if (inp.dataset.k === 'peso') { const sm = rubrica.reduce((a, r) => a + (Number(r.peso) || 0), 0); const av = $('#ed-rubrica .aviso'); av.className = 'aviso ' + (sm === 100 ? 'ok' : 'alerta'); av.textContent = 'Los pesos suman ' + sm + '%' + (sm === 100 ? '.' : '; deben sumar 100%.'); } });
      $$('[data-quitar-r]').forEach(b => b.onclick = () => { rubrica.splice(Number(b.dataset.quitarR), 1); pintarRubrica(); });
    };
    const pintarAuto = () => {
      $('#ed-auto').innerHTML = auto.map((q, i) => '<div class="bloque-editor"><div class="cab"><b>Pregunta ' + (i + 1) + '</b><button class="btn texto chico" data-quitar-a="' + i + '" style="color:var(--rojo)">Quitar</button></div>' +
        '<label class="campo"><span>Pregunta</span><textarea data-a="' + i + '" data-k="pregunta" rows="2">' + h(q.pregunta) + '</textarea></label>' +
        '<div class="fila-campos"><label class="campo"><span>Opciones (una por línea)</span><textarea data-a="' + i + '" data-k="opciones" rows="4">' + h(q.opciones) + '</textarea></label>' +
        '<label class="campo"><span>N.º de la opción correcta</span><input type="number" min="1" data-a="' + i + '" data-k="correcta" value="' + h(q.correcta || '') + '"></label></div>' +
        '<label class="campo"><span>Explicación de la respuesta</span><textarea data-a="' + i + '" data-k="explicacion" rows="2">' + h(q.explicacion || '') + '</textarea></label></div>').join('') || '<p style="color:var(--gris)">Sin preguntas. La pestaña de autoevaluación no se mostrará a los estudiantes.</p>';
      $$('[data-a]').forEach(inp => inp.oninput = () => { auto[inp.dataset.a][inp.dataset.k] = inp.value; });
      $$('[data-quitar-a]').forEach(b => b.onclick = () => { auto.splice(Number(b.dataset.quitarA), 1); pintarAuto(); });
    };
    vista('<div class="miga"><a href="#/programa/' + s.programa + '">Semanas del programa</a> › Semana ' + s.n + '</div>' +
      '<div class="encabezado-vista"><div><h1>Semana ' + s.n + ': ' + h(s.tema) + '</h1><p>' + (s.materia ? 'Materia ' + s.materia_n + ' · ' + h(s.materia) : '') + '</p></div><div class="acciones"><a class="btn claro" href="#/vista/' + s.id + '" target="_blank">Vista previa</a><button class="btn naranja" data-guardar>Guardar</button></div></div>' +
      '<div class="pestanas"><button class="activo" data-pest="gen">Semana y recursos</button><button data-pest="fic">Ficha de entrega</button><button data-pest="rub">Rúbrica</button><button data-pest="aut">Autoevaluación</button></div>' +
      '<div data-panel="gen" class="tarjeta">' + campo('tema', 'Tema') + campo('descripcion', 'Descripción', 'area', 'Contenidos y caso de la semana, en pocas líneas.') + campo('entrega', 'Qué se entrega', 'area') +
      '<div class="fila-campos">' + campo('cuaderno', 'Cuaderno de estudio (enlace)', 'url', 'Enlace de Drive compartido con "cualquier persona con el enlace".') + campo('caso', 'Caso (enlace)', 'url') + campo('herramienta', 'Herramienta (enlace)', 'url') + campo('lectura', 'Lectura complementaria (enlace)', 'url') + '</div>' +
      '<label class="check"><input type="checkbox" data-s="material_listo"' + (s.material_listo ? ' checked' : '') + '> Material listo: la semana está completa para los estudiantes</label></div>' +
      '<div data-panel="fic" class="oculto">' + (!d.ficha.propia ? '<div class="aviso info">Esta semana usa la ficha por defecto del método de casos. Si la modificas y guardas, queda como ficha propia de la semana.</div>' : '') + '<div id="ed-casillas"></div><button class="btn claro" id="add-c">Agregar casilla</button></div>' +
      '<div data-panel="rub" class="oculto">' + (!d.rubrica.propia ? '<div class="aviso info">Esta semana usa la rúbrica por defecto del método de casos.</div>' : '') + '<div id="ed-rubrica"></div><button class="btn claro" id="add-r">Agregar criterio</button></div>' +
      '<div data-panel="aut" class="oculto"><div id="ed-auto"></div><button class="btn claro" id="add-a">Agregar pregunta</button></div>' +
      '<section class="tarjeta" style="margin-top:16px"><label class="campo" style="margin:0"><span>Al guardar, copiar la ficha y la rúbrica a</span><select id="replicar"><option value="">Solo esta semana</option><option value="materia">Todas las semanas de esta materia</option><option value="programa">Todas las semanas del programa</option></select><small>Útil cuando varias semanas comparten la misma estructura de entrega. No copia los recursos ni la autoevaluación.</small></label>' +
      '<div class="acciones" style="margin-top:14px"><button class="btn naranja" data-guardar>Guardar semana</button></div></section>');
    $$('[data-pest]').forEach(b => b.onclick = () => { $$('[data-pest]').forEach(x => x.classList.toggle('activo', x === b)); $$('[data-panel]').forEach(p => p.classList.toggle('oculto', p.dataset.panel !== b.dataset.pest)); });
    pintarCasillas(); pintarRubrica(); pintarAuto();
    $('#add-c').onclick = () => { casillas.push({ titulo: '', instruccion: '', explicacion: '', ejemplo: '', pauta: '', palabras_max: '' }); pintarCasillas(); };
    $('#add-r').onclick = () => { rubrica.push({ criterio: '', peso: 0, destacado: '', logrado: '', en_desarrollo: '', insuficiente: '' }); pintarRubrica(); };
    $('#add-a').onclick = () => { auto.push({ pregunta: '', opciones: '', correcta: 1, explicacion: '' }); pintarAuto(); };
    $$('[data-guardar]').forEach(b => b.onclick = async () => {
      const sem = Object.assign({}, s);
      $$('[data-s]').forEach(i => { sem[i.dataset.s] = i.type === 'checkbox' ? i.checked : i.value; });
      const replicar = $('#replicar').value;
      if (replicar && !await confirmar('Se reemplazará la ficha y la rúbrica de ' + (replicar === 'materia' ? 'todas las semanas de esta materia' : 'todas las semanas del programa') + '. ¿Continuar?', 'Sí, copiar')) return;
      try {
        const r = await api('guardarSemana', { semana: sem, casillas, rubrica, autoevaluacion: auto, replicar });
        toast('Semana guardada' + (r.replicadas ? ' y copiada a ' + r.replicadas + ' semanas más' : '') + '.');
      } catch (er) { toast(er.message, true); }
    });
  }

  /* =================== GESTIÓN =================== */
  async function vResumenGestion() {
    const d = await api('resumenGestion');
    const c = (n, t, url, alerta) => n === null || n === undefined ? '' : '<a class="cifra' + (alerta && n ? ' alerta' : '') + '" href="' + url + '" style="text-decoration:none"><b>' + n + '</b><span>' + t + '</span></a>';
    vista('<div class="encabezado-vista"><div><h1>Gestión</h1><p>Última sincronización con inscripciones: ' + h(d.ultimaSincronizacion || 'sin registro') + '</p></div>' +
      (tiene('gestion_administrativa') ? '<button class="btn claro" id="btn-sync">Sincronizar matrículas ahora</button>' : '') + '</div>' +
      '<div class="rejilla r4">' + c(d.matriculasActivas, 'Matrículas activas', '#/matriculas') + c(d.estudiantes, 'Estudiantes', '#/matriculas') + c(d.porCorregir, 'Entregas por corregir', '#/bandeja', true) +
      c(d.solicitudes, 'Solicitudes pendientes', '#/solicitudes-gestion', true) + c(d.mensajes, 'Conversaciones sin leer', '#/mensajes', true) + c(d.semanasSinMaterial, 'Semanas sin material listo', '#/programas') + '</div>');
    if ($('#btn-sync')) $('#btn-sync').onclick = async ev => { ev.target.disabled = true; try { const r = await api('sincronizar'); toast(r.mensaje); vResumenGestion(); } catch (er) { toast(er.message, true); ev.target.disabled = false; } };
  }

  async function vMatriculas() {
    const [lista, progs] = await Promise.all([api('matriculas', {}), api('programas').catch(() => [])]);
    S.datos.programas = progs;
    vista('<div class="encabezado-vista"><div><h1>Matrículas</h1><p>' + lista.length + ' matrículas.</p></div><div class="acciones"><button class="btn claro" id="btn-xlsx-mat">Exportar</button><button class="btn naranja" id="btn-manual">Matrícula manual</button></div></div>' +
      '<div class="filtros"><input type="search" id="f-q" placeholder="Buscar por nombre, correo, documento o programa"><select id="f-est"><option value="">Todos los estados</option>' + ['Activa', 'Congelada', 'Aprobada', 'Finalizada', 'Retirada', 'No finalizada', 'Anulada'].map(x => '<option>' + x + '</option>').join('') + '</select></div>' +
      '<div class="tabla-cont"><table class="tabla"><thead><tr><th>Estudiante</th><th>Programa</th><th>Inicio</th><th>Término</th><th class="num">Avance</th><th>Estado</th><th>Último ingreso</th><th></th></tr></thead><tbody id="tb-mat"></tbody></table></div>');
    const pintar = () => {
      const q = $('#f-q').value.toLowerCase(), est = $('#f-est').value;
      const f = lista.filter(m => (!est || m.estado === est) && (!q || (m.estudiante + ' ' + m.correo + ' ' + m.documento + ' ' + m.nombrePrograma).toLowerCase().indexOf(q) >= 0));
      $('#tb-mat').innerHTML = f.map(m => '<tr><td><b>' + h(m.estudiante) + '</b><br><small>' + h(m.correo) + (m.documento ? ' · ' + h(m.documento) : '') + '</small></td><td>' + h(m.nombrePrograma) + '</td><td>' + fecha(m.inicio) + '</td><td>' + fecha(m.termino) + '</td><td class="num">' + (m.semanas ? m.enviadas + '/' + m.semanas : '') + '</td><td>' + etqEstado(m.estado) + '</td><td>' + (m.ultimoIngreso ? haceCuanto(m.ultimoIngreso) : '<small>Nunca</small>') + '</td><td><button class="btn claro chico" data-ed="' + m.id + '">Editar</button></td></tr>').join('') || '<tr><td colspan="8">' + vacio('Sin resultados') + '</td></tr>';
      $$('[data-ed]').forEach(b => b.onclick = () => editarMatricula(lista.find(x => x.id === b.dataset.ed)));
    };
    $('#f-q').oninput = pintar; $('#f-est').onchange = pintar; pintar();
    $('#btn-manual').onclick = () => {
      const m = modal('<div class="modal-cab"><h3>Matrícula manual</h3><button class="cerrar" data-cerrar>×</button></div><p style="color:var(--gris);font-size:14px">Para convenios o casos especiales. Si la persona no tiene cuenta, se crea y se le envían sus credenciales. Las inscripciones del sitio llegan solas.</p><form>' +
        '<div class="fila-campos"><label class="campo"><span>Nombres</span><input type="text" name="nombres" required></label><label class="campo"><span>Apellidos</span><input type="text" name="apellidos" required></label></div>' +
        '<div class="fila-campos"><label class="campo"><span>Correo</span><input type="email" name="correo" required></label><label class="campo"><span>RUT o documento</span><input type="text" name="documento"></label></div>' +
        '<label class="campo"><span>Programa</span><select name="programa">' + progs.map(p => '<option value="' + p.cod + '">' + h(p.nombre) + '</option>').join('') + '</select><small>Si eliges un Master Profesional, se matricula también en sus diplomados, la Metodología y el paper.</small></label>' +
        '<div class="fila-campos"><label class="campo"><span>Inicio</span><input type="date" name="inicio" required></label><label class="campo"><span>Término (opcional)</span><input type="date" name="termino"><small>Si lo dejas vacío, se calcula según el tipo de programa.</small></label></div>' +
        '<button class="btn naranja">Matricular y enviar credenciales</button></form>');
      const f = m.el.querySelector('form');
      f.onsubmit = async e => {
        e.preventDefault();
        try { const r = await api('matriculaManual', { nombres: f.nombres.value, apellidos: f.apellidos.value, correo: f.correo.value, documento: f.documento.value, programa: f.programa.value, inicio: f.inicio.value + 'T12:00:00', termino: f.termino.value ? f.termino.value + 'T23:00:00' : '' }); m.cerrar(); toast('Matriculado en ' + r.programas.length + ' programa' + (r.programas.length > 1 ? 's' : '') + '.'); vMatriculas(); }
        catch (er) { toast(er.message, true); }
      };
    };
    $('#btn-xlsx-mat').onclick = async () => {
      const XLSX = await XLSXlib(); const lb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(lb, XLSX.utils.json_to_sheet(lista.map(m => ({ Estudiante: m.estudiante, Correo: m.correo, Documento: m.documento, Programa: m.nombrePrograma, Código: m.programa, Inicio: m.inicio ? new Date(m.inicio) : '', Término: m.termino ? new Date(m.termino) : '', Estado: m.estado, 'Semanas enviadas': m.enviadas, Semanas: m.semanas, 'Último ingreso': m.ultimoIngreso ? new Date(m.ultimoIngreso) : '' }))), 'Matrículas');
      XLSX.writeFile(lb, 'Matrículas eFacultad.xlsx');
    };
  }
  function editarMatricula(m) {
    const dt = iso => iso ? new Date(iso).toISOString().slice(0, 10) : '';
    const md = modal('<div class="modal-cab"><h3>' + h(m.estudiante) + '</h3><button class="cerrar" data-cerrar>×</button></div><p style="color:var(--gris)">' + h(m.nombrePrograma) + '</p><form>' +
      '<label class="campo"><span>Estado</span><select name="estado">' + ['Activa', 'Congelada', 'Aprobada', 'Finalizada', 'Retirada', 'No finalizada', 'Anulada'].map(x => '<option' + (x === m.estado ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></label>' +
      '<div class="fila-campos"><label class="campo"><span>Inicio</span><input type="date" name="inicio" value="' + dt(m.inicio) + '"></label><label class="campo"><span>Término</span><input type="date" name="termino" value="' + dt(m.termino) + '"></label></div>' +
      '<div class="acciones"><button class="btn naranja">Guardar</button><button type="button" class="btn claro" id="btn-cred">Reenviar credenciales</button></div></form>');
    const f = md.el.querySelector('form');
    f.onsubmit = async e => { e.preventDefault(); try { await api('actualizarMatricula', { id: m.id, estado: f.estado.value, inicio: f.inicio.value ? f.inicio.value + 'T12:00:00' : '', termino: f.termino.value ? f.termino.value + 'T23:00:00' : '' }); md.cerrar(); toast('Matrícula actualizada.'); vMatriculas(); } catch (er) { toast(er.message, true); } };
    md.el.querySelector('#btn-cred').onclick = async () => { if (!await confirmar('¿Generar una nueva clave temporal y enviarla a ' + m.correo + '?', 'Enviar')) return; try { await api('reenviarCredenciales', { id: m.usuario_id }); toast('Credenciales enviadas.'); } catch (er) { toast(er.message, true); } };
  }

  async function vCuentas() {
    const lista = await api('usuarios', {});
    const ROLES = [['estudiante', 'Estudiante'], ['docente', 'Docente'], ['academico', 'Gestión académica'], ['administrativo', 'Gestión administrativa'], ['admin', 'Administrador']];
    vista('<div class="encabezado-vista"><div><h1>Cuentas</h1><p>' + lista.length + ' cuentas. Los estudiantes se crean solos al matricularse; aquí creas al equipo.</p></div><button class="btn naranja" id="btn-nueva">Nueva cuenta</button></div>' +
      '<div class="filtros"><input type="search" id="f-q" placeholder="Buscar"><select id="f-rol"><option value="">Todos los roles</option>' + ROLES.map(r => '<option value="' + r[0] + '">' + r[1] + '</option>').join('') + '</select></div>' +
      '<div class="tabla-cont"><table class="tabla"><thead><tr><th>Persona</th><th>Roles</th><th class="num">Matrículas</th><th>Último ingreso</th><th>Estado</th><th></th></tr></thead><tbody id="tb-u"></tbody></table></div>');
    const pintar = () => {
      const q = $('#f-q').value.toLowerCase(), rol = $('#f-rol').value;
      $('#tb-u').innerHTML = lista.filter(u => (!rol || u.roles.indexOf(rol) >= 0) && (!q || (u.nombre + ' ' + u.correo + ' ' + u.documento).toLowerCase().indexOf(q) >= 0))
        .map(u => '<tr><td><b>' + h(u.nombre) + '</b><br><small>' + h(u.correo) + '</small></td><td>' + u.roles.map(r => '<span class="etq azul" style="margin:1px">' + h((ROLES.find(x => x[0] === r) || [r, r])[1]) + '</span>').join(' ') + '</td><td class="num">' + u.matriculas + '</td><td>' + (u.ultimoIngreso ? haceCuanto(u.ultimoIngreso) : '<small>Nunca</small>') + '</td><td>' + (u.activo ? '<span class="etq verde">Activa</span>' : '<span class="etq rojo">Inactiva</span>') + '</td><td><button class="btn claro chico" data-u="' + u.id + '">Editar</button></td></tr>').join('');
      $$('[data-u]').forEach(b => b.onclick = () => form(lista.find(x => x.id === b.dataset.u)));
    };
    const form = u => {
      const nuevo = !u; u = u || { nombres: '', apellidos: '', correo: '', documento: '', roles: ['docente'], activo: true };
      const m = modal('<div class="modal-cab"><h3>' + (nuevo ? 'Nueva cuenta' : h(u.nombre)) + '</h3><button class="cerrar" data-cerrar>×</button></div><form>' +
        '<div class="fila-campos"><label class="campo"><span>Nombres</span><input type="text" name="nombres" value="' + h(u.nombres) + '" required></label><label class="campo"><span>Apellidos</span><input type="text" name="apellidos" value="' + h(u.apellidos) + '"></label></div>' +
        '<div class="fila-campos"><label class="campo"><span>Correo</span><input type="email" name="correo" value="' + h(u.correo) + '"' + (nuevo ? ' required' : ' disabled') + '></label><label class="campo"><span>Documento</span><input type="text" name="documento" value="' + h(u.documento) + '"></label></div>' +
        '<div class="campo"><span style="display:block;font-size:13px;font-weight:600;color:var(--noche);margin-bottom:5px">Roles</span>' + ROLES.map(r => '<label class="check" style="margin:5px 0"><input type="checkbox" name="rol" value="' + r[0] + '"' + (u.roles.indexOf(r[0]) >= 0 ? ' checked' : '') + '> ' + r[1] + '</label>').join('') + '</div>' +
        (nuevo ? '' : '<label class="check" style="margin:10px 0"><input type="checkbox" name="activo"' + (u.activo ? ' checked' : '') + '> Cuenta activa</label>') +
        '<div class="acciones" style="margin-top:14px"><button class="btn naranja">' + (nuevo ? 'Crear y enviar credenciales' : 'Guardar') + '</button>' + (nuevo ? '' : '<button type="button" class="btn claro" id="btn-cred">Reenviar credenciales</button>') + '</div></form>');
      const f = m.el.querySelector('form');
      f.onsubmit = async e => {
        e.preventDefault();
        try { await api('guardarUsuario', { id: nuevo ? '' : u.id, nombres: f.nombres.value, apellidos: f.apellidos.value, correo: f.correo.value, documento: f.documento.value, roles: $$('input[name=rol]', f).filter(i => i.checked).map(i => i.value), activo: nuevo ? true : f.activo.checked }); m.cerrar(); toast('Cuenta guardada.'); vCuentas(); }
        catch (er) { toast(er.message, true); }
      };
      if (!nuevo) m.el.querySelector('#btn-cred').onclick = async () => { if (!await confirmar('¿Generar una nueva clave temporal y enviarla a ' + u.correo + '?', 'Enviar')) return; try { await api('reenviarCredenciales', { id: u.id }); toast('Credenciales enviadas.'); } catch (er) { toast(er.message, true); } };
    };
    $('#f-q').oninput = pintar; $('#f-rol').onchange = pintar; pintar();
    $('#btn-nueva').onclick = () => form(null);
  }

  async function vSolicitudesGestion() {
    const estado = S.datos.filtroSol || 'Pendiente';
    const lista = await api('solicitudes', { estado });
    vista('<div class="encabezado-vista"><div><h1>Solicitudes</h1><p>' + lista.length + ' ' + (estado === 'Pendiente' ? 'pendientes' : 'solicitudes') + '.</p></div><select id="f-sol"><option value="Pendiente">Pendientes</option><option value="Aprobada">Aprobadas</option><option value="Rechazada">Rechazadas</option><option value="Todas">Todas</option></select></div>' +
      (lista.length ? '<div class="tabla-cont"><table class="tabla"><thead><tr><th>Tipo</th><th>Estudiante</th><th>Programa</th><th>Detalle</th><th>Fecha</th><th>Estado</th><th></th></tr></thead><tbody>' +
        lista.map(s => '<tr><td><b>' + h(s.tipo) + '</b>' + (s.tipo === 'Certificado' && s.final ? '<br>' + notaHtml(s.final) : '') + '</td><td>' + h(s.estudiante) + '<br><small>' + h(s.correo) + '</small></td><td>' + h(s.programa) + '<br><small>Término ' + fecha(s.termino) + '</small></td><td style="white-space:pre-wrap;max-width:280px">' + h(s.detalle) + '</td><td>' + fecha(s.creado) + '</td><td>' + etqEstado(s.estado) + (s.respuesta ? '<br><small>' + h(s.respuesta) + '</small>' : '') + '</td><td>' + (s.estado === 'Pendiente' ? '<button class="btn naranja chico" data-res="' + s.id + '">Resolver</button>' : '') + '</td></tr>').join('') + '</tbody></table></div>'
        : vacio('No hay solicitudes ' + (estado === 'Pendiente' ? 'pendientes' : ''), '')));
    $('#f-sol').value = estado; $('#f-sol').onchange = e => { S.datos.filtroSol = e.target.value; vSolicitudesGestion(); };
    $$('[data-res]').forEach(b => b.onclick = () => {
      const s = lista.find(x => x.id === b.dataset.res);
      const m = modal('<div class="modal-cab"><h3>' + h(s.tipo) + ' · ' + h(s.estudiante) + '</h3><button class="cerrar" data-cerrar>×</button></div><p>' + h(s.programa) + '</p>' + (s.detalle ? '<div class="solo-lectura" style="margin-bottom:12px">' + h(s.detalle) + '</div>' : '') +
        (s.tipo === 'Certificado' ? '<div class="aviso ' + (s.aprobado ? 'ok' : 'error') + '">' + (s.aprobado ? 'Cumple los requisitos. Al aprobar se emite el certificado con folio, se envía por correo' + (/^g\d/.test(s.cod) ? ' y se genera su código de beca de 50%' : '') + '.' : 'No cumple los requisitos de aprobación.') + '</div>' : '') +
        (s.tipo === 'Prórroga' ? '<label class="campo"><span>Días de prórroga</span><input type="number" id="dias" value="' + (/^m\d+$/.test(s.cod) ? 90 : 60) + '"></label>' : '') +
        '<label class="campo"><span>Respuesta al estudiante</span><textarea id="resp" placeholder="Obligatoria si rechazas."></textarea></label>' +
        '<div class="acciones" style="justify-content:flex-end"><button class="btn peligro" data-r="Rechazada">Rechazar</button><button class="btn verde" data-r="Aprobada">Aprobar</button></div>');
      $$('[data-r]', m.el).forEach(x => x.onclick = async () => {
        x.disabled = true;
        try { const r = await api('resolverSolicitud', { id: s.id, estado: x.dataset.r, respuesta: m.el.querySelector('#resp').value, dias: m.el.querySelector('#dias') ? Number(m.el.querySelector('#dias').value) : '' }); m.cerrar(); toast('Solicitud ' + x.dataset.r.toLowerCase() + (r.detalle ? ': ' + r.detalle : '.')); vSolicitudesGestion(); }
        catch (er) { toast(er.message, true); x.disabled = false; }
      });
    });
  }

  async function vCrm() {
    vista('<h1>CRM</h1>' + cargando('Reuniendo inscripciones, fichas y consultas'));
    const d = await api('crm');
    const P = d.personas;
    const paises = Array.from(new Set(P.map(p => p.pais).filter(Boolean))).sort();
    const estados = Array.from(new Set([].concat.apply([], P.map(p => p.estados)))).filter(Boolean).sort();
    const nombreProg = c => (d.programas.find(p => p.cod === c) || {}).nombre || c;
    vista('<div class="encabezado-vista"><div><h1>CRM</h1><p>Todas las personas que se han inscrito, consultado o suscrito. ' + P.length + ' en total.</p></div><button class="btn claro" id="btn-xlsx-crm">Exportar a planilla</button></div>' +
      '<div class="filtros"><input type="search" id="c-q" placeholder="Buscar por nombre, correo, empresa, cargo…"><select id="c-prog"><option value="">Todos los programas</option>' + d.programas.map(p => '<option value="' + p.cod + '">' + h(p.nombre) + '</option>').join('') + '</select>' +
      '<select id="c-est"><option value="">Todos los estados</option>' + estados.map(x => '<option>' + h(x) + '</option>').join('') + '</select><select id="c-pais"><option value="">Todos los países</option>' + paises.map(x => '<option>' + h(x) + '</option>').join('') + '</select>' +
      '<select id="c-extra"><option value="">Sin filtro extra</option><option value="bolsa">En bolsa de empleo</option><option value="vox">Suscritos a Vox Liber</option><option value="cmia">Suscritos a Cuadernos CMIA</option><option value="cuenta">Con cuenta en la eFacultad</option><option value="consulta">Solo consultas, sin inscripción</option></select></div>' +
      '<p id="c-cuenta" style="color:var(--gris);font-size:13px"></p><div class="tabla-cont"><table class="tabla"><thead><tr><th>Persona</th><th>Empresa y cargo</th><th>País</th><th>Programas</th><th>Estado</th><th>Última actividad</th></tr></thead><tbody id="c-tb"></tbody></table></div>');
    let filtradas = P;
    const si = v => /^s[ií]|activ/i.test(String(v || ''));
    const pintar = () => {
      const q = $('#c-q').value.toLowerCase(), pr = $('#c-prog').value, es = $('#c-est').value, pa = $('#c-pais').value, ex = $('#c-extra').value;
      filtradas = P.filter(p => (!q || [p.nombre, p.correo, p.empresa, p.cargo, p.documento, p.profesion, p.ciudad].join(' ').toLowerCase().indexOf(q) >= 0) && (!pr || p.programas.indexOf(pr) >= 0) &&
        (!es || p.estados.indexOf(es) >= 0) && (!pa || p.pais === pa) && (!ex || (ex === 'bolsa' ? si(p.bolsa) : ex === 'vox' ? si(p.vox) : ex === 'cmia' ? si(p.cmia) : ex === 'cuenta' ? p.cuenta : !p.inscripciones.length)));
      $('#c-cuenta').textContent = filtradas.length + ' persona' + (filtradas.length === 1 ? '' : 's');
      $('#c-tb').innerHTML = filtradas.slice(0, 500).map((p, i) => '<tr class="clic" data-i="' + P.indexOf(p) + '"><td><b>' + h(p.nombre || '(sin nombre)') + '</b><br><small>' + h(p.correo) + (p.telefono ? ' · ' + h(p.telefono) : '') + '</small></td><td>' + h(p.empresa) + (p.cargo ? '<br><small>' + h(p.cargo) + '</small>' : '') + '</td><td>' + h(p.pais) + '</td><td>' + p.programas.slice(0, 3).map(c => '<span class="etq" style="margin:1px">' + h(c) + '</span>').join(' ') + (p.programas.length > 3 ? ' +' + (p.programas.length - 3) : '') + '</td><td>' + p.estados.map(e => '<span class="etq ' + (/pagad|inscrit|becad/i.test(e) ? 'verde' : /pendiente|evaluaci/i.test(e) ? 'naranja' : '') + '" style="margin:1px">' + h(e) + '</span>').join(' ') + '</td><td>' + fecha(p.ultima) + '</td></tr>').join('') +
        (filtradas.length > 500 ? '<tr><td colspan="6"><small>Se muestran 500; exporta para ver todas.</small></td></tr>' : '');
      $$('#c-tb tr.clic').forEach(tr => tr.onclick = () => ficha(P[tr.dataset.i]));
    };
    const ficha = p => {
      const filas = [['Correo', p.correo], ['Teléfono', p.telefono], ['Documento', p.documento], ['Nacionalidad', p.nacionalidad], ['País y ciudad', [p.pais, p.ciudad].filter(Boolean).join(', ')], ['Nivel educacional', p.nivel], ['Profesión', p.profesion],
        ['Empresa', p.empresa], ['Cargo', p.cargo], ['Sector', p.sector], ['Cómo nos conoció', p.como], ['Vox Liber', p.vox], ['Cuadernos CMIA', p.cmia], ['Bolsa de empleo', p.bolsa], ['Cuenta eFacultad', p.cuenta ? 'Sí' + (p.ultimoIngreso ? ', último ingreso ' + fecha(p.ultimoIngreso) : ', sin ingresos') : 'No'], ['Consultas', p.consultas], ['Pagado', p.pagado ? '$' + p.pagado.toLocaleString('es-CL') : '']].filter(x => x[1] !== '' && x[1] !== undefined && x[1] !== 0);
      modal('<div class="modal-cab"><div><h3 style="margin:0">' + h(p.nombre) + '</h3><small style="color:var(--gris)">Primera actividad ' + fecha(p.primera) + '</small></div><button class="cerrar" data-cerrar>×</button></div>' +
        '<table class="tabla">' + filas.map(x => '<tr><td style="color:var(--gris);width:38%">' + h(x[0]) + '</td><td>' + h(x[1]) + '</td></tr>').join('') + '</table>' +
        (p.cv ? '<p style="margin-top:10px"><a class="btn claro chico" href="' + h(p.cv) + '" target="_blank" rel="noopener">Ver CV</a></p>' : '') +
        '<h4 style="margin-top:16px">Inscripciones</h4>' + (p.inscripciones.length ? '<table class="tabla"><thead><tr><th>Fecha</th><th>Programa</th><th>Estado</th><th class="num">Monto</th></tr></thead><tbody>' + p.inscripciones.map(x => '<tr><td>' + fecha(x.fecha) + '</td><td>' + h(x.programa || nombreProg(x.cod)) + '</td><td>' + h(x.estado) + '</td><td class="num">' + (x.monto ? '$' + x.monto.toLocaleString('es-CL') : '') + (x.descuento ? '<br><small>' + h(x.descuento) + '% dcto.</small>' : '') + '</td></tr>').join('') + '</tbody></table>' : '<p style="color:var(--gris)">Sin inscripciones.</p>') +
        '<div class="acciones" style="margin-top:14px">' + (p.correo ? '<a class="btn claro chico" href="mailto:' + h(p.correo) + '">Escribir correo</a>' : '') + (p.telefono ? '<a class="btn claro chico" href="https://wa.me/' + h(String(p.telefono).replace(/\D/g, '')) + '" target="_blank" rel="noopener">WhatsApp</a>' : '') + '</div>', 'ancho');
    };
    ['#c-q', '#c-prog', '#c-est', '#c-pais', '#c-extra'].forEach(s => $(s).addEventListener(s === '#c-q' ? 'input' : 'change', pintar));
    pintar();
    $('#btn-xlsx-crm').onclick = async () => {
      const XLSX = await XLSXlib(); const lb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(lb, XLSX.utils.json_to_sheet(filtradas.map(p => ({ Nombre: p.nombre, Correo: p.correo, Teléfono: p.telefono, Documento: p.documento, Nacionalidad: p.nacionalidad, País: p.pais, Ciudad: p.ciudad,
        'Nivel educacional': p.nivel, Profesión: p.profesion, Empresa: p.empresa, Cargo: p.cargo, Sector: p.sector, 'Cómo nos conoció': p.como, Programas: p.programas.join(', '), Estados: p.estados.join(', '),
        'Monto pagado': p.pagado, Consultas: p.consultas, 'Vox Liber': p.vox, 'Cuadernos CMIA': p.cmia, 'Bolsa de empleo': p.bolsa, CV: p.cv, 'Cuenta eFacultad': p.cuenta ? 'Sí' : 'No',
        'Primera actividad': p.primera ? new Date(p.primera) : '', 'Última actividad': p.ultima ? new Date(p.ultima) : '' }))), 'Personas');
      XLSX.writeFile(lb, 'CRM IDEAX ' + new Date().toISOString().slice(0, 10) + '.xlsx');
    };
  }

  /* =================== arranque =================== */
  S.token = leer('ef_token');
  window.addEventListener('hashchange', router);
  document.addEventListener('click', e => { const a = e.target.closest('a[href^="#/"]'); if (a && a.getAttribute('href') === location.hash) { e.preventDefault(); router(); } });
  router();
})();
