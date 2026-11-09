/* =====================================================================
   IDEAX · código común del sitio (www.ideax.cl)
   Lo usan el home y las páginas internas. Cada bloque revisa que sus
   elementos existan en la página antes de activarse.
   ===================================================================== */
/* Raíz del sitio, calculada desde la ubicación de este archivo (assets/ideax.js) */
const RAIZ = (()=>{ try{ return new URL("..", document.currentScript.src).href; }catch(e){ return "/"; } })();

/* Lleva a la inscripción con el programa elegido: en la misma página si tiene el
   formulario, o a www.ideax.cl/inscripcion/?curso=codigo si no lo tiene */
function irAInscripcion(cod, modo, beca){
  if(document.getElementById("formulario")){
    ponerModo(modo || "inscribir");
    if(cod) $("#f-programa").value = cod;
    if(beca) fBeca.checked = true;
    actualizarPrograma(); mostrarElegido();
    document.getElementById("inscripcion").scrollIntoView({behavior:"smooth"});
    return;
  }
  const p = new URLSearchParams();
  if(cod) p.set("curso", cod);
  if(modo === "info") p.set("modo", "info");
  if(beca) p.set("beca", "1");
  location.href = RAIZ + "inscripcion/" + (String(p) ? "?" + p : "");
}

/* ===== Configuración: correo que recibe las solicitudes ===== */
const CONFIG = {
  /* Correo público que se muestra en el sitio */
  correo: "contacto@ideax.cl",
  /* URL de la aplicación web de Apps Script para verificar certificados (termina en /exec) */
  verificacionURL: "https://script.google.com/macros/s/AKfycbxKpKOfwdGAso0n0BKhE-VmpYzGJSV_4_gZbdjREqmJG6PPeGVwFMDI0Vrl4MXbHGqz/exec",
  /* URL de la aplicación web de Apps Script que recibe las inscripciones, avisa a
     contacto@ideax.cl y leyton.johns@gmail.com y envía el brochure al interesado */
  /* URL del servicio de la eFacultad (termina en /exec): recibe las solicitudes de copia del titular */
  efacultadURL: "https://script.google.com/macros/s/AKfycbz5hhUDvyM21k791WqN1tOYgsJs-9FOH9XRMZ1iGm3kVl2rWrZ-FTJQNR43saUDBVcUCQ/exec",
  inscripcionURL: "https://script.google.com/macros/s/AKfycbyhMvyQAi7qwIBpXZiUrUv5HE4miSm-pAxajWbPNO7UQUJ_lEAumtaZSSEUEURCT9QJ/exec"
};

const PROGRAMAS = {
  ia:{ color:"#F07C1B", foto:RAIZ+"img/prog-ia.jpg",
    titulo:"IA Aplicada a los Negocios",
    bajada:"De los problemas empresariales a las soluciones inteligentes. Diseñas, construyes y validas una solución con inteligencia artificial para tu propia organización.",
    datos:[["8 semanas","1 sesión en vivo semanal"],["+1 hora semanal","Trabajo personalizado con el docente"],["Herramientas gratuitas","Sin suscripciones pagadas"]],
    dirigido:"Profesionales y jefaturas de cualquier área que quieren usar la inteligencia artificial para resolver un problema concreto de su trabajo, sin necesidad de saber programar.",
    logros:["Elegir las herramientas de IA adecuadas y darles instrucciones precisas","Validar la información que entrega una IA antes de decidir","Revisar si tu problema ya tiene solución y qué hará distinta la tuya","Llegar a un prototipo funcional y medir si mejora la situación inicial"],
    semanas:[["El problema y su línea base","Eliges un problema real de tu organización y mides cómo está hoy."],["Herramientas e instrucciones","Panorama de herramientas de IA y técnica de instrucciones efectivas."],["Validar y vigilar","Verificación de fuentes, benchmarking y vigilancia tecnológica."],["Diseño lógico de la solución","Qué hará la solución, con qué datos y en qué pasos."],["Construcción asistida","De la lógica al código con apoyo de IA, aunque no programes."],["Primera versión funcional","Pruebas con usuarios reales y corrección de errores."],["Evidencia de mejora","Procesas los datos con IA y comparas contra la línea base."],["Presentación de la beta","Muestras la solución funcionando y entregas el informe final."]],
    final:"Una versión beta funcional de tu solución, presentada en vivo, más un informe breve con el problema, la solución, la evidencia de mejora y el uso que hiciste de la IA."},
  td:{ color:"#1D4E89", foto:RAIZ+"img/prog-decisiones.jpg",
    titulo:"Toma de Decisiones Gerenciales",
    bajada:"Dirigir, decidir y competir. Cada semana tomas decisiones de gerencia en un simulador de negocios construido con magnitudes reales del mercado chileno, y respondes por sus resultados.",
    datos:[["8 semanas","1 sesión en vivo semanal"],["8 decisiones","Una por semana en el simulador"],["Individual o en equipo","Según la cohorte"]],
    dirigido:"Profesionales, jefaturas y emprendedores que toman o tomarán decisiones comerciales y quieren practicarlas con consecuencias medibles.",
    logros:["Leer una industria y su información de mercado antes de decidir","Asignar presupuesto entre precio, marketing, ventas y canales","Registrar y justificar cada decisión, también cuando el resultado no acompaña","Comunicar resultados a la gerencia general en un resumen ejecutivo"],
    semanas:[["El caso y la industria","Contexto, competidores y estadísticas del mercado."],["Primera decisión","Precio, marketing y fuerza de ventas con el presupuesto inicial."],["Información de mercado","Qué informes comprar, cómo leerlos y cuánto pagar por ellos."],["Presupuesto comprometido","Te comprometes ante el directorio con una meta de ventas."],["Competencia y eventos","El mercado cambia: reaccionar sin perder el rumbo."],["Ética y libre competencia","Decisiones bajo regulación y el límite de lo aceptable."],["Resultados financieros","Márgenes, caja y crédito como consecuencia de lo decidido."],["Resumen ejecutivo","Balance de las ocho decisiones ante la gerencia general."]],
    final:"Un resumen ejecutivo para la gerencia general que explica la estrategia seguida, los resultados obtenidos en la simulación y lo que harías distinto."},
  op:{ color:"#14947F", foto:RAIZ+"img/prog-operaciones.jpg",
    titulo:"Dirección Estratégica de Operaciones y Supply Chain",
    bajada:"De la eficiencia operacional a la ventaja competitiva. Trabajas la cadena de suministro de una gran empresa de retail con datos, indicadores y decisiones.",
    datos:[["8 semanas","1 sesión en vivo semanal"],["Caso de retail","Cifras reales y actualizadas"],["Roles de gerencia","Logística, inventario, compras y distribución"]],
    dirigido:"Profesionales de logística, compras, operaciones y comercial, y jefaturas que necesitan entender la cadena de suministro como un todo.",
    logros:["Ver la cadena de suministro como un sistema","Decidir inventario y compras con base en la demanda","Medir la productividad de personas, equipos y almacenes","Construir un tablero de indicadores logísticos para la dirección"],
    semanas:[["La cadena como sistema","Caso base: organigrama, dotación y operación de una gran cadena de retail."],["Demanda y pronóstico","Cuánto se va a vender y con qué margen de error."],["Gestión de inventario","Stock de seguridad, rotación y costo de mantener."],["Compras y abastecimiento","Proveedores, negociación y nivel de servicio."],["Almacenamiento","Capacidad, layout y productividad de centros de distribución."],["Transporte y distribución","Rutas, flota y costo por entrega."],["Indicadores y tablero","Los indicadores que una gerencia de operaciones debe mirar."],["Plan estratégico","Propuesta de mejora para la operación del caso."]],
    final:"Un plan estratégico de operaciones para la empresa del caso, con diagnóstico, indicadores y propuestas cuantificadas."},
  al:{ color:"#6E3A9C", foto:RAIZ+"img/prog-artes.jpg",
    titulo:"Artes Liberales Aplicadas a la Administración y la Economía",
    bajada:"Pensar mejor para dirigir mejor. Filosofía, ética, historia y pensamiento científico al servicio de las decisiones empresariales y económicas.",
    datos:[["8 semanas","1 sesión en vivo semanal"],["Lecturas clásicas","Aplicadas a casos actuales"],["Pensamiento crítico","Argumentar y defender criterios"]],
    dirigido:"Profesionales y directivos que quieren entender el mercado, el consumo y la tecnología con más profundidad que la que entregan las herramientas de gestión.",
    logros:["Leer el mercado y el consumo con categorías de la filosofía y la sociología","Discutir los dilemas éticos de la empresa con argumentos","Evaluar los riesgos y desafíos de las nuevas tecnologías y la IA","Escribir y defender una posición propia sobre un problema de gestión"],
    semanas:[["Para qué pensar","El lugar de las humanidades en la gestión y la economía."],["El orden del mercado","Adam Smith y los fundamentos del liberalismo económico."],["Consumo y distinción","Bourdieu: capital cultural, gusto y marcas."],["Poder y organización","Foucault: disciplina, control y vigilancia en la empresa."],["Rendimiento y cansancio","Byung-Chul Han y la sociedad del rendimiento."],["Libertad e interés propio","Ayn Rand, el anarcocapitalismo y sus críticos."],["Tecnología e IA","Riesgos, promesas y responsabilidades de las nuevas tecnologías."],["Ensayo y defensa","Presentas y defiendes tu posición ante el grupo."]],
    final:"Un ensayo aplicado sobre un problema real de administración o economía, analizado desde los autores del programa y defendido en la última sesión."}
};

const $ = s => document.querySelector(s);
const ficha = $("#ficha");
let actual = "";

function abrir(id){
  const p = PROGRAMAS[id]; if(!p) return;
  actual = id;
  ficha.style.setProperty("--c", p.color);
  $("#ficha-cabeza").style.backgroundImage = `url('${p.foto}')`;
  $("#ficha-titulo").textContent = p.titulo;
  $("#ficha-bajada").textContent = p.bajada;
  $("#ficha-datos").innerHTML = p.datos.map(d=>`<div><b>${d[0]}</b>${d[1]}</div>`).join("");
  $("#ficha-conv").innerHTML = htmlConv(id);
  const fb = $("#ficha-bro"); if(BROCHURES && BROCHURES[id]){ fb.href = BROCHURES[id]; fb.hidden = false; } else fb.hidden = true;
  $("#ficha-sim").innerHTML = `<h5>Valor y simulación con beca</h5>${simulacion(id)}`; activarBecaProg($("#ficha-sim"));
  $("#ficha-dirigido").textContent = p.dirigido;
  $("#ficha-logros").innerHTML = p.logros.map(l=>`<li>${l}</li>`).join("");
  $("#ficha-semanas").innerHTML = p.semanas.map(s=>`<li><div><b>${s[0]}</b><span>${s[1]}</span></div></li>`).join("");
  $("#ficha-final").textContent = p.final;
  if(typeof ficha.showModal === "function") ficha.showModal(); else ficha.setAttribute("open","");
  ficha.scrollTop = 0;
}
function cerrar(){ if(ficha && ficha.open){ ficha.close ? ficha.close() : ficha.removeAttribute("open"); } }

document.querySelectorAll(".programa").forEach(c=>{
  c.addEventListener("click",()=>abrir(c.dataset.programa));
  c.addEventListener("keydown",e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); abrir(c.dataset.programa); } });
});
document.querySelectorAll("[data-abrir]").forEach(a=>a.addEventListener("click",e=>{ if(!ficha) return; e.preventDefault(); abrir(a.dataset.abrir); }));
document.querySelectorAll("[data-cerrar]").forEach(b=>b.addEventListener("click",cerrar));
if(ficha) ficha.addEventListener("click",e=>{ if(e.target===ficha) cerrar(); });
if(ficha) $("#ficha-inscribir").addEventListener("click",e=>{ e.preventDefault(); cerrar(); irAInscripcion(actual, "inscribir"); });

/* ===== Valor y simulación con beca ===== */
const PRECIOS = { diplomado:240000, master:865000, ia:165000, curso:135000 };
const TRAMOS = [20,30,50];
const clp = n => "$" + Math.round(Number(n)||0).toLocaleString("es-CL");
function precioDe(cod){
  if(/^m\d+-d\d+$/.test(cod) || cod==="met") return PRECIOS.diplomado;
  if(/^m\d+$/.test(cod)) return PRECIOS.master;
  if(cod==="ia") return PRECIOS.ia;
  if(/^(td|op|al)$/.test(cod)) return PRECIOS.curso;
  return 0;
}
function simulacion(cod){
  const p = precioDe(cod); if(!p) return "";
  const filas = TRAMOS.map(t=>{ const v = Math.round(p*(100-t)/100); return `<tr><td>${t}%</td><td><b>${clp(v)}</b></td><td>12 × ${clp(v/12)}</td></tr>`; }).join("");
  return `<div class="sim"><p class="sim-lista"><span>Valor del programa</span><b>${clp(p)}</b></p>
    <table><thead><tr><th>Beca</th><th>Valor final</th><th>En cuotas</th></tr></thead><tbody>
    <tr><td style="color:var(--gris)">Sin beca</td><td><b>${clp(p)}</b></td><td>12 × ${clp(p/12)}</td></tr>${filas}</tbody></table>
    <p class="sim-nota">Simulación referencial. Las becas se otorgan caso a caso; las cuotas son a precio contado con Mercado Pago.</p>
    <a class="sim-beca" href="#inscripcion" data-beca-prog="${cod}">Postular a una beca para este programa</a></div>`;
}
function activarBecaProg(raiz){
  (raiz||document).querySelectorAll("[data-beca-prog]").forEach(a=>{ if(a.dataset.listo) return; a.dataset.listo=1;
    a.addEventListener("click",e=>{ e.preventDefault(); try{ cerrarBrochure(); }catch(e){} try{ cerrar(); }catch(e){}
      irAInscripcion(a.dataset.becaProg, "inscribir", true); }); });
}
/* En cada diplomado del catálogo: valor y simulación desplegable */
document.querySelectorAll(".dip").forEach(card=>{
  const b = card.querySelector("[data-dip]"); const cod = b ? b.dataset.dip : card.dataset.sim; if(!cod) return;
  const d = document.createElement("details"); d.className = "dip-valor";
  d.innerHTML = `<summary>Valor y simulación con beca</summary>${simulacion(cod)}`;
  const mat = card.querySelector(".dip-materias");
  if(mat) mat.after(d); else card.querySelector(".dip-acciones").before(d);
});
activarBecaProg(document);

/* ===== Masters Profesionales: brochures ===== */
const MASTERS = [{"id": "m1", "n": "Master Profesional en Administración y Dirección de Empresas (MBA)", "corto": "MBA", "c": "#0F2747", "desc": "Visión integral de la empresa: estrategia, personas, mercado, finanzas y operaciones, para quienes dirigen o aspiran a dirigir.", "dir": "Profesionales con responsabilidades de jefatura o gerencia, y emprendedores que necesitan una formación directiva completa.", "ico": "<path d=\"M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6\"/>", "d": [{"n": "Diplomado en Dirección Estratégica y Personas", "m": ["Introducción a los negocios", "Gestión estratégica", "Gestión del capital humano", "Liderazgo y coaching", "Desarrollo organizacional"], "id": "m1-d1", "desc": "Los fundamentos para conducir una empresa: cómo se define la estrategia y cómo se lidera y desarrolla a las personas que la llevan a cabo."}, {"n": "Diplomado en Marketing y Finanzas para la Dirección", "m": ["Introducción a la ciencia del mercado", "Investigación de mercado y conducta del consumidor", "Marketing digital", "Economía y gestión financiera", "Finanzas corporativas"], "id": "m1-d2", "desc": "Las dos lecturas que todo directivo necesita: entender al mercado y al consumidor, y leer las finanzas para decidir dónde invertir."}, {"n": "Diplomado en Operaciones, Proyectos e Innovación", "m": ["Gestión de operaciones", "Logística", "Project management", "Evaluación de proyectos", "Innovar y emprender"], "id": "m1-d3", "desc": "Cómo producir y entregar con eficiencia, formular y evaluar proyectos, e innovar con método."}], "area": "Administración (MBA)"}, {"id": "m2", "n": "Master Profesional en Gestión Estratégica de Capital Humano", "corto": "Capital Humano", "c": "#6E3A9C", "desc": "Gestión estratégica de las personas: atracción, desarrollo, compensaciones, relaciones laborales y cambio organizacional.", "dir": "Profesionales de recursos humanos, jefaturas de equipos y consultores en gestión de personas.", "ico": "<circle cx=\"9\" cy=\"8\" r=\"3.5\"/><path d=\"M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6\"/><circle cx=\"17\" cy=\"9\" r=\"2.5\"/><path d=\"M16 14.2c3 .2 5.5 2.3 5.5 5.8\"/>", "d": [{"n": "Diplomado en Dirección del Talento y Cultura Organizacional", "m": ["Gestión del capital humano", "Dirección estratégica", "Liderazgo y coaching", "Desarrollo organizacional", "Comunicación organizacional"], "id": "m2-d1", "desc": "La gestión de personas como función estratégica: liderazgo, desarrollo organizacional y comunicación interna para construir cultura."}, {"n": "Diplomado en Gestión Operativa de Personas", "m": ["Selección y reclutamiento", "Evaluación del desempeño", "Desarrollo de carrera", "Compensación y beneficios", "Presupuesto de RRHH"], "id": "m2-d2", "desc": "Los procesos que sostienen el área de personas: reclutamiento y selección, evaluación del desempeño, carrera, compensaciones y presupuesto."}, {"n": "Diplomado en Relaciones Laborales y Cambio Organizacional", "m": ["Legislación laboral", "Conflicto y negociación", "Clima organizacional", "Cultura organizacional", "Desvinculación y outplacement"], "id": "m2-d3", "desc": "Legislación laboral, negociación y manejo de conflictos, clima y cultura, y procesos de desvinculación bien conducidos."}], "area": "Capital Humano"}, {"id": "m3", "n": "Master Profesional en Marketing y Gestión Comercial", "corto": "Marketing", "c": "#F07C1B", "desc": "Marketing y gestión comercial basados en datos: marca, investigación de mercados, consumidor, innovación y canales digitales.", "dir": "Profesionales de marketing, ventas y producto, y emprendedores que buscan crecer con método.", "ico": "<path d=\"M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z\"/><path d=\"M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12\"/>", "d": [{"n": "Diplomado en Gerencia de Marketing y Marca", "m": ["Gerencia de marketing", "Segmentación y posicionamiento", "Gerencia de marca", "Plan de marketing", "Marketing de consumo y servicios"], "id": "m3-d1", "desc": "Dirigir el marketing de una empresa: segmentar, posicionar, construir marca y llevarlo todo a un plan de marketing."}, {"n": "Diplomado en Investigación de Mercados y Analítica del Consumidor", "m": ["Inteligencia de mercado", "Métodos estadísticos", "Técnicas de investigación de mercados", "Conducta del consumidor", "Data science"], "id": "m3-d2", "desc": "Diseñar investigaciones de mercado y analizar datos del consumidor con métodos estadísticos y herramientas de data science."}, {"n": "Diplomado en Gestión Comercial, Innovación y Canales Digitales", "m": ["Gerencia comercial", "Desarrollo de nuevos productos", "Desarrollo de nuevos servicios", "eCommerce y omnicanalidad", "Gestión digital y analítica web"], "id": "m3-d3", "desc": "Dirigir la gestión comercial, desarrollar nuevos productos y servicios, y vender en canales digitales y omnicanal."}], "area": "Marketing"}, {"id": "m4", "n": "Master Profesional en Auditoría, Contabilidad y Control de Gestión", "corto": "Auditoría y Control", "c": "#1D4E89", "desc": "Contabilidad, normas IFRS, auditoría, control interno y control de gestión para resguardar y dirigir la organización.", "dir": "Contadores, auditores, controllers y profesionales de administración y finanzas.", "ico": "<path d=\"M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6z\"/><path d=\"M9 12l2 2 4-4\"/>", "d": [{"n": "Diplomado en Contabilidad e IFRS", "m": ["Contabilidad para la gestión", "Contabilidades especiales", "IFRS grandes empresas", "IFRS PYMEs", "Tributación para la empresa"], "id": "m4-d1", "desc": "Contabilidad para la gestión, normas IFRS para grandes empresas y pymes, y tributación de la empresa."}, {"n": "Diplomado en Auditoría y Control Interno", "m": ["Auditoría interna y control interno", "Auditoría financiera", "Gestión de riesgos y cumplimiento", "Auditoría con análisis de datos", "Ética y gobierno corporativo"], "id": "m4-d2", "desc": "Auditoría interna y financiera, control interno, riesgos y cumplimiento, con análisis de datos y gobierno corporativo."}, {"n": "Diplomado en Control de Gestión", "m": ["Planificación estratégica", "Costos y presupuestos", "Control de gestión", "Balanced scorecard", "Indicadores y tableros de gestión"], "id": "m4-d3", "desc": "Del plan estratégico a los indicadores: costos, presupuestos, balanced scorecard y tableros para controlar la gestión."}], "area": "Auditoría y Contabilidad"}, {"id": "m5", "n": "Master Profesional en Finanzas Aplicadas", "corto": "Finanzas", "c": "#0E7C9E", "desc": "Finanzas aplicadas a la toma de decisiones: análisis, valoración, financiamiento, inversiones y mercados.", "dir": "Profesionales de finanzas, analistas, ejecutivos bancarios y emprendedores que gestionan recursos y deciden inversiones.", "ico": "<path d=\"M4 20V10M10 20V4M16 20v-7M22 20H2\"/>", "d": [{"n": "Diplomado en Fundamentos de Finanzas", "m": ["Gerencia de finanzas", "Matemáticas financieras", "Análisis de estados financieros", "Finanzas a corto plazo", "Modelamiento financiero con Excel e IA"], "id": "m5-d1", "desc": "La base financiera para decidir: matemáticas financieras, análisis de estados financieros, finanzas de corto plazo y modelos en Excel con apoyo de IA."}, {"n": "Diplomado en Finanzas Corporativas", "m": ["Finanzas corporativas", "Finanzas a largo plazo", "Formulación, evaluación y gestión de proyectos", "Valoración de empresas", "Finanzas para pymes y emprendimientos"], "id": "m5-d2", "desc": "Decisiones financieras de largo plazo: financiamiento, evaluación de proyectos y valoración de empresas, también en pymes y emprendimientos."}, {"n": "Diplomado en Inversiones y Mercados Financieros", "m": ["Mercado de capitales e inversiones", "Finanza internacional", "Riesgo financiero y derivados", "Gestión de portafolios", "Fintech y finanzas digitales"], "id": "m5-d3", "desc": "Mercado de capitales, finanzas internacionales, riesgo y derivados, gestión de portafolios y finanzas digitales."}], "area": "Finanzas"}, {"id": "m6", "n": "Master Profesional en Gestión Logística Estratégica", "corto": "Logística", "c": "#14947F", "desc": "Dirección de la cadena logística: inventario, almacenamiento, transporte, distribución y control de la operación.", "dir": "Profesionales de logística, operaciones, compras y abastecimiento, de retail, industria y servicios.", "ico": "<path d=\"M2 6h12v10H2zM14 9h4l4 4v3h-8z\"/><circle cx=\"6\" cy=\"18\" r=\"2\"/><circle cx=\"18\" cy=\"18\" r=\"2\"/>", "d": [{"n": "Diplomado en Inventario y Almacenamiento", "m": ["Gestión del inventario", "Prevención de pérdidas", "Gestión de centros de distribución", "Infraestructura del almacenaje", "Sistemas ERP y automatización"], "id": "m6-d1", "desc": "Gestionar inventarios y centros de distribución: control de stock, prevención de pérdidas, infraestructura de almacenaje y sistemas ERP."}, {"n": "Diplomado en Transporte y Distribución", "m": ["Transporte terrestre y marítimo", "Transporte aéreo y multimodal", "Transporte y distribución", "Sistemas de costeo", "Indicadores de eficiencia"], "id": "m6-d2", "desc": "Transporte terrestre, marítimo, aéreo y multimodal, redes de distribución, costeo e indicadores de eficiencia."}, {"n": "Diplomado en Dirección Logística y Control", "m": ["Gestión logística estratégica", "Gerencia de finanzas", "Formulación, evaluación y gestión de proyectos", "Evaluación de proyectos y externalización", "Control de gestión y BSC"], "id": "m6-d3", "desc": "Dirigir la logística con visión estratégica: finanzas, evaluación de proyectos y externalización, y control de gestión con BSC."}], "area": "Logística"}, {"id": "m7", "n": "Master Profesional en Gestión Integrada, Prevención, Higiene, Seguridad y Medio Ambiente", "corto": "Prevención y Medio Ambiente", "c": "#5B8C2A", "desc": "Sistemas integrados de gestión: prevención de riesgos, higiene y seguridad, calidad, responsabilidad social y medio ambiente.", "dir": "Prevencionistas, encargados de calidad y medio ambiente, y jefaturas de operaciones.", "ico": "<path d=\"M12 3c4 4 6 7 6 10a6 6 0 0 1-12 0c0-3 2-6 6-10z\"/><path d=\"M12 21v-7\"/>", "d": [{"n": "Diplomado en Prevención de Riesgos, Higiene y Seguridad", "m": ["Seguridad en el trabajo", "Higiene en el trabajo", "Gestión de la prevención de riesgos", "Gestión de personas", "Sistemas de información y gestión"], "id": "m7-d1", "desc": "Seguridad e higiene en el trabajo, gestión de la prevención de riesgos y sistemas de información para el área."}, {"n": "Diplomado en Gestión de la Calidad y Responsabilidad Social", "m": ["Modelos y normativa de calidad", "Auditorías de calidad", "Modelos de excelencia", "Responsabilidad social empresarial", "Gestión de proyectos"], "id": "m7-d2", "desc": "Normas y modelos de calidad, auditorías, modelos de excelencia y responsabilidad social empresarial."}, {"n": "Diplomado en Gestión Ambiental y Sistemas Integrados", "m": ["Evaluación de impacto ambiental", "Gestión de residuos", "Auditorías ambientales", "Sistemas integrados de gestión", "Metodologías de integración"], "id": "m7-d3", "desc": "Evaluación de impacto ambiental, gestión de residuos, auditorías ambientales e integración de sistemas de gestión."}], "area": "Prevención y Medio Ambiente"}, {"id": "m8", "n": "Master Profesional en Formulación, Evaluación y Dirección de Proyectos", "corto": "Proyectos", "c": "#B4530A", "desc": "Formulación, evaluación y dirección de proyectos con estándares profesionales, desde la idea hasta el control.", "dir": "Profesionales que formulan, evalúan o dirigen proyectos en empresas, instituciones públicas y consultoras.", "ico": "<rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M7 9h6M7 13h10M7 17h4\"/>", "d": [{"n": "Diplomado en Formulación de Proyectos", "m": ["Formulación estratégica", "Formulación de proyectos", "Análisis de factibilidad", "Costos y presupuestos", "Gestión de calidad"], "id": "m8-d1", "desc": "Convertir una idea en un proyecto: formulación estratégica, estudios de factibilidad, costos, presupuesto y calidad."}, {"n": "Diplomado en Evaluación de Proyectos", "m": ["Análisis financiero", "Evaluación económica, financiera y social", "Evaluación de impacto ambiental", "Finanzas corporativas", "Mercado de capitales"], "id": "m8-d2", "desc": "Evaluar proyectos desde lo económico, financiero, social y ambiental, con herramientas de finanzas corporativas."}, {"n": "Diplomado en Dirección y Control de Proyectos", "m": ["Estándares PMI", "Control de gestión", "Balanced scorecard", "Dirección de empresas", "Gobiernos corporativos"], "id": "m8-d3", "desc": "Dirigir y controlar proyectos con estándares PMI, control de gestión, balanced scorecard y gobierno corporativo."}], "area": "Proyectos"}, {"id": "m9", "n": "Master Profesional en Economía Aplicada", "corto": "Economía", "c": "#A23B5F", "area": "Economía", "desc": "Economía aplicada a la toma de decisiones: mercados, ciclo económico, competencia, regulación y análisis de datos económicos.", "dir": "Profesionales de empresas, consultoras, gremios y organismos públicos que necesitan leer la economía y sus datos para decidir.", "ico": "<path d=\"M3 3v18h18\"/><path d=\"M7 15l4-4 3 3 5-6\"/>", "d": [{"n": "Diplomado en Economía para la Dirección", "m": ["Microeconomía aplicada: demanda, costos y precios", "Macroeconomía y ciclo económico", "Política monetaria y fiscal", "Indicadores económicos de Chile", "Economía internacional y tipo de cambio"], "desc": "Leer la economía para decidir: cómo se forman los precios, qué mueve el ciclo económico, cómo actúan el Banco Central y el fisco, y qué dicen los indicadores de Chile.", "id": "m9-d1"}, {"n": "Diplomado en Mercados, Competencia y Regulación", "m": ["Organización industrial", "Libre competencia", "Regulación de servicios básicos", "Economía laboral", "Recursos naturales y energía"], "desc": "Cómo funcionan los mercados reales: estructura de las industrias, libre competencia, regulación de servicios básicos, mercado laboral y recursos naturales.", "id": "m9-d2"}, {"n": "Diplomado en Análisis Económico de Datos y Economía del Comportamiento", "m": ["Estadística aplicada", "Econometría aplicada", "Pronósticos y series de tiempo", "Economía del comportamiento", "Análisis de datos económicos con IA"], "desc": "Medir y anticipar con datos económicos: estadística, econometría y pronósticos, junto a la economía del comportamiento y el análisis asistido con IA.", "id": "m9-d3"}]}, {"id": "m10", "n": "Master Profesional en Gestión Pública", "corto": "Gestión Pública", "c": "#8C6A12", "area": "Gestión Pública", "desc": "Dirección y gestión de organismos públicos: políticas públicas, personas, presupuesto, compras, control y gestión municipal.", "dir": "Funcionarios y profesionales de ministerios, servicios públicos, gobiernos regionales y municipalidades, y consultores que trabajan con el Estado.", "ico": "<path d=\"M3 21h18M4 10h16M12 3l8 5H4z\"/><path d=\"M6 10v8M10 10v8M14 10v8M18 10v8\"/>", "d": [{"n": "Diplomado en Estado, Políticas Públicas y Gestión de Personas", "m": ["El Estado y la administración pública en Chile", "Diseño de políticas públicas", "Implementación y evaluación de programas", "Gestión de personas en el sector público", "Probidad, transparencia y gobierno digital"], "desc": "Cómo se organiza el Estado en Chile, cómo se diseñan e implementan las políticas públicas y cómo se gestionan las personas en el sector público, con probidad y transparencia.", "id": "m10-d1"}, {"n": "Diplomado en Finanzas Públicas, Compras y Control", "m": ["Presupuesto público", "Contabilidad gubernamental", "Compras públicas y Mercado Público", "Evaluación social de proyectos", "Control interno y auditoría en el sector público"], "desc": "El recorrido del dinero público: presupuesto, contabilidad gubernamental, compras públicas, evaluación social de proyectos y control interno.", "id": "m10-d2"}, {"n": "Diplomado en Gestión Municipal y Desarrollo Territorial", "m": ["La municipalidad y su marco legal", "Planificación comunal: PLADECO y plan regulador", "Servicios municipales y atención ciudadana", "Fomento productivo y desarrollo económico local", "Financiamiento municipal y proyectos de inversión"], "desc": "Gestionar una municipalidad y su territorio: marco legal, planificación comunal, servicios a la comunidad, fomento productivo y financiamiento de proyectos.", "id": "m10-d3"}]}];
const bro = $("#brochure");
let masterActual = "";
const BRO_ORIG = {}; if(bro) ["bro-etiqueta","bro-datos","bro-valor","bro-ruta-t","bro-ruta","bro-est-t"].forEach(i=>BRO_ORIG[i]=document.getElementById(i).innerHTML);
function restaurarBro(){ Object.keys(BRO_ORIG).forEach(i=>document.getElementById(i).innerHTML=BRO_ORIG[i]); }
function abrirDiplomado(did){
  const m = MASTERS.find(x=>did.startsWith(x.id+"-")); if(!m) return;
  const d = m.d.find(x=>x.id===did); if(!d) return;
  masterActual = did; restaurarBro();
  bro.style.setProperty("--c", m.c);
  $("#bro-etiqueta").textContent = "Diplomado · IDEAX";
  $("#bro-titulo").textContent = d.n;
  $("#bro-desc").textContent = d.desc;
  $("#bro-dir").textContent = m.dir;
  $("#bro-datos").innerHTML = `<div><b>4 meses</b>Duración total</div><div><b>5 materias</b>De 3 semanas cada una</div><div><b>Asincrónico</b>Facultad Virtual IDEAX</div><div><b>Certificado</b>De diplomado IDEAX</div>`;
  $("#bro-valor").innerHTML = `<div><b>Becas</b>parciales de 20%, 30% y 50%</div><div><b>12 cuotas</b>a precio contado con Mercado Pago</div><div><b>Lunes</b>inicio, 7 días después del pago</div><div class="total"><b>Convalidable</b>en el ${esc(m.n)}</div>`;
  $("#bro-sim").innerHTML = `<h5>Valor y simulación con beca</h5>${simulacion(did)}`; activarBecaProg($("#bro-sim"));
  $("#bro-est-t").textContent = "Materias del diplomado";
  $("#bro-dips").innerHTML = `<div class="bro-dip"><div class="bro-dip-cab"><b>${esc(d.n)}</b><small>4 meses · $240.000</small></div><ul>${d.m.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`;
  $("#bro-ruta-t").textContent = "Continuidad hacia el Master Profesional";
  $("#bro-ruta").textContent = `Este diplomado se cursa y certifica por sí solo. Si luego cursas los otros dos diplomados del área, el Diplomado en Metodología de la Investigación y Escritura Académica, incluido sin costo, y el paper evaluado por pares en la revista CMIA, obtienes el ${m.n}. Lo que ya aprobaste se convalida.`;
  if(typeof bro.showModal==="function") bro.showModal(); else bro.setAttribute("open","");
  bro.scrollTop = 0;
}
function abrirBrochure(id){
  const m = MASTERS.find(x=>x.id===id); if(!m) return;
  masterActual = id; restaurarBro();
  bro.style.setProperty("--c", m.c);
  $("#bro-titulo").textContent = m.n;
  $("#bro-desc").textContent = m.desc;
  $("#bro-dir").textContent = m.dir;
  $("#bro-sim").innerHTML = `<h5>Valor y simulación con beca de la ruta completa</h5>${simulacion(id)}`; activarBecaProg($("#bro-sim"));
  $("#bro-dips").innerHTML = m.d.map((d,k)=>`<div class="bro-dip"><div class="bro-dip-cab"><span>${k+1}</span><b>${esc(d.n)}</b><small>4 meses · 5 materias · $240.000</small></div><ul>${d.m.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`).join("");
  if(typeof bro.showModal==="function") bro.showModal(); else bro.setAttribute("open","");
  bro.scrollTop = 0;
}
function cerrarBrochure(){ if(bro && bro.open){ bro.close ? bro.close() : bro.removeAttribute("open"); } }
document.querySelectorAll("[data-dip]").forEach(b=>b.addEventListener("click",()=>abrirDiplomado(b.dataset.dip)));
document.querySelectorAll("[data-master-bro]").forEach(b=>b.addEventListener("click",()=>abrirBrochure(b.dataset.masterBro)));
document.querySelectorAll(".area-tab").forEach(b=>b.addEventListener("click",()=>{
  const todos = b.dataset.area === "todos";
  document.querySelectorAll(".area-tab").forEach(x=>{ const on=x===b; x.classList.toggle("activa",on); x.setAttribute("aria-selected",on); });
  document.querySelectorAll(".area-panel").forEach(p=>p.classList.toggle("activa", todos || p.dataset.area===b.dataset.area));
  const cont = b.closest(".contenedor"); if(cont) cont.classList.toggle("areas-todas", todos);
}));
document.querySelectorAll(".master").forEach(c=>{
  c.addEventListener("click",()=>abrirBrochure(c.dataset.master));
  c.addEventListener("keydown",e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); abrirBrochure(c.dataset.master); } });
});
document.querySelectorAll("[data-cerrar-bro]").forEach(b=>b.addEventListener("click",cerrarBrochure));
if(bro) bro.addEventListener("click",e=>{ if(e.target===bro) cerrarBrochure(); });
if(bro) $("#bro-inscribir").addEventListener("click",e=>{ e.preventDefault(); cerrarBrochure(); irAInscripcion(masterActual, "inscribir"); });
if(bro) $("#bro-info").addEventListener("click",e=>{ e.preventDefault(); cerrarBrochure(); irAInscripcion(masterActual, "info"); });
if(bro) $("#bro-imprimir").addEventListener("click",()=>{
  if(BROCHURES && BROCHURES[masterActual]){ window.open(BROCHURES[masterActual], "_blank", "noopener"); return; }
  document.body.classList.add("imprimiendo");
  const fin=()=>{ document.body.classList.remove("imprimiendo"); window.removeEventListener("afterprint",fin); };
  window.addEventListener("afterprint",fin);
  try{ window.print(); }catch(e){ fin(); }
  setTimeout(fin, 60000);
});

/* Menú móvil */
const ham = $(".hamburguesa"), menu = $("#menu");
ham.addEventListener("click",()=>{ const ab = menu.classList.toggle("abierto"); ham.setAttribute("aria-expanded", ab); });
menu.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{ menu.classList.remove("abierto"); ham.setAttribute("aria-expanded","false"); }));
document.addEventListener("click",e=>{ if(menu.classList.contains("abierto") && !menu.contains(e.target) && !ham.contains(e.target)){ menu.classList.remove("abierto"); ham.setAttribute("aria-expanded","false"); } });

/* Sombra del encabezado y menú activo según la sección */
const enc = $("#encabezado");
const enlaces = [...document.querySelectorAll(".menu a.enlace")];
const enlacesSec = enlaces.filter(a=>/^#./.test(a.getAttribute("href")));
const secciones = enlacesSec.map(a=>document.querySelector(a.getAttribute("href"))).filter(Boolean);
function alDesplazar(){
  enc.classList.toggle("sombra", window.scrollY > 10);
  if(!secciones.length) return;
  let actualSec = secciones[0];
  secciones.forEach(s=>{ if(s.getBoundingClientRect().top < 140) actualSec = s; });
  enlacesSec.forEach(a=>a.classList.toggle("activo", document.querySelector(a.getAttribute("href")) === actualSec));
}
window.addEventListener("scroll", alDesplazar, {passive:true}); alDesplazar();


/* Correo y año */
["#correo-visible","#correo-pie"].forEach(s=>{ const a=$(s); if(!a) return; a.textContent = CONFIG.correo; a.href = "mailto:" + CONFIG.correo; });
(()=>{ const a=$("#correo-barra"); if(!a) return; a.querySelector("span").textContent = CONFIG.correo; a.href = "mailto:" + CONFIG.correo; })();
if($("#anio")) $("#anio").textContent = new Date().getFullYear();


/* ===== Verificación de certificados ===== */
const vRes = $("#v-resultado");
const ICO_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/></svg>';
const ICO_MAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>';
const ICO_INFO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7.5v.5"/></svg>';
const esc = t => String(t==null?"":t).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function enlaceSolicitud(dato){
  const asunto = encodeURIComponent("Solicitud de validación de certificado");
  const cuerpo = encodeURIComponent(`Dato consultado: ${dato}\nNombre del titular:\nPrograma:\nAño aproximado:\nInstitución que solicita la validación:\n\nAdjunto copia del certificado.`);
  return `mailto:${CONFIG.correo}?subject=${asunto}&body=${cuerpo}`;
}
function tarjetaCert(r){
  const cls = r.valido ? "res-ok" : "res-mal";
  const estado = (r.valido ? ICO_OK : ICO_MAL) + esc(r.estado || (r.valido ? "Certificado válido" : "Certificado revocado, sin validez"));
  const filas = [["Titular",r.nombre],["Documento",r.documento],["Programa",r.programa],["Tipo",r.tipo],["Emitido por",r.institucion],["Fecha de emisión",r.fecha],["Horas",r.horas],["Calificación",r.nota && typeof r.nota==="object" ? `${String(r.nota.pct).replace(".",",")}% (${String(r.nota.n7).replace(".",",")} en escala 1 a 7; ${String(r.nota.n10).replace(".",",")} en escala 1 a 10)` : r.nota],["Código",r.codigo]]
    .filter(f=>f[1]).map(f=>`<dt>${f[0]}</dt><dd>${esc(f[1])}</dd>`).join("");
  const cp = r.valido && r.copia && r.copia.codigo ? r.copia : null, planilla = cp && cp.origen === "planilla";
  const copia = cp ? `<div class="copia-titular" data-origen="${planilla ? "planilla" : "efacultad"}" data-codigo="${esc(cp.codigo)}" data-digital="${Number(cp.monto)||0}" data-apostilla="${Number(cp.apostilla)||0}" data-portafolio="${planilla ? 0 : Number(cp.portafolio)||0}">${copiaHtmlOpciones(copiaDatosDe(cp), { op:"digital", porta:false })}</div>` : "";
  return `<div class="res ${cls}"><div class="res-estado">${estado}</div><dl>${filas}</dl>${copia}</div>`;
}

/* Copia para el titular.
   Certificados de la eFacultad: confirma su documento y el enlace de pago llega al correo registrado; la entrega es automática.
   Certificados de la planilla (IADE y antiguos): deja documento y contacto; IDEAX valida la identidad y envía el enlace de pago.
   En ambos casos puede pedirse la copia digital o la apostillada (física y digital, con envío incluido). */
const COPIA_DIG = {
  efacultad: "Certificado y portafolio de entregas en PDF, al correo registrado en la eFacultad. Entrega automática al pagar.",
  planilla: "Copia del certificado en PDF, con su código de verificación. IDEAX la emite tras validar tu identidad."
};
function copiaDatosDe(cp){ return { origen: cp.origen === "planilla" ? "planilla" : "efacultad", codigo: cp.codigo, digital: Number(cp.monto)||0, apostilla: Number(cp.apostilla)||0, portafolio: cp.origen === "planilla" ? 0 : Number(cp.portafolio)||0 }; }
function copiaDatos(caja){ const d = caja.dataset; return { origen: d.origen, codigo: d.codigo, digital: Number(d.digital), apostilla: Number(d.apostilla), portafolio: Number(d.portafolio) }; }
function copiaEstado(caja){ return caja._st || (caja._st = { op:"digital", porta:false }); }
function copiaTotal(c, st){ return st.op === "digital" ? c.digital : c.apostilla + (st.porta && c.portafolio ? c.portafolio : 0); }
function copiaHtmlOpciones(c, st){
  const dig = st.op === "digital";
  const opA = c.apostilla > 0 ? `<button type="button" class="copia-op" role="radio" aria-checked="${!dig}" data-copia-op="apostilla"><b>Certificado apostillado, físico y digital</b><span>Envío incluido a Chile o al extranjero.</span></button>` : "";
  const porta = !dig && c.portafolio > 0 ? `<label class="copia-porta"><input type="checkbox" data-copia-porta${st.porta ? " checked" : ""}>Agregar el portafolio apostillado</label>` : "";
  return `<b class="copia-tit">¿Eres el titular? Solicita una copia</b>
    <div class="copia-opciones" role="radiogroup" aria-label="Tipo de copia">
    <button type="button" class="copia-op" role="radio" aria-checked="${dig}" data-copia-op="digital"><b>Copia digital</b><span>${COPIA_DIG[c.origen]}</span></button>${opA}</div>${porta}
    <div class="copia-pie"><button type="button" class="btn btn-noche" data-copia-seguir>Continuar</button></div>`;
}
function copiaHtmlForm(c, st){
  const auto = c.origen === "efacultad", dig = st.op === "digital", total = copiaTotal(c, st);
  const titulo = dig ? "Copia digital" : "Certificado apostillado" + (st.porta && c.portafolio ? " y portafolio apostillado" : "");
  const envio = dig ? "" : " La copia física apostillada se envía a la dirección que indiques.";
  const expl = auto ? "Escribe tu número de documento. Si coincide con el del titular, enviaremos el enlace de pago al correo que tienes registrado en la eFacultad." + envio
    : "Escribe tu número de documento y tus datos de contacto. Validaremos tu identidad antes de enviarte el enlace de pago." + envio;
  const tel = `<label>Teléfono<input name="telefono" type="tel" autocomplete="tel" placeholder="+56 9 1234 5678"></label>`;
  const contacto = auto ? (dig ? "" : `<div class="copia-grid">${tel}</div>`)
    : `<div class="copia-grid"><label>Correo<input name="correo" type="email" autocomplete="email" placeholder="nombre@correo.cl"></label>${tel}</div>`;
  const dir = dig ? "" : `<div class="copia-grid"><label class="ancho">Dirección de envío<input name="direccion" autocomplete="street-address" placeholder="Calle, número, depto."></label><label>Ciudad o comuna<input name="ciudad" autocomplete="address-level2"></label><label>País<input name="pais" autocomplete="country-name" value="Chile"></label></div>`;
  const valores = dig ? `Valor: <b>${clp(total)}</b>.`
    : (st.porta && c.portafolio ? `Valores: certificado apostillado ${clp(c.apostilla)} y portafolio apostillado ${clp(c.portafolio)}. Total: <b>${clp(total)}</b>, con envío incluido.` : `Valor: <b>${clp(total)}</b>, con envío incluido a Chile o al extranjero.`);
  return `<form class="copia-form" novalidate><b>${titulo}</b><p class="copia-valor">${valores}</p><p>${expl}</p>
    <label>Tu número de documento (RUT o pasaporte)<input name="doc" autocomplete="off" placeholder="12.345.678-9" required></label>${contacto}${dir}
    <div class="copia-acc"><button type="submit" class="btn btn-naranja">${auto ? "Enviar enlace de pago · " + clp(total) : "Enviar solicitud"}</button><button type="button" class="copia-cancelar" data-copia-volver>Volver</button></div>
    <div class="copia-res" aria-live="polite"></div></form>`;
}
async function copiaEnviar(caja, c, st, f){
  const res = f.querySelector(".copia-res"), b = f.querySelector('button[type="submit"]'), auto = c.origen === "efacultad", dig = st.op === "digital";
  const v = n => f.elements[n] ? f.elements[n].value.trim() : "";
  const mal = t => { res.innerHTML = `<p class="copia-mal">${esc(t)}</p>`; };
  if(v("doc").replace(/[^0-9a-z]/gi,"").length < 5) return mal("Escribe tu RUT o número de pasaporte.");
  if(!auto && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v("correo"))) return mal("Revisa tu correo electrónico.");
  if(!dig && v("direccion").length < 8) return mal("Indica la dirección completa para el envío.");
  const cuerpo = { accion:"solicitarCopia", codigo: c.codigo, documento: v("doc"), modalidad: dig ? "digital" : (st.porta && c.portafolio ? "apostilla_portafolio" : "apostilla"),
    telefono: v("telefono"), direccion: v("direccion"), ciudad: v("ciudad"), pais: v("pais") };
  if(!auto) cuerpo.correo = v("correo");
  b.disabled = true; res.innerHTML = `<p>Enviando…</p>`;
  let j = null;
  try{
    j = await fetch(auto ? CONFIG.efacultadURL : CONFIG.verificacionURL, { method:"POST", headers:{ "Content-Type":"text/plain;charset=utf-8" }, body: JSON.stringify(cuerpo) }).then(x=>x.json());
  }catch(x){ j = null; }
  if(!(j && j.ok)){ mal((j && j.error) || "No pudimos enviar la solicitud. Inténtalo de nuevo en unos minutos o escríbenos a " + CONFIG.correo + "."); b.disabled = false; return; }
  const texto = auto
    ? `Revisa el correo <b>${esc(j.datos && j.datos.correo)}</b>, el que tienes registrado en la eFacultad. ` + (dig ? "Al confirmarse el pago, te llegarán ahí la copia del certificado y del portafolio." : "Al confirmarse el pago, te llegará ahí la copia digital e iniciaremos el trámite de apostilla; el documento físico se despacha a la dirección que indicaste.") + " El enlace vence en 48 horas."
    : "Validaremos tu identidad y, dentro de dos días hábiles, te enviaremos el enlace de pago al correo que indicaste." + (dig ? " Al pagar, recibirás la copia digital con su código de verificación." : " Al pagar, iniciaremos el trámite de apostilla y te enviaremos la copia digital; la física se despacha a la dirección indicada.");
  const nota = auto ? `¿Ya no usas ese correo? Escríbenos a ${esc(CONFIG.correo)} desde tu nuevo correo, con una foto de tu documento.` : `Si tienes dudas, escríbenos a ${esc(CONFIG.correo)} indicando el código del certificado.`;
  caja.innerHTML = `<div class="copia-ok"><b>${auto ? "Te enviamos el enlace de pago" : "Recibimos tu solicitud"}</b><p>${texto}</p><p class="copia-nota">${nota}</p></div>`;
}
document.addEventListener("click", e=>{
  const caja = e.target.closest(".copia-titular"); if(!caja) return;
  const c = copiaDatos(caja), st = copiaEstado(caja);
  const op = e.target.closest("[data-copia-op]");
  if(op){ st.op = op.dataset.copiaOp; if(st.op === "digital") st.porta = false; caja.innerHTML = copiaHtmlOpciones(c, st); caja.querySelector(`[data-copia-op="${st.op}"]`).focus(); return; }
  if(e.target.closest("[data-copia-volver]")){ caja.innerHTML = copiaHtmlOpciones(c, st); return; }
  if(e.target.closest("[data-copia-seguir]")){
    caja.innerHTML = copiaHtmlForm(c, st);
    const f = caja.querySelector("form"); f.elements.doc.focus();
    f.addEventListener("submit", ev=>{ ev.preventDefault(); copiaEnviar(caja, c, st, f); });
  }
});
document.addEventListener("change", e=>{
  const x = e.target.closest("[data-copia-porta]"); if(!x) return;
  const caja = x.closest(".copia-titular"), st = copiaEstado(caja);
  st.porta = x.checked; caja.innerHTML = copiaHtmlOpciones(copiaDatos(caja), st); caja.querySelector("[data-copia-porta]").focus();
});
function mostrarVerificacion(dato, data){
  if(!data || !data.ok){
    vRes.innerHTML = `<div class="res res-info"><div class="res-estado">${ICO_INFO}No se pudo verificar</div><p>${esc((data&&data.error)||"El servicio no respondió. Intenta nuevamente en unos minutos.")}</p></div>`;
    return;
  }
  if(data.total === 0){
    vRes.innerHTML = `<div class="res res-mal"><div class="res-estado">${ICO_MAL}No encontramos un certificado con ese dato</div><p>Revisa que el código o el documento estén bien escritos. Si se trata de un certificado de IADE Business School que no aparece, puedes <a href="${enlaceSolicitud(dato)}">solicitar una validación manual</a> a ${esc(CONFIG.correo)}, adjuntando una copia del certificado.</p></div>`;
    return;
  }
  const encabezado = data.total > 1 ? `<p style="margin:0 0 10px;color:var(--gris);font-size:.9rem">Se encontraron ${data.total} certificados asociados a ese documento.</p>` : "";
  vRes.innerHTML = encabezado + data.resultados.map(tarjetaCert).join("");
}
function consultarVerificacion(dato){
  if(!CONFIG.verificacionURL){
    vRes.innerHTML = `<div class="res res-info"><div class="res-estado">${ICO_INFO}Servicio en configuración</div><p>La verificación en línea estará disponible muy pronto. Mientras tanto, escribe a <a href="${enlaceSolicitud(dato)}">${esc(CONFIG.correo)}</a>.</p></div>`;
    return;
  }
  vRes.innerHTML = `<div class="cargando">Verificando…</div>`;
  const nombre = "cbVerif" + Date.now();
  const script = document.createElement("script");
  const limite = setTimeout(()=>{ limpiar(); mostrarVerificacion(dato, null); }, 15000);
  function limpiar(){ clearTimeout(limite); try{ delete window[nombre]; }catch(e){ window[nombre]=undefined; } script.remove(); }
  window[nombre] = data => { limpiar(); mostrarVerificacion(dato, data); };
  script.onerror = () => { limpiar(); mostrarVerificacion(dato, null); };
  script.src = `${CONFIG.verificacionURL}?q=${encodeURIComponent(dato)}&callback=${nombre}`;
  document.body.appendChild(script);
}
if($("#form-verificar")) $("#form-verificar").addEventListener("submit",e=>{
  e.preventDefault();
  const dato = $("#v-dato").value.trim();
  if(dato.length < 3){ vRes.innerHTML = `<div class="res res-info"><div class="res-estado">${ICO_INFO}Falta el dato</div><p>Escribe el código del certificado o el RUT / pasaporte del titular.</p></div>`; $("#v-dato").focus(); return; }
  consultarVerificacion(dato);
});
/* Enlace directo desde el código QR del certificado: www.ideax.cl/?certificado=CODIGO */
(()=>{ try{ const c = new URLSearchParams(location.search).get("certificado"); if(c){ $("#v-dato").value = c; document.getElementById("verificar").scrollIntoView(); consultarVerificacion(c); } }catch(e){} })();

/* Comunicación con el servicio de inscripciones (Apps Script) */
async function llamarServicio(datos){
  const op = { method:"POST", headers:{ "Content-Type":"text/plain;charset=utf-8" }, body: JSON.stringify(datos) };
  /* No se reintenta: si la respuesta no se puede leer, la inscripción igual pudo quedar registrada */
  try{ const r = await fetch(CONFIG.inscripcionURL, op); return await r.json(); }
  catch(x){ return null; }
}
const fmtCLP = n => "$" + Math.round(Number(n)||0).toLocaleString("es-CL");

/* ===== Formulario de inscripción por pasos ===== */
const fForm = $("#formulario"), codRes = $("#codigo-res"), fBeca = $("#f-beca");
const SIN_BECA = /^(emp-.+|empresa|g\d+)$/;
const SIN_CODIGO = /^(emp-.+|empresa|g\d+)$/;
const CON_CONV = /^(ia|td|op|al|g\d+)$/;
let modoForm = "inscribir", pasoActual = 1;
const TOTAL_PASOS = 4;

/* RUT: valida dígito verificador */
function rutValido(v){
  const s = String(v||"").toUpperCase().replace(/[^0-9K]/g,"");
  const m = s.match(/^(\d{7,8})([0-9K])$/); if(!m) return false;
  let suma = 0, mul = 2;
  for(let i=m[1].length-1;i>=0;i--){ suma += Number(m[1][i])*mul; mul = mul===7 ? 2 : mul+1; }
  const r = 11 - (suma % 11), dv = r===11 ? "0" : r===10 ? "K" : String(r);
  return dv === m[2];
}
function formatoRut(v){
  const s = String(v||"").toUpperCase().replace(/[^0-9K]/g,""); if(s.length < 2) return v;
  const c = s.slice(0,-1).replace(/\B(?=(\d{3})+(?!\d))/g,"."); return c + "-" + s.slice(-1);
}
if(fForm) $("#f-documento").addEventListener("blur", e=>{ if($("#f-tipodoc").value==="RUT" && e.target.value.trim()) e.target.value = formatoRut(e.target.value); });
if(fForm) $("#f-tipodoc").addEventListener("change", e=>{ $("#f-documento").placeholder = e.target.value==="RUT" ? "12.345.678-9" : "Número del documento"; });

/* Pasos */
function mostrarPaso(n){
  pasoActual = Math.max(1, Math.min(TOTAL_PASOS, n));
  fForm.querySelectorAll(".paso").forEach(p=>p.classList.toggle("activo", Number(p.dataset.paso)===pasoActual));
  $("#barra-pasos").querySelectorAll("li").forEach((li,i)=>{ li.classList.toggle("activo", i+1===pasoActual); li.classList.toggle("hecho", i+1<pasoActual); });
  fForm.classList.toggle("primero", pasoActual===1);
  fForm.classList.toggle("ultimo", pasoActual===TOTAL_PASOS);
  if(pasoActual===TOTAL_PASOS) pintarResumen();
  $("#error-form").textContent = "";
}
function validarPaso(n){
  const f = fForm, err = $("#error-form");
  const falta = (el, msg) => { err.textContent = msg; el.focus(); el.classList.add("con-error"); return false; };
  fForm.querySelectorAll(".con-error").forEach(x=>x.classList.remove("con-error"));
  if(n===1){
    for(const id of ["f-nombres","f-apellidos","f-documento","f-correo","f-fechanac","f-nacionalidad","f-pais","f-ciudad"]){
      const el = $("#"+id); if(!el.value.trim()) return falta(el, "Completa todos los datos de este paso.");
    }
    if($("#f-tipodoc").value==="RUT" && !rutValido(f.documento.value)) return falta(f.documento, "Revisa tu RUT: el dígito verificador no corresponde.");
    if($("#f-tipodoc").value!=="RUT" && f.documento.value.replace(/[^0-9A-Za-z]/g,"").length < 5) return falta(f.documento, "Revisa tu número de documento.");
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.correo.value.trim())) return falta(f.correo, "Revisa el correo: debe tener la forma nombre@dominio.cl.");
    const nac = new Date(f.fechaNac.value), edad = (Date.now() - nac) / (365.25*864e5);
    if(!(edad >= 17 && edad < 100)) return falta(f.fechaNac, "Revisa tu fecha de nacimiento.");
  }
  if(n===2){
    if(!f.nivelEduc.value) return falta(f.nivelEduc, "Indica tu nivel educacional.");
  }
  if(n===3){
    const prog = f.programa.value;
    if(!prog) return falta(f.programa, "Selecciona el programa que te interesa.");
    if(CON_CONV.test(prog) && !convDe(prog).length) return falta(f.programa, "Este curso no tiene una convocatoria abierta. Usa el botón para que te avisemos cuando abra.");
    if(fBeca.checked && !SIN_BECA.test(prog)){
      if(contarPalabras(f.motivos.value) < 80) return falta(f.motivos, "Para postular a la beca, cuéntanos tus motivos en al menos 80 palabras.");
      const md = revisarDocs(); if(md) return falta($("#f-docs"), md);
    }
  }
  if(n===4){
    if(!$("#f-acepta").checked) return falta($("#f-acepta"), "Para inscribirte debes aceptar las condiciones de matrícula y la política de privacidad.");
  }
  err.textContent = ""; return true;
}
if(fForm) $("#b-siguiente").addEventListener("click", ()=>{ if(validarPaso(pasoActual)){ mostrarPaso(pasoActual+1); document.getElementById("inscripcion").scrollIntoView({behavior:"smooth"}); } });
if(fForm) $("#b-anterior").addEventListener("click", ()=>mostrarPaso(pasoActual-1));
function pintarResumen(){
  const f = fForm, prog = f.programa.value, nombreProg = prog ? f.programa.options[f.programa.selectedIndex].text : "";
  const cv = CON_CONV.test(prog) ? convDe(prog)[0] : null;
  $("#resumen-insc").innerHTML = `<b>${esc(f.nombres.value.trim()+" "+f.apellidos.value.trim())}</b> · ${esc(f.correo.value.trim())}<br>
    Programa: <b>${esc(nombreProg)}</b>${cv ? `<br>Cohorte: ${esc(cv.nombre)}, desde el ${esc(cv.inicio)}` : ""}${fBeca.checked && !SIN_BECA.test(prog) ? `<br>Postulas a una beca del ${esc(f.tramo.value)}%` : ""}`;
}

/* Modo: inscribirme o solo información */
function ponerModo(m){
  modoForm = m;
  fForm.classList.toggle("modo-info", m==="info");
  fForm.querySelectorAll(".modo-form button").forEach(b=>{ const on=b.dataset.modo===m; b.classList.toggle("activo",on); b.setAttribute("aria-checked",on); });
  if(m==="info"){ const n = ($("#f-nombres").value+" "+$("#f-apellidos").value).trim(); if(n && !$("#f-nombre").value) $("#f-nombre").value = n; }
  mostrarPaso(m==="info" ? pasoActual : 1);
  try{ actualizarPrograma(); }catch(e){}
}
document.querySelectorAll(".modo-form button").forEach(b=>b.addEventListener("click",()=>ponerModo(b.dataset.modo)));
document.querySelectorAll("[data-preseleccion]").forEach(a=>a.addEventListener("click",e=>{ e.preventDefault(); irAInscripcion(a.dataset.preseleccion, "inscribir"); }));
document.querySelectorAll("[data-info]").forEach(a=>a.addEventListener("click",e=>{ e.preventDefault(); irAInscripcion(a.dataset.info, "info"); }));

/* Convocatorias de los cursos sincrónicos */
let CONVOCATORIAS = null;
const convDe = cod => (CONVOCATORIAS || []).filter(c=>c.codigo===cod);
async function cargarConvocatorias(){
  if(!CONFIG.inscripcionURL) return;
  try{
    const r = await fetch(CONFIG.inscripcionURL, { method:"POST", headers:{ "Content-Type":"text/plain;charset=utf-8" }, body: JSON.stringify({ accion:"convocatorias" }) }).then(x=>x.json());
    CONVOCATORIAS = (r && r.convocatorias) || [];
  }catch(x){ CONVOCATORIAS = null; }
  pintarConvocatorias();
}
function pintarConvocatorias(){
  setTimeout(()=>{ try{ mostrarElegido(); }catch(e){} }, 0);
  /* Home: franja con la convocatoria abierta de cursos gratuitos */
  const franja = $("#franja-conv");
  if(franja){
    const gs = (CONVOCATORIAS || []).filter(c=>/^g\d+$/.test(c.codigo));
    franja.hidden = !gs.length;
    if(gs.length){
      const c = gs[0], n = new Set(gs.map(x=>x.codigo)).size;
      $("#franja-conv-txt").innerHTML = "<b>Convocatoria abierta.</b> " + (n === 1 ? "Un curso gratuito comienza" : n + " cursos gratuitos comienzan") +
        " el " + esc(String(c.inicio).replace(/^\S+ /, "")) + ". Inscripciones hasta el " + esc(c.cierre) + ".";
    }
  }
  document.querySelectorAll("#f-programa option").forEach(o=>{
    if(!CON_CONV.test(o.value)) return;
    if(!o.dataset.base) o.dataset.base = o.textContent;
    o.textContent = o.dataset.base + (CONVOCATORIAS && !convDe(o.value).length ? " (sin convocatoria abierta)" : "");
  });
  document.querySelectorAll("[data-conv]").forEach(s=>{
    if(!CONVOCATORIAS){ s.textContent = ""; return; }
    const c = convDe(s.dataset.conv)[0];
    s.className = "conv-estado " + (c ? "abierta" : "cerrada");
    s.textContent = c ? "Inicia el " + c.inicio.replace(/^\S+ /,"") : "Sin convocatoria abierta";
  });
  actualizarPrograma();
}
function htmlConv(cod){
  if(!CON_CONV.test(cod)) return "";
  if(!CONVOCATORIAS) return `<div class="conv-no">Confirmaremos la fecha de la próxima cohorte al recibir tu inscripción.</div>`;
  const cs = convDe(cod);
  if(!cs.length) return `<div class="conv-no"><b>Este curso no tiene una convocatoria abierta.</b> Deja tus datos en el paso 1 y te avisaremos por correo cuando abra la próxima cohorte.
    <button type="button" class="btn btn-noche" data-avisame="${cod}">Avísame cuando abra</button><span class="avisame-res"></span></div>`;
  const c = cs[0];
  return `<div class="conv-ok"><b>Próxima cohorte: ${esc(c.nombre)}</b>Comienza el ${esc(c.inicio)} y termina el ${esc(c.termino)}.${c.horario ? ` Sesiones en vivo ${esc(c.horario)}, hora de Chile.` : ""}
    <small>Inscripciones hasta el ${esc(c.cierre)} · ${c.cupos} cupos disponibles</small></div>`;
}
async function avisame(cod, res){
  if(!fForm){ irAInscripcion(cod, "inscribir"); return; }
  const f = fForm, correo = f.correo.value.trim(), nombre = (f.nombres.value+" "+f.apellidos.value).trim() || f.nombre.value.trim();
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)){
    try{ cerrar(); }catch(e){}
    ponerModo("inscribir"); f.programa.value = cod; actualizarPrograma(); mostrarPaso(1);
    document.getElementById("inscripcion").scrollIntoView({behavior:"smooth"});
    $("#error-form").textContent = "Escribe tu nombre y correo, y luego en el paso 3 presiona «Avísame cuando abra».";
    return;
  }
  res.textContent = "Registrando…";
  const r = await llamarServicio({ accion:"avisame", nombre, correo, programa:cod });
  res.textContent = r && r.ok ? "Listo, te avisaremos a " + correo + "." : "No pudimos registrarte; escríbenos a " + CONFIG.correo + ".";
}
document.addEventListener("click", e=>{ const b = e.target.closest("[data-avisame]"); if(b){ avisame(b.dataset.avisame, b.parentElement.querySelector(".avisame-res")); } });

/* Programa elegido: convocatoria, beca y código */
function actualizarPrograma(){
  if(!fForm) return;
  const prog = $("#f-programa").value;
  fForm.classList.toggle("sin-beca-prog", SIN_BECA.test(prog));
  fForm.classList.toggle("sin-codigo-prog", SIN_CODIGO.test(prog));
  if(SIN_BECA.test(prog)) fBeca.checked = false;
  fForm.classList.toggle("con-beca", fBeca.checked && modoForm !== "info");
  if(fBeca.checked){ $("#f-codigo").value = ""; codRes.textContent = ""; codRes.className = "codigo-res"; }
  $("#conv-box").innerHTML = modoForm==="info" ? "" : htmlConv(prog);
  const gratis = /^g\d+$/.test(prog);
  $("#modo-ayuda").textContent = modoForm==="info" ? "Te enviaremos el manual del estudiante y el brochure completo del programa, sin compromiso."
    : gratis ? "Los cursos gratuitos no tienen costo. Recibirás de inmediato la confirmación con la fecha de inicio de tu convocatoria."
    : fBeca.checked ? "Recibirás un acuse de tu solicitud de beca y, dentro de dos días hábiles, la resolución con el enlace de pago."
    : "Completa los cuatro pasos. Al final te enviaremos el brochure con el valor y el enlace de pago.";
  $("#txt-enviar").textContent = modoForm==="info" ? "Enviarme la información" : gratis ? "Inscribirme gratis" : (fBeca.checked ? "Inscribirme y postular a la beca" : "Inscribirme");
}
if(fForm) fBeca.addEventListener("change", actualizarPrograma);
if(fForm) $("#f-programa").addEventListener("change", ()=>{ actualizarPrograma(); if($("#f-codigo").value.trim()) revisarCodigo(); });
document.querySelectorAll("[data-beca]").forEach(a=>a.addEventListener("click",e=>{ e.preventDefault(); irAInscripcion(null, "inscribir", true); }));
const actualizarBeca = actualizarPrograma;

/* Código de descuento o de beca: consulta previa; el servicio lo vuelve a validar al inscribir */
async function revisarCodigo(){
  const f = fForm, cod = f.codigo.value.trim().toUpperCase();
  codRes.className = "codigo-res"; codRes.textContent = "";
  if(!cod) return;
  if(!f.programa.value){ codRes.className = "codigo-res mal"; codRes.textContent = "Primero selecciona el programa."; return; }
  if(!CONFIG.inscripcionURL){ codRes.textContent = "El código se aplicará al revisar tu inscripción."; return; }
  codRes.textContent = "Revisando código…";
  try{
    const r = await fetch(CONFIG.inscripcionURL, { method:"POST", headers:{ "Content-Type":"text/plain;charset=utf-8" },
      body: JSON.stringify({ accion:"codigo", codigo:cod, programa:f.programa.value, tipoDoc:f.tipoDoc.value, documento:f.documento.value }) }).then(x=>x.json());
    if(r && r.ok){
      codRes.className = "codigo-res ok";
      codRes.textContent = r.descuento >= 100 ? "Código válido: beca del 100%. No tendrás que pagar." : `Código válido: ${r.descuento}% de descuento. Valor final ${r.montoTexto || fmtCLP(r.monto)}.`;
    }else{ codRes.className = "codigo-res mal"; codRes.textContent = (r && r.error) || "El código no es válido."; }
  }catch(x){ codRes.textContent = "No pudimos revisar el código ahora; se aplicará al enviar tu inscripción si es válido."; }
}
if(fForm) $("#b-codigo").addEventListener("click", revisarCodigo);
if(fForm) $("#f-codigo").addEventListener("keydown", e=>{ if(e.key==="Enter"){ e.preventDefault(); revisarCodigo(); } });

/* Beca: motivos y documentos */
const contarPalabras = s => (s.trim().match(/\S+/g) || []).length;
if(fForm) $("#f-motivos").addEventListener("input", e=>{
  const n = contarPalabras(e.target.value), a = $("#motivos-ayuda");
  a.className = "beca-ayuda" + (n && n < 80 ? " mal" : "");
  a.textContent = n ? `${n} palabras. Te recomendamos unas 150; el mínimo es 80.` : "Te recomendamos unas 150 palabras; el mínimo es 80. Esta información es confidencial y solo se usa para evaluar tu solicitud.";
});
const TIPOS_DOC = ["application/pdf","image/jpeg","image/png"];
function revisarDocs(){
  const fl = Array.from($("#f-docs").files || []);
  if(fl.length > 3) return "Puedes adjuntar como máximo 3 documentos.";
  for(const x of fl){
    if(TIPOS_DOC.indexOf(x.type) < 0) return `«${x.name}» no es PDF, JPG ni PNG.`;
    if(x.size > 5*1024*1024) return `«${x.name}» supera los 5 MB.`;
  }
  return "";
}
if(fForm) $("#f-docs").addEventListener("change", ()=>{
  const a = $("#docs-ayuda"), m = revisarDocs(), fl = Array.from($("#f-docs").files || []);
  a.className = "beca-ayuda" + (m ? " mal" : "");
  a.textContent = m || (fl.length ? fl.map(x=>x.name).join(", ") : "Hasta 3 archivos PDF, JPG o PNG, de 5 MB cada uno.");
});
const leerBase64 = file => new Promise((ok, mal)=>{ const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1] || ""); r.onerror = mal; r.readAsDataURL(file); });

/* Envío */
if(fForm) fForm.addEventListener("submit", async e=>{
  e.preventDefault();
  const f = fForm, err = $("#error-form"), ok = $("#ok-form"), boton = f.querySelector('button[type="submit"]');
  err.textContent = ""; ok.classList.remove("visible");
  const prog = f.programa.value, nombreProg = prog ? f.programa.options[f.programa.selectedIndex].text.replace(/ \(sin convocatoria abierta\)$/,"") : "";
  let datos;
  if(modoForm === "info"){
    const nombre = f.nombre.value.trim(), correo = f.correo.value.trim();
    if(!nombre){ err.textContent = "Escribe tu nombre para continuar."; f.nombre.focus(); return; }
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)){ err.textContent = "Revisa el correo: debe tener la forma nombre@dominio.cl."; f.correo.focus(); return; }
    if(!prog){ err.textContent = "Selecciona el programa que te interesa."; f.programa.focus(); return; }
    datos = { accion:"informacion", nombre, correo, fono:f.fono.value.trim(), pais:f.pais.value.trim(), programa:prog, programaNombre:nombreProg, mensaje:f.mensaje.value.trim(), origen:location.href };
  }else{
    for(let n=1;n<=TOTAL_PASOS;n++){ if(!validarPaso(n)){ mostrarPaso(n); validarPaso(n); return; } }
    const v = id => $("#"+id).value.trim();
    datos = { accion:"inscripcion", nombres:v("f-nombres"), apellidos:v("f-apellidos"), nombre:(v("f-nombres")+" "+v("f-apellidos")).trim(),
      tipoDoc:v("f-tipodoc"), documento:v("f-documento"), correo:v("f-correo"), fono:v("f-fono"), fechaNac:v("f-fechanac"),
      nacionalidad:v("f-nacionalidad"), pais:v("f-pais"), ciudad:v("f-ciudad"), nivelEduc:v("f-niveleduc"), titulo:v("f-titulo"),
      institucion:v("f-institucion"), empresa:v("f-empresa"), cargo:v("f-cargo"), sector:v("f-sector"), experiencia:v("f-experiencia"),
      comoConocio:v("f-conocio"), programa:prog, programaNombre:nombreProg, codigo:SIN_CODIGO.test(prog) ? "" : v("f-codigo").toUpperCase(),
      mensaje:v("f-mensaje"), acepta:$("#f-acepta").checked, suscVox:$("#f-susc-vox").checked, suscCmia:$("#f-susc-cmia").checked,
      bolsa:$("#f-bolsa").checked, origen:location.href };
    const cv = CON_CONV.test(prog) ? convDe(prog)[0] : null; if(cv) datos.convocatoria = cv.id;
    if(fBeca.checked && !SIN_BECA.test(prog)){
      datos.codigo = "";
      try{
        const docs = [];
        for(const x of Array.from($("#f-docs").files || [])) docs.push({ nombre: x.name, tipo: x.type, base64: await leerBase64(x) });
        datos.beca = { pct: Number(f.tramo.value), motivos: f.motivos.value.trim(), docs };
      }catch(x){ err.textContent = "No pudimos leer los documentos adjuntos. Intenta de nuevo o envía la solicitud sin ellos."; return; }
    }
  }
  const correo = datos.correo;

  if(CONFIG.inscripcionURL){
    boton.disabled = true; boton.style.opacity = ".7";
    try{
      const r = await llamarServicio(datos);
      if(r && r.ok === false){
        err.textContent = r.error || `No pudimos registrar tu inscripción. Escribe a ${CONFIG.correo}.`;
        if(r.codigoError === "DOCUMENTO_INVALIDO" || r.codigoError === "DOCUMENTO_REQUERIDO") mostrarPaso(1);
        if(r.codigoError === "SIN_CONVOCATORIA"){ cargarConvocatorias(); mostrarPaso(3); }
        return;
      }
      let texto;
      if(r && r.estado === "Inscrito gratuito") texto = `<b>¡Inscripción confirmada!</b> Ya estás en el curso gratuito <b>${esc(nombreProg.replace(/^Curso gratuito: /,""))}</b>. Te enviamos a <b>${esc(correo)}</b> tu fecha de inicio, el manual del estudiante y las indicaciones para comenzar.`;
      else if(r && r.estado === "Beca en evaluación") texto = `<b>¡Solicitud de beca recibida!</b> Tu inscripción en <b>${esc(nombreProg)}</b> quedó en evaluación, sin cobro. Te enviamos un acuse a <b>${esc(correo)}</b> y, en un plazo de hasta dos días hábiles, te llegará la resolución con el enlace de pago por el valor que corresponda.`;
      else if(modoForm === "info") texto = `<b>¡Listo!</b> Te enviamos a <b>${esc(correo)}</b> el manual del estudiante y el brochure completo de <b>${esc(nombreProg)}</b>. Cuando quieras inscribirte, vuelve a este formulario.`;
      else if(r && r.estado === "Becado") texto = `<b>¡Inscripción confirmada!</b> Tienes beca completa en <b>${esc(nombreProg)}</b>. Te enviamos a <b>${esc(correo)}</b> el material y las indicaciones para comenzar.`;
      else if(r && r.estado === "Sin cobro en línea") texto = `<b>¡Solicitud recibida!</b> Te enviamos a <b>${esc(correo)}</b> la información de <b>${esc(nombreProg)}</b> y te contactaremos para los siguientes pasos.`;
      else texto = `<b>¡Inscripción recibida!</b> Te enviamos a <b>${esc(correo)}</b> el brochure de <b>${esc(nombreProg)}</b>${r && r.monto ? `, con el valor de <b>${fmtCLP(r.monto)}</b>${r.descuento ? ` (descuento del ${r.descuento}%)` : ""}` : ""} y el enlace de pago de Mercado Pago, en hasta 12 cuotas.`;
      ok.innerHTML = texto + " Si no lo ves en unos minutos, revisa la carpeta de spam.";
      ok.classList.add("visible"); const mAct = modoForm; f.reset(); ponerModo(mAct); mostrarPaso(1);
      codRes.textContent = ""; $("#docs-ayuda").textContent = "Hasta 3 archivos PDF, JPG o PNG, de 5 MB cada uno."; $("#docs-ayuda").className = "beca-ayuda";
      if(CON_CONV.test(prog)) cargarConvocatorias();
    }catch(x){
      err.textContent = `No pudimos enviar tu inscripción. Intenta nuevamente o escribe a ${CONFIG.correo}.`;
    }finally{ boton.disabled = false; boton.style.opacity = ""; }
    return;
  }
  /* Respaldo mientras el servicio no esté conectado: correo a contacto@ideax.cl */
  const asunto = (modoForm==="info" ? "Solicitud de información IDEAX: " : "Inscripción IDEAX: ") + nombreProg;
  const cuerpo = Object.keys(datos).filter(k=>typeof datos[k]==="string" && k!=="origen" && k!=="accion").map(k=>k+": "+datos[k]).join("\n");
  ok.innerHTML = `Se abrirá tu correo con la inscripción lista para enviar. Si no se abre, escribe a <b>${CONFIG.correo}</b> indicando el programa <b>${esc(nombreProg)}</b>.`;
  ok.classList.add("visible");
  window.location.href = `mailto:${CONFIG.correo}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
});

/* Condiciones de matrícula y política de privacidad */
const dlgCond = $("#condiciones");
document.addEventListener("click", e=>{ const a = e.target.closest("[data-abrir-condiciones]"); if(!a || !dlgCond) return; e.preventDefault();
  if(typeof dlgCond.showModal==="function") dlgCond.showModal(); else dlgCond.setAttribute("open",""); dlgCond.scrollTop = 0; });
document.querySelectorAll("[data-cerrar-cond]").forEach(b=>b.addEventListener("click",()=>{ dlgCond.close ? dlgCond.close() : dlgCond.removeAttribute("open"); }));
if(dlgCond) dlgCond.addEventListener("click", e=>{ if(e.target===dlgCond) dlgCond.close(); });

/* Brochures oficiales en Drive: el script entrega sus enlaces de descarga */
let BROCHURES = null;
async function cargarBrochures(){
  if(!CONFIG.inscripcionURL) return;
  try{
    const r = await fetch(CONFIG.inscripcionURL, { method:"POST", headers:{ "Content-Type":"text/plain;charset=utf-8" }, body: JSON.stringify({ accion:"brochures" }) }).then(x=>x.json());
    BROCHURES = (r && r.brochures) || null;
  }catch(x){ BROCHURES = null; }
  document.querySelectorAll("[data-bro]").forEach(a=>{ const u = BROCHURES && BROCHURES[a.dataset.bro]; if(u){ a.href = u; a.hidden = false; } });
}

/* Programa elegido: recuadro al inicio del formulario (página de inscripción) */
function mostrarElegido(){
  const caja = $("#programa-elegido"); if(!caja || !fForm) return;
  const sel = $("#f-programa"), o = sel.options[sel.selectedIndex];
  if(!sel.value){ caja.hidden = true; return; }
  caja.hidden = false;
  caja.querySelector("b").textContent = (o.dataset.base || o.textContent).replace(/ \(sin convocatoria abierta\)$/, "");
}
if(fForm){
  mostrarPaso(1);
  /* Enlace directo: www.ideax.cl/inscripcion/?curso=g1 (también &modo=info y &beca=1) */
  try{
    const q = new URLSearchParams(location.search);
    const cod = String(q.get("curso") || q.get("programa") || "").toLowerCase().trim();
    if(q.get("modo") === "info") ponerModo("info");
    if(cod && [...$("#f-programa").options].some(o=>o.value === cod)) $("#f-programa").value = cod;
    if(q.get("beca") === "1" && !SIN_BECA.test($("#f-programa").value)) fBeca.checked = true;
  }catch(e){}
  $("#f-programa").addEventListener("change", mostrarElegido);
  const cambiar = $("#cambiar-programa");
  if(cambiar) cambiar.addEventListener("click", e=>{ e.preventDefault(); for(let n=1;n<3;n++){ if(!validarPaso(n)){ mostrarPaso(n); return; } } mostrarPaso(3); $("#f-programa").focus(); });
}
actualizarPrograma(); mostrarElegido(); cargarConvocatorias(); cargarBrochures();

/* Regreso desde Mercado Pago al pagar una copia: www.ideax.cl/verificar/?copia=aprobado | pendiente | rechazado */
(()=>{
  let estado; try{ estado = new URLSearchParams(location.search).get("copia"); }catch(e){ return; }
  const textos = {
    aprobado: ["ok","¡Pago recibido!","En unos minutos te llegará al correo la copia digital. Si pediste la apostilla, te avisaremos por correo cuando despachemos el documento físico."],
    pendiente: ["pend","Pago en proceso","Mercado Pago está procesando tu pago. Cuando se confirme, te enviaremos la copia automáticamente."],
    rechazado: ["mal","El pago no se completó",`No se realizó ningún cobro. Puedes usar de nuevo el enlace que te llegó al correo mientras esté vigente, o escribirnos a ${CONFIG.correo}.`]
  };
  const t = textos[estado]; if(!t) return;
  const d = document.createElement("div");
  d.className = "aviso-pago " + t[0]; d.setAttribute("role","status");
  d.innerHTML = `<b>${t[1]}</b><p>${esc(t[2])}</p><button type="button" aria-label="Cerrar">×</button>`;
  d.querySelector("button").onclick = () => d.remove();
  document.body.appendChild(d);
  try{ history.replaceState(null, "", location.pathname + location.hash); }catch(e){}
})();

/* Regreso desde Mercado Pago: www.ideax.cl/?pago=aprobado | pendiente | rechazado */
(()=>{
  let estado; try{ estado = new URLSearchParams(location.search).get("pago"); }catch(e){ return; }
  const textos = {
    aprobado: ["ok","¡Pago recibido!","Gracias. En unos minutos te llegará al correo el manual, el programa de trabajo, las indicaciones y tus accesos a la Facultad Virtual de IDEAX."],
    pendiente: ["pend","Pago en proceso","Mercado Pago está procesando tu pago. Cuando se confirme, te enviaremos automáticamente el material y tus accesos."],
    rechazado: ["mal","El pago no se completó",`No se realizó ningún cobro. Puedes intentarlo de nuevo con el enlace que te llegó al correo o escribirnos a ${CONFIG.correo}.`]
  };
  const t = textos[estado]; if(!t) return;
  const d = document.createElement("div");
  d.className = "aviso-pago " + t[0]; d.setAttribute("role","status");
  d.innerHTML = `<b>${t[1]}</b><p>${esc(t[2])}</p><button type="button" aria-label="Cerrar">×</button>`;
  d.querySelector("button").onclick = () => d.remove();
  document.body.appendChild(d);
  try{ history.replaceState(null, "", location.pathname + location.hash); }catch(e){}
})();

/* ===== Módulos y docentes ===== */
document.querySelectorAll(".modulo").forEach(m=>{
  const n=m.querySelectorAll(".curso").length, b=document.createElement("button");
  b.type="button"; b.className="ver-cursos"; b.textContent=`Ver los ${n} cursos`;
  m.querySelector(".cursos").before(b);
  b.addEventListener("click",()=>{ const a=m.classList.toggle("abierto"); b.textContent=a?"Ocultar cursos":`Ver los ${n} cursos`; });
});
document.querySelectorAll(".docente").forEach(d=>{
  const s=document.createElement("div"); s.className="mas"; s.textContent="Ver trayectoria"; d.append(s);
  d.tabIndex=0;
  const tog=()=>{ const a=d.classList.toggle("abierto"); s.textContent=a?"Ocultar":"Ver trayectoria"; };
  d.addEventListener("click",tog); d.addEventListener("keydown",e=>{ if(e.key==="Enter"){ e.preventDefault(); tog(); } });
});
if(document.getElementById("ver-faq")) document.getElementById("ver-faq").addEventListener("click",()=>document.getElementById("preguntas").classList.add("todas"));

/* ===== Página de programas: filtro por formato (www.ideax.cl/programas/?f=gratuitos) ===== */
(()=>{
  const barra = $("#filtro-formatos"); if(!barra) return;
  const botones = [...barra.querySelectorAll("button[data-f]")];
  function filtrar(f, mover){
    if(!botones.some(b=>b.dataset.f===f)) f = "todos";
    botones.forEach(b=>{ const on = b.dataset.f===f; b.classList.toggle("activo", on); b.setAttribute("aria-pressed", on); });
    document.querySelectorAll("[data-formato]").forEach(s=>{ s.hidden = !(f==="todos" || s.dataset.formato.split(" ").indexOf(f) !== -1); });
    try{ const u = new URL(location.href); if(f==="todos") u.searchParams.delete("f"); else u.searchParams.set("f", f); history.replaceState(null, "", u); }catch(e){}
    if(mover) barra.scrollIntoView({behavior:"smooth", block:"start"});
  }
  botones.forEach(b=>b.addEventListener("click", ()=>filtrar(b.dataset.f, false)));
  let f = "todos";
  try{
    const q = new URLSearchParams(location.search);
    f = q.get("f") || "todos";
    const area = q.get("area");
    if(area){ f = "diplomados"; const t = document.querySelector('.area-tab[data-area="' + area.replace(/[^a-z0-9-]/gi,"") + '"]'); if(t) t.click(); }
  }catch(e){}
  filtrar(f, f !== "todos" && !location.hash);
})();
