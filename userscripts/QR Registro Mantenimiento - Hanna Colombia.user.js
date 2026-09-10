// ==UserScript==
// @name         QR Registro Mantenimiento - Hanna Colombia
// @namespace    https://intranet.hannacolombia.com/
// @version      1.0.0
// @description  QR (SVG vectorial) con serial, familia, cliente, OTST y cotización, para registrar el equipo en el módulo de Mantenimiento Programado de la intranet de Servicio Técnico sin doble digitación.
// @author       Script generado para Hanna Colombia
// @match        https://intranet.hannacolombia.com/sgp/item/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

// Script hermano de "QR Pedidos SGP" — corre en la misma página pero genera
// un código independiente (prefijo MANTPROG|) para registrar el equipo en
// Mantenimiento Programado (servicio-tecnico-hanna), no para el flujo de
// pedidos/facturación que ya cubre el otro script. Vive en un contenedor
// propio para que ambos puedan convivir en la misma página sin pisarse.

(function () {
  'use strict';

  const CONFIG = {
    containerId: 'mantprog-qr-container',
    qrCdn      : 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js',
    qrCellSize : 6,
    qrMargin   : 2,
    pngExportSize: 512,
  };

  // Etiquetas tal como aparecen en la página del pedido. "Familia/Referencia"
  // y "Serial" son las etiquetas más probables para el producto vendido,
  // pero SGP no siempre las muestra en todos los pedidos — si no aparecen,
  // el campo queda vacío y se completa a mano al registrar el equipo.
  // AJUSTAR estas etiquetas si en la página real aparecen con otro texto.
  const CAMPOS = {
    'RUT'             : 'rut',
    'Cotización'      : 'cotizacion',
    'OTST'            : 'otst',
    'Referencia'      : 'familia',
    'Serial'          : 'serial',
  };

  function getOrderId() {
    const segs = window.location.pathname.split('/').filter(Boolean);
    const i = segs.indexOf('item');
    const id = i !== -1 ? segs[i + 1] : null;
    return (id && /^[a-zA-Z0-9\-_]+$/.test(id)) ? id : null;
  }

  // Misma estrategia en cascada que "QR Pedidos SGP" para tolerar distintas
  // estructuras HTML de la página.
  function getFieldValue(label) {
    try {
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const labelRe = new RegExp('^' + escaped + ':?\\s*$', 'i');

      const rows = document.querySelectorAll('tr');
      for (const row of rows) {
        const cells = row.querySelectorAll('td, th');
        if (cells.length >= 2) {
          const cellText = cells[0].textContent.replace(/\s+/g, ' ').trim();
          if (labelRe.test(cellText)) {
            const val = cells[1].textContent.replace(/\s+/g, ' ').trim();
            return val && val !== '-' ? val : null;
          }
        }
      }

      const all = document.querySelectorAll('div, span, td, th, li, strong, b');
      for (const el of all) {
        const own = el.textContent.replace(/\s+/g, ' ').trim();
        if (!labelRe.test(own)) continue;

        const sib = el.nextElementSibling;
        if (sib) {
          const val = sib.textContent.replace(/\s+/g, ' ').trim();
          if (val && val !== '-') return val;
        }

        const parentText = el.parentElement
          ? el.parentElement.textContent.replace(/\s+/g, ' ').trim()
          : '';
        const m = parentText.match(new RegExp(escaped + ':?\\s*([^\\s].*)$', 'i'));
        if (m && m[1]) {
          const val = m[1].trim();
          if (val && val !== '-') return val;
        }
      }
    } catch (e) {
      console.warn(`[MANTPROG QR] No se pudo extraer el campo "${label}":`, e);
    }
    return null;
  }

  function getAllFields() {
    const data = {};
    for (const [label, key] of Object.entries(CAMPOS)) {
      data[key] = getFieldValue(label);
    }
    return data;
  }

  // Formato: MANTPROG|serial|familia|cliente|otst|cotizacion
  // "cliente" no tiene una etiqueta fija confiable en SGP (a veces es el RUT,
  // a veces un nombre) — se deja vacío aquí y se completa a mano al
  // registrar el equipo, igual que cualquier otro campo faltante.
  function buildQRValue(data) {
    const parts = [
      'MANTPROG',
      data.serial || '',
      data.familia || '',
      '',
      data.otst || '',
      data.cotizacion || '',
    ];
    const value = parts.join('|');
    console.log(`[MANTPROG QR] Valor codificado: ${value}`);
    return value;
  }

  function injectStyles() {
    if (document.getElementById('mantprog-qr-styles')) return;
    const s = document.createElement('style');
    s.id = 'mantprog-qr-styles';
    s.textContent = `
      #${CONFIG.containerId} {
        position      : fixed;
        top           : 12px;
        right         : 166px;
        z-index       : 9999;
        background    : #ffffff;
        border        : 1px solid #cccccc;
        border-radius : 8px;
        padding       : 8px 10px;
        box-shadow    : 0 2px 8px rgba(0,0,0,0.15);
        display       : flex;
        flex-direction: column;
        align-items   : center;
        gap           : 5px;
        font-family   : Arial, sans-serif;
        width         : 140px;
      }
      #${CONFIG.containerId} .mp-label {
        font-size     : 11px;
        font-weight   : 600;
        color         : #444;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        text-align    : center;
      }
      #${CONFIG.containerId} .mp-svg-wrap {
        width  : 130px;
        height : 130px;
        display: flex;
        align-items    : center;
        justify-content: center;
      }
      #${CONFIG.containerId} .mp-svg-wrap svg {
        width : 100%;
        height: 100%;
        display: block;
      }
      #${CONFIG.containerId} .mp-info {
        font-size  : 10px;
        font-weight: 500;
        color      : #666;
        text-align : center;
        word-break : break-word;
      }
      #${CONFIG.containerId} .mp-download-row {
        display: flex;
        gap    : 4px;
        width  : 100%;
      }
      #${CONFIG.containerId} .mp-download-btn {
        flex          : 1;
        font-size     : 10px;
        font-weight   : 600;
        color         : #fff;
        background    : #7c3aed;
        border        : none;
        border-radius : 5px;
        padding       : 5px 0;
        cursor        : pointer;
      }
      #${CONFIG.containerId} .mp-download-btn:hover {
        background: #6528c9;
      }

      @media print {
        #${CONFIG.containerId} { display: none !important; }
      }
    `;
    document.head.appendChild(s);
  }

  function makeQR(data) {
    let qr = null;
    try {
      qr = qrcode(0, 'L');
      qr.addData(data);
      qr.make();
      return qr;
    } catch (e) {
      for (let t = 1; t <= 40; t++) {
        try {
          qr = qrcode(t, 'L');
          qr.addData(data);
          qr.make();
          return qr;
        } catch (e2) { /* probar el siguiente tamaño */ }
      }
    }
    console.error('[MANTPROG QR] No se pudo generar el código QR.');
    return null;
  }

  function downloadBlob(blob, filename) {
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function downloadSvg(svgEl, filename) {
    const serialized = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([serialized], { type: 'image/svg+xml' });
    downloadBlob(blob, filename);
  }

  function downloadPng(svgEl, filename, size) {
    const serialized = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (blob) downloadBlob(blob, filename);
      }, 'image/png');
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      console.error('[MANTPROG QR] No se pudo convertir el SVG a PNG:', e);
    };
    img.src = url;
  }

  function buildContainer(orderId, data, qr) {
    const wrap = document.createElement('div');
    wrap.id = CONFIG.containerId;

    const label = document.createElement('span');
    label.className = 'mp-label';
    label.textContent = 'Registro Mantprog';
    wrap.appendChild(label);

    const svgWrap = document.createElement('div');
    svgWrap.className = 'mp-svg-wrap';
    svgWrap.innerHTML = qr.createSvgTag({
      cellSize: CONFIG.qrCellSize,
      margin  : CONFIG.qrMargin,
      scalable: true,
    });
    wrap.appendChild(svgWrap);
    const svgEl = svgWrap.querySelector('svg');

    const infoParts = [];
    if (data.serial) infoParts.push(`S/N ${data.serial}`);
    if (data.familia) infoParts.push(data.familia);
    if (!infoParts.length) infoParts.push('Completar a mano');
    const info = document.createElement('span');
    info.className   = 'mp-info';
    info.textContent = infoParts.join(' · ');
    wrap.appendChild(info);

    const row = document.createElement('div');
    row.className = 'mp-download-row';

    const btnSvg = document.createElement('button');
    btnSvg.type        = 'button';
    btnSvg.className   = 'mp-download-btn';
    btnSvg.textContent = 'SVG';
    btnSvg.addEventListener('click', () => {
      downloadSvg(svgEl, `QR-mantprog-${orderId}.svg`);
    });

    const btnPng = document.createElement('button');
    btnPng.type        = 'button';
    btnPng.className   = 'mp-download-btn';
    btnPng.textContent = 'PNG';
    btnPng.addEventListener('click', () => {
      downloadPng(svgEl, `QR-mantprog-${orderId}.png`, CONFIG.pngExportSize);
    });

    row.appendChild(btnSvg);
    row.appendChild(btnPng);
    wrap.appendChild(row);

    document.body.appendChild(wrap);
  }

  function loadAndRender(orderId, data, qrValue) {
    const render = () => {
      const qr = makeQR(qrValue);
      if (!qr) return;
      injectStyles();
      buildContainer(orderId, data, qr);
    };
    if (typeof qrcode !== 'undefined') { render(); return; }
    const s = document.createElement('script');
    s.src     = CONFIG.qrCdn;
    s.onload  = render;
    s.onerror = () => console.error('[MANTPROG QR] No se pudo cargar qrcode-generator.');
    document.head.appendChild(s);
  }

  function init() {
    if (document.getElementById(CONFIG.containerId)) return;

    const orderId = getOrderId();
    if (!orderId) return;

    const proceed = () => {
      const data = getAllFields();
      const qrValue = buildQRValue(data);
      loadAndRender(orderId, data, qrValue);
    };

    setTimeout(proceed, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
