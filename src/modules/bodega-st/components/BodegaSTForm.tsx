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
  const [partesRequeridas, setPartesRequeridas] = useState('');
  const [reparaciones, setReparaciones] = useState('');
  const [ubicacion, setUbicacion] = useState(UBICACIONES_BODEGA_ST[0]);
  const [observaciones, setObservaciones] = useState('');

  const inputQrRef = useRef<HTMLInputElement>(null);

  const handleQrKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    console.log('KEY DOWN EVENT FIRED:', e.key);
    if (e.key === 'Enter') {
      e.preventDefault();
      console.log('🔥 ENTER PRESSED - QR input:', qrEquipo);
      const parsed = parseEquipoQR(qrEquipo);
      console.log('✅ Resultado del parse:', parsed);
      setReferencia(parsed.referencia);
      setNumeroSerie(parsed.serie);
      setNombreEquipo(parsed.nombre);
    }
  };

  const handleQrChange = (value: string) => {
    console.log('QR CAMBIO:', value);
    setQrEquipo(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📤 FORM SUBMIT:', { qrEquipo, referencia, numeroSerie, nombreEquipo });
    if (!modoManual && !qrEquipo) return;
    if (modoManual && (!referencia || !numeroSerie)) return;

    onSave({
      qr_equipo: qrEquipo || `${referencia}Ñ${numeroSerie}Ñ${nombreEquipo}`,
      referencia,
      numero_serie: numeroSerie,
      nombre_equipo: nombreEquipo,
      estado,
      partes_requeridas: partesRequeridas,
      reparaciones_realizadas: reparaciones,
      ubicacion_estante: ubicacion,
      observaciones,
      created_at: new Date().toISOString()
    });

    setQrEquipo('');
    setReferencia('');
    setNumeroSerie('');
    setNombreEquipo('');
    setPartesRequeridas('');
    setReparaciones('');
    setObservaciones('');
    inputQrRef.current?.focus();
  };

  return (
    <div style={{
      background: 'var(--surface, #ffffff)',
      borderRadius: 'var(--radius-lg, 12px)',
      border: '1px solid var(--border, #e2e8f0)',
      padding: 24,
      marginBottom: 24,
      boxShadow: 'var(--shadow-sm, 0 1px 2px 0 rgba(0,0,0,0.05))'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--border, #e2e8f0)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Wrench size={22} style={{ color: 'var(--accent, #005eb8)' }} />
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text, #0f172a)', margin: 0 }}>
              Ingreso y Control de Restauración (Bodega ST)
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted, #64748b)', margin: 0 }}>
              Pistolea el código QR o activa el modo manual
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setModoManual(!modoManual)}
          style={{
            background: modoManual ? 'var(--accent-bg, #eff6ff)' : '#f8fafc',
            color: modoManual ? 'var(--accent, #005eb8)' : '#64748b',
            border: '1px solid var(--border, #cbd5e1)',
            padding: '6px 12px',
            borderRadius: 6,
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Edit3 size={14} /> {modoManual ? 'Desactivar Modo Manual' : 'Ingreso sin QR (Manual)'}
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {!modoManual ? (
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text, #334155)', marginBottom: 6, textTransform: 'uppercase' }}>
              QR Equipo (Pistolear aquí)
            </label>
            <input
              ref={inputQrRef}
              type="text"
              value={qrEquipo}
              onChange={(e) => handleQrChange(e.target.value)}
              onKeyDown={handleQrKeyDown}
              placeholder="HI76312Ñ121417CMÑMAURITIUSÑConductivity Probe"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md, 8px)',
                border: '1px solid var(--border, #cbd5e1)',
                background: 'var(--surface2, #f8fafc)',
                fontFamily: 'var(--mono, monospace)',
                fontSize: '0.875rem',
                outline: 'none'
              }}
              autoFocus
            />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text, #334155)', marginBottom: 6 }}>Referencia</label>
              <input type="text" value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Ej: HI98194" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.875rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text, #334155)', marginBottom: 6 }}>Número de Serie</label>
              <input type="text" value={numeroSerie} onChange={(e) => setNumeroSerie(e.target.value)} placeholder="Ej: 1847120" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.875rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text, #334155)', marginBottom: 6 }}>Nombre del Equipo</label>
              <input type="text" value={nombreEquipo} onChange={(e) => setNombreEquipo(e.target.value)} placeholder="Ej: Multiparámetro Portátil" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.875rem' }} />
            </div>
          </div>
        )}

        {referencia && !modoManual && (
          <div style={{ background: 'var(--accent-bg, #eff6ff)', border: '2px solid var(--accent, #1d4ed8)', borderRadius: 8, padding: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, fontSize: '0.85rem' }}>
            <div>
              <strong style={{ color: 'var(--accent, #1d4ed8)', display: 'block', marginBottom: 4 }}>Referencia</strong>
              <span style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>{referencia || '(vacío)'}</span>
            </div>
            <div>
              <strong style={{ color: 'var(--accent, #1d4ed8)', display: 'block', marginBottom: 4 }}>Serie</strong>
              <span style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>{numeroSerie || '(vacío)'}</span>
            </div>
            <div>
              <strong style={{ color: 'var(--accent, #1d4ed8)', display: 'block', marginBottom: 4 }}>Equipo</strong>
              <span style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>{nombreEquipo || '(vacío)'}</span>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text, #334155)', marginBottom: 6, textTransform: 'uppercase' }}>
              Estado del Equipo
            </label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as EstadoRestauracion)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md, 8px)',
                border: '1px solid var(--border, #cbd5e1)',
                background: 'var(--surface2, #f8fafc)',
                fontSize: '0.875rem',
                outline: 'none'
              }}
            >
              <option value="en_diagnostico">🔍 En Diagnóstico</option>
              <option value="en_reparacion">⚙️ En Reparación</option>
              <option value="incompleto_espera_partes">🧩 Incompleto (Espera Accesorios/Partes)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text, #334155)', marginBottom: 6, textTransform: 'uppercase' }}>
              Ubicación en Bodega ST
            </label>
            <select
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md, 8px)',
                border: '1px solid var(--border, #cbd5e1)',
                background: 'var(--surface2, #f8fafc)',
                fontSize: '0.875rem',
                outline: 'none'
              }}
            >
              {UBICACIONES_BODEGA_ST.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text, #334155)', marginBottom: 6, textTransform: 'uppercase' }}>
              Partes / Accesorios Faltantes
            </label>
            <input
              type="text"
              value={partesRequeridas}
              onChange={(e) => setPartesRequeridas(e.target.value)}
              placeholder="Ej: Le falta electrodo HI1131B"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md, 8px)',
                border: '1px solid var(--border, #cbd5e1)',
                background: 'var(--surface2, #f8fafc)',
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text, #334155)', marginBottom: 6, textTransform: 'uppercase' }}>
              Reparaciones Realizadas
            </label>
            <input
              type="text"
              value={reparaciones}
              onChange={(e) => setReparaciones(e.target.value)}
              placeholder="Ej: Cambio de tarjeta principal y calibración"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md, 8px)',
                border: '1px solid var(--border, #cbd5e1)',
                background: 'var(--surface2, #f8fafc)',
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text, #334155)', marginBottom: 6, textTransform: 'uppercase' }}>
            Observaciones Adicionales
          </label>
          <input
            type="text"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Detalles sobre el estado estético o prueba de estanqueidad..."
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md, 8px)',
              border: '1px solid var(--border, #cbd5e1)',
              background: 'var(--surface2, #f8fafc)',
              fontSize: '0.875rem',
              outline: 'none'
            }}
          />
        </div>

        <button
          type="submit"
          style={{
            background: 'var(--accent, #005eb8)',
            color: '#ffffff',
            border: 'none',
            padding: '12px',
            borderRadius: 'var(--radius-md, 8px)',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginTop: 8
          }}
        >
          <PackageCheck size={18} /> Registrar Estado en Bodega ST
        </button>
      </form>
    </div>
  );
};