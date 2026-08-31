import React, { useState, useRef } from 'react';
import type { RegistroBodegaST, EstadoRestauracion } from '../types';
import { UBICACIONES_BODEGA_ST } from '../types';
import { parseEquipoQR } from '../../void/utils/qrParser';
import { Wrench, PackageCheck, Edit3 } from 'lucide-react';

interface BodegaSTFormProps {
  onSave: (record: RegistroBodegaST) => void;
}

export const BodegaSTForm: React.FC<BodegaSTFormProps> = ({ onSave }) => {
  const [modoManual, setModoManual] = useState(false);
  const [qrEquipo, setQrEquipo] = useState('');
  const [referencia, setReferencia] = useState('');
  const [numeroSerie, setNumeroSerie] = useState('');
  const [nombreEquipo, setNombreEquipo] = useState('');
  const [estado, setEstado] = useState<EstadoRestauracion>('en_diagnostico');
  
  // Campos dinámicos por etapa
  const [repuestosPedir, setRepuestosPedir] = useState('');
  const [piezasColocar, setPiezasColocar] = useState('');
  const [reparacionesRealizadas, setReparacionesRealizadas] = useState('');
  const [accesoriosFaltantes, setAccesoriosFaltantes] = useState('');
  
  const [ubicacion, setUbicacion] = useState(UBICACIONES_BODEGA_ST[0]);
  const [bodegaDestino, setBodegaDestino] = useState('Bodega Principal');
  const [observaciones, setObservaciones] = useState('');

  const inputQrRef = useRef<HTMLInputElement>(null);

  const handleQrKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const parsed = parseEquipoQR(qrEquipo);
      setReferencia(parsed.referencia);
      setNumeroSerie(parsed.serie);
      setNombreEquipo(parsed.nombre);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modoManual && !qrEquipo) return;
    if (modoManual && (!referencia || !numeroSerie)) return;

    onSave({
      qr_equipo: qrEquipo || `${referencia}Ñ${numeroSerie}Ñ${nombreEquipo}`,
      referencia,
      numero_serie: numeroSerie,
      nombre_equipo: nombreEquipo,
      estado,
      partes_requeridas: estado === 'incompleto_espera_partes' ? accesoriosFaltantes : (estado === 'en_diagnostico' ? repuestosPedir : ''),
      reparaciones_realizadas: estado === 'en_reparacion' ? piezasColocar : (estado === 'incompleto_espera_partes' ? reparacionesRealizadas : ''),
      ubicacion_estante: estado === 'restaurado_listo' ? undefined : ubicacion,
      bodega_destino: estado === 'restaurado_listo' ? bodegaDestino : undefined,
      observaciones,
      created_at: new Date().toISOString()
    });

    setQrEquipo('');
    setReferencia('');
    setNumeroSerie('');
    setNombreEquipo('');
    setRepuestosPedir('');
    setPiezasColocar('');
    setReparacionesRealizadas('');
    setAccesoriosFaltantes('');
    setObservaciones('');
    inputQrRef.current?.focus();
  };

  return (
    <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24, marginBottom: 24, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Wrench size={22} style={{ color: '#005eb8' }} />
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Ingreso y Control de Restauración (Bodega ST)</h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>Gestión por etapas y control de inventario</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setModoManual(!modoManual)}
          style={{ background: modoManual ? '#eff6ff' : '#f8fafc', color: modoManual ? '#005eb8' : '#64748b', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Edit3 size={14} /> {modoManual ? 'Desactivar Modo Manual' : 'Ingreso sin QR (Manual)'}
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {!modoManual ? (
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: 6, textTransform: 'uppercase' }}>QR Equipo (Pistolear aquí)</label>
            <input
              ref={inputQrRef}
              type="text"
              value={qrEquipo}
              onChange={(e) => setQrEquipo(e.target.value)}
              onKeyDown={handleQrKeyDown}
              placeholder="HI76312Ñ121417CMÑMAURITIUSÑConductivity Probe"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#f8fafc', fontFamily: 'monospace', fontSize: '0.875rem', outline: 'none' }}
              autoFocus
            />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>Referencia</label>
              <input type="text" value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Ej: HI98194" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.875rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>Número de Serie</label>
              <input type="text" value={numeroSerie} onChange={(e) => setNumeroSerie(e.target.value)} placeholder="Ej: 1847120" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.875rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>Nombre del Equipo</label>
              <input type="text" value={nombreEquipo} onChange={(e) => setNombreEquipo(e.target.value)} placeholder="Ej: Multiparámetro Portátil" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.875rem' }} />
            </div>
          </div>
        )}

        {referencia && !modoManual && (
          <div style={{ background: '#eff6ff', border: '2px solid #1d4ed8', borderRadius: 8, padding: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, fontSize: '0.85rem' }}>
            <div><strong style={{ color: '#1d4ed8', display: 'block', marginBottom: 4 }}>Referencia</strong><span style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>{referencia}</span></div>
            <div><strong style={{ color: '#1d4ed8', display: 'block', marginBottom: 4 }}>Serie</strong><span style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>{numeroSerie}</span></div>
            <div><strong style={{ color: '#1d4ed8', display: 'block', marginBottom: 4 }}>Equipo</strong><span style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>{nombreEquipo}</span></div>
          </div>
        )}

        {/* Controles de Estado y Ubicación Dinámica */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: 6, textTransform: 'uppercase' }}>Estado del Equipo (Etapa)</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as EstadoRestauracion)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.875rem' }}
            >
              <option value="en_diagnostico">🔍 En Diagnóstico</option>
              <option value="en_reparacion">⚙️ En Reparación</option>
              <option value="incompleto_espera_partes">🧩 Incompleto (Espera Accesorios/Partes)</option>
              <option value="restaurado_listo">✅ Restaurado (Listo)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: 6, textTransform: 'uppercase' }}>
              {estado === 'restaurado_listo' ? '📦 Bodega Destino' : 'Ubicación en Estante (Bodega ST)'}
            </label>
            {estado === 'restaurado_listo' ? (
              <select
                value={bodegaDestino}
                onChange={(e) => setBodegaDestino(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #10b981', background: '#ecfdf5', fontSize: '0.875rem', fontWeight: 600 }}
              >
                <option value="Bodega Principal">Bodega Principal</option>
                <option value="Bodega Incompletos">Bodega Incompletos</option>
              </select>
            ) : (
              <select
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.875rem' }}
              >
                {UBICACIONES_BODEGA_ST.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Campos Condicionales por Etapa (Comienzan limpios sin reparaciones por defecto) */}
        {estado === 'en_diagnostico' && (
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: 6, textTransform: 'uppercase' }}>Repuestos a Pedir / Diagnóstico Inicial</label>
            <input
              type="text"
              value={repuestosPedir}
              onChange={(e) => setRepuestosPedir(e.target.value)}
              placeholder="Ej: Solicitar tarjeta lógica y pantalla LCD"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            />
          </div>
        )}

        {estado === 'en_reparacion' && (
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: 6, textTransform: 'uppercase' }}>Repuestos o Piezas a Colocar</label>
            <input
              type="text"
              value={piezasColocar}
              onChange={(e) => setPiezasColocar(e.target.value)}
              placeholder="Ej: Instalación de sensor de pH y batería nueva"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            />
          </div>
        )}

        {estado === 'incompleto_espera_partes' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: 6, textTransform: 'uppercase' }}>Reparaciones Realizadas</label>
              <input
                type="text"
                value={reparacionesRealizadas}
                onChange={(e) => setReparacionesRealizadas(e.target.value)}
                placeholder="Ej: Limpieza interna y soldadura de conector"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: 6, textTransform: 'uppercase' }}>Accesorios / Partes Faltantes</label>
              <input
                type="text"
                value={accesoriosFaltantes}
                onChange={(e) => setAccesoriosFaltantes(e.target.value)}
                placeholder="Ej: Falta tapa trasera y manual"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
              />
            </div>
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: 6, textTransform: 'uppercase' }}>Observaciones Adicionales</label>
          <input
            type="text"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Detalles sobre el estado estético o pruebas..."
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
          />
        </div>

        <button
          type="submit"
          style={{ background: '#005eb8', color: '#ffffff', border: 'none', padding: '12px', borderRadius: 8, fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 }}
        >
          <PackageCheck size={18} /> Registrar Estado en Bodega ST
        </button>
      </form>
    </div>
  );
};