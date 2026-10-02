// ==UserScript==
// @name         Certificados Calidad Autofill - Hanna Colombia
// @namespace    https://intranet.hannacolombia.com/
// @version      1.2.0
// @description  Pega en el formulario "Crear Certificado de Calidad" de la intranet lo que se copió con el botón "Copiar para Intranet" del sistema de Servicio Técnico (soluciones, mediciones, checklist, fecha, técnico, adjuntos PDF y COA de las soluciones estándar). Equipos y el número de factura se llenan con "Cargar Datos" de la intranet — úsalo antes de pegar: de ahí se toman código, nombre y serie del equipo que no se escribieron en el sistema.
// @author       Script generado para Hanna Colombia
// @match        https://intranet.hannacolombia.com/certificados_calidad*
// @grant        GM_xmlhttpRequest
// @connect      www.documentation.hannainst.com
// @run-at       document-idle
// ==/UserScript==

// Cómo funciona: en servicio-tecnico-hanna, al armar un certificado hay un
// botón "Copiar para Intranet" que copia al portapapeles un JSON con el
// prefijo HANNA_CERT_V1:. Este script agrega un botón flotante que lee ese
// portapapeles y llena los campos del formulario buscándolos por el texto
// de sus encabezados/etiquetas — no depende de IDs internos de la intranet,
// así que sigue funcionando aunque cambien nombres de campos por dentro,
// pero SÍ depende de que el texto visible de las etiquetas no cambie.
//
// Si algún campo no se llena, revisa en la consola del navegador (F12) los
// mensajes que empiezan con [Certificados Autofill] — indican qué etiqueta
// no se pudo encontrar, para ajustar el texto en SECCIONES/CHECKLIST_COLS.

(function () {
  'use strict';

  const MARKER = 'HANNA_CERT_V1:';
  const ADJUNTO_URL_TTL_MIN = 5; // debe coincidir con ADJUNTO_URL_TTL_SEGUNDOS del lado de la app
  const LOG = (...args) => console.log('[Certificados Autofill]', ...args);
  const WARN = (...args) => console.warn('[Certificados Autofill]', ...args);
  // Avisos para el técnico: además de la consola, se muestran en el resumen
  // que aparece al terminar de pegar (antes solo quedaban en F12).
  let avisos = [];
  const AVISO = msg => { WARN(msg); avisos.push(msg); };

  // Encabezados de sección tal como aparecen en la página (barra gris) y las
  // 3 columnas del bloque "Test funcional, test físico y embalaje", que
  // funcionan como sub-encabezados dentro de esa sección.
  const SECCIONES = {
    soluciones: 'Soluciones Estándar y/o Equipos patrones utilizados',
    mediciones: 'Mediciones',
    testFuncional: 'Test Funcional',
    embalaje: 'Embalaje',
    controlEstetico: 'Control Estético',
    otros: 'Otros',
    archivosAdjuntos: 'Archivos Adjuntos',
  };

  function normalize(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  // Recorre todo el documento en orden y, cada vez que encuentra un nodo
  // "hoja" (sin hijos elemento) cuyo texto coincide con una de las etiquetas
  // de SECCIONES, marca esa como la sección activa; cada <input>/<textarea>
  // que aparece después se agrupa bajo la última sección vista. Así no
  // depende de si el maquetado real usa <table>, <div> o lo que sea.
  function mapCamposPorSeccion() {
    const buckets = {};
    Object.keys(SECCIONES).forEach(k => { buckets[k] = { inputs: [], checkboxes: [] }; });

    let seccionActual = null;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, null);
    let node = walker.currentNode;
    while (node) {
      if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') {
        if (seccionActual) {
          if (node.tagName === 'INPUT' && node.type === 'checkbox') {
            buckets[seccionActual].checkboxes.push(node);
          } else {
            buckets[seccionActual].inputs.push(node);
          }
        }
      } else if (node.children.length === 0) {
        const texto = normalize(node.textContent);
        for (const [key, label] of Object.entries(SECCIONES)) {
          if (texto === label) { seccionActual = key; break; }
        }
      }
      node = walker.nextNode();
    }
    return buckets;
  }

  // Campos donde el técnico escribe: excluye hidden (tokens/ids internos del
  // formulario), file, botones, radios, etc. Si un hidden caía dentro de una
  // sección, corría una posición todas las columnas de la grilla de
  // Soluciones o recibía un ítem extra del checklist.
  const TIPOS_NO_EDITABLES = ['hidden', 'file', 'button', 'submit', 'reset', 'image', 'radio', 'checkbox'];
  function esEditable(el) {
    if (el.tagName === 'TEXTAREA') return !el.disabled && !el.readOnly;
    return !TIPOS_NO_EDITABLES.includes((el.type || 'text').toLowerCase()) && !el.disabled && !el.readOnly;
  }

  function setValue(el, value) {
    if (!el || value == null) return;
    const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Llena una tabla tipo grilla (N columnas x M filas de <input>) agrupando
  // los inputs de la sección en bloques de "columnas.length" y asignando los
  // valores de cada fila de datos en ese orden.
  function fillGrid(todos, columnas, filas, nombreSeccion) {
    if (filas.length === 0) return;
    const inputs = todos.filter(esEditable);
    const filasDisponibles = Math.floor(inputs.length / columnas.length);
    if (filasDisponibles === 0) {
      AVISO(`No se encontraron campos para la sección "${nombreSeccion}". Revisa SECCIONES en el script.`);
      return;
    }
    if (filas.length > filasDisponibles) {
      AVISO(`"${nombreSeccion}" tiene ${filas.length} filas pero el formulario solo mostró ${filasDisponibles}. Las que sobran quedan sin copiar — agrégalas a mano.`);
    }
    filas.slice(0, filasDisponibles).forEach((fila, i) => {
      columnas.forEach((campo, j) => {
        const input = inputs[i * columnas.length + j];
        const valor = typeof campo === 'function' ? campo(fila, input) : fila[campo];
        setValue(input, valor || '');
      });
    });
  }

  // Fecha de expiración de una solución: el formato depende del tipo de
  // campo que tenga la intranet ("05-2027" en texto, "2027-05" en un
  // <input type="month">, primer día del mes en un <input type="date">).
  function fechaExpiracionPara(fila, input) {
    const iso = fila.fechaExpiracionIso || '';
    if (input && input.type === 'month') return iso;
    if (input && input.type === 'date') return iso ? `${iso}-01` : '';
    return fila.fechaExpiracion;
  }

  // ---- COA (certificados de análisis) de documentation.hannainst.com ----
  // Esa página no acepta consultas desde otros sitios (sin CORS), por eso se
  // usa GM_xmlhttpRequest de Tampermonkey. Busca por código y lote; ambos
  // filtros son "contiene", así que se exige que el lote coincida exacto.
  const COA_BASE = 'https://www.documentation.hannainst.com';

  function gmRequest(opts) {
    return new Promise((resolve, reject) => {
      if (typeof GM_xmlhttpRequest !== 'function') {
        reject(new Error('GM_xmlhttpRequest no disponible (¿falta @grant en el userscript?)'));
        return;
      }
      GM_xmlhttpRequest({
        ...opts,
        onload: r => (r.status >= 200 && r.status < 300 ? resolve(r) : reject(new Error(`HTTP ${r.status}`))),
        onerror: () => reject(new Error('error de red')),
        ontimeout: () => reject(new Error('tiempo de espera agotado')),
        timeout: 30000,
      });
    });
  }

  // "HI 7004/1L" → "HI7004" (el sitio lo guarda como "HI7004-1L"); el lote
  // "SC0149/26" → "SC0149-26".
  function coaCodigoBase(codigo) { return codigo.replace(/\s+/g, '').split('/')[0].toUpperCase(); }
  function coaLote(lote) { return lote.trim().replace(/\//g, '-').toUpperCase(); }

  async function buscarCoa({ codigo, lote }) {
    const params = new URLSearchParams({
      draw: '1', start: '0', length: '50', code: coaCodigoBase(codigo), lot: coaLote(lote), location: 'view',
    });
    const r = await gmRequest({
      method: 'GET',
      url: `${COA_BASE}/coa-certificate?${params}`,
      headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
    });
    const filas = (JSON.parse(r.responseText).data || []).filter(f => String(f.lot).toUpperCase() === coaLote(lote));
    if (!filas.length) return null;
    // Preferir español si el sitio lo tiene; si no, el más reciente.
    filas.sort((a, b) => (b.region === 'ES') - (a.region === 'ES') || String(b.date).localeCompare(String(a.date)));
    return filas[0];
  }

  async function descargarCoa(coa) {
    const encontrado = await buscarCoa(coa);
    if (!encontrado) return null;
    const r = await gmRequest({ method: 'GET', url: `${COA_BASE}/coa-certificate/download/${encontrado.id}`, responseType: 'blob' });
    const nombre = `COA ${encontrado.code} lote ${encontrado.lot}.pdf`;
    return new File([r.response], nombre, { type: 'application/pdf' });
  }

  function getCheckboxLabelText(checkbox) {
    const label = checkbox.closest('label');
    if (label) return normalize(label.textContent);
    if (checkbox.nextSibling && checkbox.nextSibling.nodeType === Node.TEXT_NODE) {
      const t = normalize(checkbox.nextSibling.textContent);
      if (t) return t;
    }
    if (checkbox.nextElementSibling) return normalize(checkbox.nextElementSibling.textContent);
    return '';
  }

  function fillChecklistColumna(bucket, marcados, extras, nombreSeccion) {
    const marcadosNorm = marcados.map(normalize);
    let matched = 0;
    bucket.checkboxes.forEach(cb => {
      const texto = getCheckboxLabelText(cb);
      if (marcadosNorm.some(m => m.toLowerCase() === texto.toLowerCase())) {
        cb.checked = true;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
        matched++;
      }
    });
    if (marcados.length && matched < marcados.length) {
      AVISO(`"${nombreSeccion}": se marcaron ${matched}/${marcados.length} ítems del checklist. Revisa si el texto de algún checkbox no coincide exactamente.`);
    }
    // Los ítems "extra" (no predefinidos) van en los cuadros de texto en blanco
    // que hay debajo de los checkboxes de cada columna.
    const vacios = bucket.inputs.filter(inp => esEditable(inp) && !inp.value);
    extras.forEach((valor, i) => {
      if (vacios[i]) setValue(vacios[i], valor);
      else AVISO(`"${nombreSeccion}": no quedan cuadros en blanco para el ítem extra "${valor}" — agrégalo a mano.`);
    });
  }

  // Los <input type="file"> bloquean que un script les asigne un valor
  // directamente por seguridad, pero SÍ aceptan que se les asigne un
  // FileList armado con DataTransfer — es la técnica estándar que también
  // usan las herramientas de testing automatizado (Cypress, Playwright,
  // etc.) para simular la selección de un archivo.
  // Primero los COA de las soluciones estándar y luego los archivos elegidos
  // en el sistema, cada uno en el siguiente campo "Adjunto" libre.
  async function fillAdjuntos(bucket, adjuntos, coas) {
    const fileInputs = bucket.inputs.filter(el => el.tagName === 'INPUT' && el.type === 'file');
    const tareas = [
      ...(coas || []).map(c => ({
        etiqueta: `COA ${c.codigo} lote ${c.lote}`,
        obtener: async () => {
          const file = await descargarCoa(c);
          // Normal en termómetros/equipos patrón y reactivos: no tienen COA allí.
          if (!file) throw new Error('sin COA publicado en documentation.hannainst.com (normal en equipos patrón y reactivos)');
          return file;
        },
      })),
      ...(adjuntos || []).map(a => ({
        etiqueta: a.nombre,
        obtener: async () => {
          const resp = await fetch(a.url);
          if (!resp.ok) throw new Error(`HTTP ${resp.status} (¿pasaron más de ${ADJUNTO_URL_TTL_MIN} min desde que copiaste?)`);
          const blob = await resp.blob();
          return new File([blob], a.nombre, { type: blob.type || 'application/pdf' });
        },
      })),
    ];
    if (tareas.length === 0) return;
    if (fileInputs.length === 0) {
      AVISO('No se encontraron los campos "Adjunto" en "Archivos Adjuntos" — adjunta los PDF a mano.');
      return;
    }

    let campo = 0;
    for (const tarea of tareas) {
      if (campo >= fileInputs.length) {
        AVISO(`Sin campo "Adjunto" libre para "${tarea.etiqueta}" — adjúntalo a mano.`);
        continue;
      }
      try {
        const file = await tarea.obtener();
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInputs[campo].files = dt.files;
        fileInputs[campo].dispatchEvent(new Event('change', { bubbles: true }));
        LOG(`"${file.name}" adjuntado en el campo ${campo + 1}.`);
        campo++;
      } catch (e) {
        AVISO(`${tarea.etiqueta}: ${e.message}`);
      }
    }
  }

  // ---- Datos de la tabla Equipos ----
  // "Cargar Datos" llena equipos[n][codigo|nombre|serie] desde la factura.
  // Lo que el técnico dejó vacío en el sistema (Ref., código y lote de un
  // reactivo; título de una tabla) llega como {{EQUIPO<k>.campo}} y se
  // completa aquí con la fila de Equipos de ese bloque.
  const MARCADOR_EQUIPO = /\{\{EQUIPO(\d+)\.(codigo|nombre|serie)\}\}/g;
  const tieneMarcadores = texto => /\{\{EQUIPO\d+\.(codigo|nombre|serie)\}\}/.test(texto || '');
  const normCodigo = c => (c || '').replace(/\s+/g, '').toUpperCase();

  function leerEquiposIntranet() {
    const filas = [];
    for (let n = 1; document.querySelector(`input[name="equipos[${n}][codigo]"]`); n++) {
      const val = campo => normalize((document.querySelector(`input[name="equipos[${n}][${campo}]"]`) || {}).value);
      if (val('codigo')) filas.push({ codigo: val('codigo'), nombre: val('nombre'), serie: val('serie') });
    }
    return filas;
  }

  // Cada bloque de Mediciones corresponde a un equipo: primero se empareja
  // por código (la "pista" del bloque: código del producto, título escrito o
  // plantilla del equipo); los que queden, por orden, pero solo si quedan
  // tantos bloques como filas — si no, no se adivina.
  function emparejarBloques(bloques, equipos) {
    const asignados = bloques.map(() => null);
    const usadas = new Set();
    bloques.forEach((b, k) => {
      const pista = normCodigo(b && b.pista);
      if (!pista) return;
      const i = equipos.findIndex((e, j) => !usadas.has(j) && normCodigo(e.codigo) === pista);
      if (i >= 0) { asignados[k] = equipos[i]; usadas.add(i); }
    });
    const bloquesLibres = asignados.map((a, k) => (a ? -1 : k)).filter(k => k >= 0);
    const filasLibres = equipos.map((e, j) => (usadas.has(j) ? -1 : j)).filter(j => j >= 0);
    if (bloquesLibres.length === filasLibres.length) {
      bloquesLibres.forEach((k, x) => { asignados[k] = equipos[filasLibres[x]]; });
    }
    return asignados;
  }

  function completarDesdeEquipos(texto, bloques) {
    if (!tieneMarcadores(texto)) return texto;
    const asignados = emparejarBloques(bloques || [], leerEquiposIntranet());
    const faltantes = [];
    const resultado = texto.replace(MARCADOR_EQUIPO, (m, n, campo) => {
      const equipo = asignados[Number(n) - 1];
      if (equipo && equipo[campo]) return equipo[campo];
      faltantes.push(`bloque ${n} (${campo})`);
      return '[COMPLETAR]';
    });
    if (faltantes.length) {
      AVISO(`Mediciones: no se pudo saber qué equipo de la tabla Equipos corresponde a ${faltantes.join(', ')} — quedó "[COMPLETAR]" en el texto, corrígelo a mano.`);
    }
    return resultado;
  }

  // Resumen al terminar de pegar: verde si todo salió bien, ámbar con la
  // lista de lo que hay que revisar. No bloquea la página como un alert().
  function mostrarResumen(lista) {
    const previo = document.getElementById('hanna-cert-autofill-resumen');
    if (previo) previo.remove();
    const caja = document.createElement('div');
    caja.id = 'hanna-cert-autofill-resumen';
    Object.assign(caja.style, {
      position: 'fixed', top: '56px', right: '12px', zIndex: 9999, maxWidth: '420px',
      padding: '12px 34px 12px 14px', borderRadius: '8px', fontSize: '13px', fontFamily: 'Arial, sans-serif',
      lineHeight: '1.4', boxShadow: '0 2px 8px rgba(0,0,0,.2)',
      background: lista.length ? '#fff4e5' : '#e8f5e9', color: lista.length ? '#663c00' : '#1b5e20',
      border: `1px solid ${lista.length ? '#ffb74d' : '#81c784'}`,
    });
    const titulo = document.createElement('strong');
    titulo.textContent = lista.length ? 'Certificado pegado — revisa:' : '✔ Certificado pegado';
    caja.appendChild(titulo);
    if (lista.length) {
      const ul = document.createElement('ul');
      ul.style.margin = '6px 0 0';
      ul.style.paddingLeft = '18px';
      lista.forEach(t => { const li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
      caja.appendChild(ul);
    }
    const cerrar = document.createElement('button');
    cerrar.type = 'button';
    cerrar.textContent = '×';
    Object.assign(cerrar.style, { position: 'absolute', top: '4px', right: '8px', border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer', color: 'inherit' });
    cerrar.addEventListener('click', () => caja.remove());
    caja.appendChild(cerrar);
    document.body.appendChild(caja);
    if (!lista.length) setTimeout(() => caja.remove(), 5000);
  }

  // Busca un input/textarea que esté justo después (en el DOM) de un texto
  // "Etiqueta:" — usado para Fecha y Técnico dentro de "Otros". `valor` puede
  // ser una función que recibe el input encontrado (p. ej. para elegir el
  // formato de fecha según si es type="date" o un campo de texto).
  function fillCampoPorEtiqueta(bucketOtros, etiqueta, valor) {
    const candidatos = document.evaluate(
      `//*[not(*)][normalize-space(text())="${etiqueta}" or normalize-space(text())="${etiqueta}:"]`,
      document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null
    );
    const encontrados = [];
    for (let i = 0; i < candidatos.snapshotLength; i++) {
      const el = candidatos.snapshotItem(i);
      let input = el.nextElementSibling;
      if (!input || (input.tagName !== 'INPUT' && input.tagName !== 'TEXTAREA')) {
        input = el.parentElement ? el.parentElement.querySelector('input, textarea') : null;
      }
      if (input && esEditable(input)) encontrados.push(input);
    }
    // "Fecha" puede aparecer también más arriba (p. ej. datos de la factura):
    // se prefiere el campo que está dentro de la sección "Otros".
    const input = encontrados.find(inp => bucketOtros.inputs.includes(inp)) || encontrados[0];
    if (!input) { AVISO(`No se encontró el campo "${etiqueta}" dentro de "Otros".`); return; }
    setValue(input, typeof valor === 'function' ? valor(input) : valor);
  }

  // Devuelve false si no pegó nada (falta "Cargar Datos").
  async function aplicarCertificado(payload) {
    // Sin la tabla Equipos cargada no hay de dónde sacar lo que el técnico
    // dejó vacío: mejor no pegar nada a medias.
    if (tieneMarcadores(payload.medicionesHtml) && leerEquiposIntranet().length === 0) {
      alert('Primero carga la factura con "Cargar Datos": algunos datos de Mediciones (código, nombre o serie del equipo) se toman de la tabla Equipos.\n\nLuego vuelve a pulsar "Pegar desde Servicio Técnico" (el certificado sigue copiado).');
      return false;
    }
    const buckets = mapCamposPorSeccion();

    // Equipos NO se pega: la intranet ya los carga sola al hacer "Cargar Datos"
    // con el número de factura.
    fillGrid(buckets.soluciones.inputs, ['codigo', 'lote', fechaExpiracionPara, 'descripcion'], payload.soluciones, 'Soluciones');

    const textarea = buckets.mediciones.inputs.find(el => el.tagName === 'TEXTAREA');
    if (textarea) setValue(textarea, completarDesdeEquipos(payload.medicionesHtml, payload.bloques));
    else AVISO('No se encontró el textarea de "Mediciones".');

    fillChecklistColumna(buckets.testFuncional, payload.checklist.testFuncional, payload.checklist.testFuncionalExtra, 'Test Funcional');
    fillChecklistColumna(buckets.embalaje, payload.checklist.embalaje, payload.checklist.embalajeExtra, 'Embalaje');
    fillChecklistColumna(buckets.controlEstetico, payload.checklist.controlEstetico, payload.checklist.controlEsteticoExtra, 'Control Estético');

    // <input type="date"> exige "aaaa-mm-dd"; un campo de texto se llena con
    // "dd/mm/aaaa", que es como lo escribiría el técnico a mano.
    fillCampoPorEtiqueta(buckets.otros, 'Fecha', input => (input.type === 'date' ? payload.fecha : payload.fechaDisplay));
    fillCampoPorEtiqueta(buckets.otros, 'Técnico', payload.tecnico);

    await fillAdjuntos(buckets.archivosAdjuntos, payload.adjuntos, payload.coas);

    LOG('Certificado pegado:', payload);
    return true;
  }

  async function handleClick(e) {
    const btn = e.currentTarget;
    let raw;
    try {
      raw = await navigator.clipboard.readText();
    } catch (err) {
      alert('No se pudo leer el portapapeles. Si el navegador pidió permiso, acéptalo e intenta de nuevo.');
      WARN('Error leyendo el portapapeles:', err);
      return;
    }
    if (!raw || !raw.startsWith(MARKER)) {
      alert('El portapapeles no tiene un certificado copiado. Ve al sistema de Servicio Técnico y usa "Copiar para Intranet" primero.');
      return;
    }
    let payload;
    try {
      payload = JSON.parse(raw.slice(MARKER.length));
    } catch (err) {
      alert('El certificado copiado está dañado o incompleto.');
      WARN('Error parseando el JSON:', err);
      return;
    }

    const textoOriginal = btn.textContent;
    btn.disabled = true;
    const conAdjuntos = (payload.adjuntos && payload.adjuntos.length) || (payload.coas && payload.coas.length);
    btn.textContent = conAdjuntos ? '⏳ Pegando y adjuntando PDFs...' : '⏳ Pegando...';
    avisos = [];
    try {
      if (await aplicarCertificado(payload)) mostrarResumen(avisos);
    } catch (err) {
      WARN('Error pegando el certificado:', err);
      alert('Ocurrió un error pegando el certificado: ' + err.message + '\nRevisa la consola (F12) para más detalle.');
    } finally {
      btn.disabled = false;
      btn.textContent = textoOriginal;
    }
  }

  function injectButton() {
    if (document.getElementById('hanna-cert-autofill-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'hanna-cert-autofill-btn';
    btn.type = 'button';
    btn.textContent = '📋 Pegar desde Servicio Técnico';
    Object.assign(btn.style, {
      position: 'fixed', top: '12px', right: '12px', zIndex: 9999,
      background: '#005eb8', color: '#fff', border: 'none', borderRadius: '8px',
      padding: '10px 16px', fontSize: '13px', fontWeight: '600', fontFamily: 'Arial, sans-serif',
      cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.2)',
    });
    btn.addEventListener('click', handleClick);
    document.body.appendChild(btn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectButton);
  } else {
    injectButton();
  }
})();
