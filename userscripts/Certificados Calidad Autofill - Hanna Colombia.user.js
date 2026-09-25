// ==UserScript==
// @name         Certificados Calidad Autofill - Hanna Colombia
// @namespace    https://intranet.hannacolombia.com/
// @version      1.0.0
// @description  Pega en el formulario "Crear Certificado de Calidad" de la intranet lo que se copió con el botón "Copiar para Intranet" del sistema de Servicio Técnico (soluciones, mediciones, checklist, fecha, técnico y adjuntos PDF). Equipos y el número de factura se llenan solos/a mano con "Cargar Datos" de la intranet.
// @author       Script generado para Hanna Colombia
// @match        https://intranet.hannacolombia.com/certificados_calidad*
// @grant        none
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
  function fillGrid(inputs, columnas, filas, nombreSeccion) {
    if (filas.length === 0) return;
    const filasDisponibles = Math.floor(inputs.length / columnas.length);
    if (filasDisponibles === 0) {
      WARN(`No se encontraron campos para la sección "${nombreSeccion}". Revisa SECCIONES en el script.`);
      return;
    }
    if (filas.length > filasDisponibles) {
      WARN(`"${nombreSeccion}" tiene ${filas.length} filas pero el formulario solo mostró ${filasDisponibles}. Las que sobran quedan sin copiar — agrégalas a mano.`);
    }
    filas.slice(0, filasDisponibles).forEach((fila, i) => {
      columnas.forEach((campo, j) => {
        setValue(inputs[i * columnas.length + j], fila[campo] || '');
      });
    });
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
      WARN(`"${nombreSeccion}": se marcaron ${matched}/${marcados.length} ítems del checklist. Revisa si el texto de algún checkbox no coincide exactamente.`);
    }
    // Los ítems "extra" (no predefinidos) van en los cuadros de texto en blanco
    // que hay debajo de los checkboxes de cada columna.
    const vacios = bucket.inputs.filter(inp => !inp.value);
    extras.forEach((valor, i) => {
      if (vacios[i]) setValue(vacios[i], valor);
      else WARN(`"${nombreSeccion}": no quedan cuadros en blanco para el ítem extra "${valor}" — agrégalo a mano.`);
    });
  }

  // Los <input type="file"> bloquean que un script les asigne un valor
  // directamente por seguridad, pero SÍ aceptan que se les asigne un
  // FileList armado con DataTransfer — es la técnica estándar que también
  // usan las herramientas de testing automatizado (Cypress, Playwright,
  // etc.) para simular la selección de un archivo.
  async function fillAdjuntos(bucket, adjuntos) {
    const fileInputs = bucket.inputs.filter(el => el.tagName === 'INPUT' && el.type === 'file');
    if (!adjuntos || adjuntos.length === 0) return;
    if (fileInputs.length === 0) {
      WARN('No se encontraron campos de tipo archivo en "Archivos Adjuntos". Revisa el texto de esa sección en SECCIONES.');
      return;
    }
    if (adjuntos.length > fileInputs.length) {
      WARN(`Hay ${adjuntos.length} adjuntos pero el formulario solo tiene ${fileInputs.length} campos "Adjunto". Los que sobran quedan sin adjuntar — súbelos a mano.`);
    }
    for (let i = 0; i < Math.min(adjuntos.length, fileInputs.length); i++) {
      const { nombre, url } = adjuntos[i];
      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const blob = await resp.blob();
        const file = new File([blob], nombre, { type: blob.type || 'application/pdf' });
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInputs[i].files = dt.files;
        fileInputs[i].dispatchEvent(new Event('change', { bubbles: true }));
        LOG(`Adjunto "${nombre}" cargado en el campo ${i + 1}.`);
      } catch (e) {
        WARN(`No se pudo descargar/adjuntar "${nombre}" (¿la URL firmada ya expiró? tienes ${ADJUNTO_URL_TTL_MIN} min desde que copiaste):`, e);
      }
    }
  }

  // Busca un input/textarea que esté justo después (en el DOM) de un texto
  // "Etiqueta:" — usado para Fecha y Técnico dentro de "Otros".
  function fillCampoPorEtiqueta(bucketOtros, etiqueta, valor) {
    // Dentro del bucket "otros" los inputs están en orden de aparición;
    // buscamos el texto de la etiqueta en cualquier nodo hoja anterior a
    // cada input para emparejarlos por cercanía.
    const candidatos = document.evaluate(
      `//*[not(*)][normalize-space(text())="${etiqueta}" or normalize-space(text())="${etiqueta}:"]`,
      document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null
    );
    for (let i = 0; i < candidatos.snapshotLength; i++) {
      const el = candidatos.snapshotItem(i);
      let input = el.nextElementSibling;
      if (!input || (input.tagName !== 'INPUT' && input.tagName !== 'TEXTAREA')) {
        input = el.parentElement ? el.parentElement.querySelector('input, textarea') : null;
      }
      if (input) { setValue(input, valor); return; }
    }
    WARN(`No se encontró el campo "${etiqueta}" dentro de "Otros".`);
  }

  async function aplicarCertificado(payload) {
    const buckets = mapCamposPorSeccion();

    // Equipos NO se pega: la intranet ya los carga sola al hacer "Cargar Datos"
    // con el número de factura.
    fillGrid(buckets.soluciones.inputs, ['codigo', 'lote', 'fechaExpiracion', 'descripcion'], payload.soluciones, 'Soluciones');

    const textarea = buckets.mediciones.inputs.find(el => el.tagName === 'TEXTAREA');
    if (textarea) setValue(textarea, payload.medicionesHtml);
    else WARN('No se encontró el textarea de "Mediciones".');

    fillChecklistColumna(buckets.testFuncional, payload.checklist.testFuncional, payload.checklist.testFuncionalExtra, 'Test Funcional');
    fillChecklistColumna(buckets.embalaje, payload.checklist.embalaje, payload.checklist.embalajeExtra, 'Embalaje');
    fillChecklistColumna(buckets.controlEstetico, payload.checklist.controlEstetico, payload.checklist.controlEsteticoExtra, 'Control Estético');

    fillCampoPorEtiqueta(buckets.otros, 'Fecha', payload.fecha || payload.fechaDisplay);
    fillCampoPorEtiqueta(buckets.otros, 'Técnico', payload.tecnico);

    await fillAdjuntos(buckets.archivosAdjuntos, payload.adjuntos);

    LOG('Certificado pegado:', payload);
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
    btn.textContent = (payload.adjuntos && payload.adjuntos.length) ? '⏳ Pegando y adjuntando PDFs...' : '⏳ Pegando...';
    try {
      await aplicarCertificado(payload);
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
