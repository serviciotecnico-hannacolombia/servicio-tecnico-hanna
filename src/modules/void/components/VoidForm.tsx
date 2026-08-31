import React, { useState, useRef } from 'react';
import type { VoidRecord } from '../types';
import { parseEquipoQR } from '../utils/qrParser';
import { QrCode, CheckCircle2, Edit3 } from 'lucide-react';

interface VoidFormProps {
  onSave: (record: VoidRecord) => void;
}

export const VoidForm: React.FC<VoidFormProps> = ({ onSave }) => {
  const [modoManual, setModoManual] = useState(false);
  const [qrEquipo, setQrEquipo] = useState('');
  const [referencia, setReferencia] = useState('');
  const [numeroSerie, setNumeroSerie] = useState('');
  const [nombreEquipo, setNombreEquipo] = useState('');
  const [voidBlanco, setVoidBlanco] = useState('');
  const [voidGris, setVoidGris] = useState('');
  const [documentoRef, setDocumentoRef] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const inputVoidBlancoRef = useRef<HTMLInputElement>(null);
  const inputVoidGrisRef = useRef<HTMLInputElement>(null);
  const inputDocRef = useRef<HTMLInputElement>(null);
  const inputQrRef = useRef<HTMLInputElement>(null);

  const handleQrKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    console.log('KEY DOWN EVENT FIRED:', e.key);
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      console.log('🔥 TRIGGER DETECTED - QR input:', qrEquipo);
      const parsed = parseEquipoQR(qrEquipo);
      console.log('✅ Resultado del parse:', parsed);
      setReferencia(parsed.referencia);
      setNumeroSerie(parsed.serie);
      setNombreEquipo(parsed.nombre);
      inputVoidBlancoRef.current?.focus();
    }
  };

  const handleQrChange = (value: string) => {
    console.log('QR CAMBIO:', value);
    setQrEquipo(value);
  };

  const handleVoidBlancoKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inputVoidGrisRef.current?.focus();
    }
  };

  const handleVoidGrisKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inputDocRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📤 FORM SUBMIT VOID:', { qrEquipo, referencia, numeroSerie, nombreEquipo });
    if (!voidBlanco || !voidGris) return;

    onSave({
      qr_equipo: qrEquipo || `${referencia}Ñ${numeroSerie}Ñ${nombreEquipo}`,
      referencia,
      numero_serie: numeroSerie,
      nombre_equipo: nombreEquipo,
      void_blanco: voidBlanco,
      void_gris: voidGris,
      documento_referencia: documentoRef,
      observaciones,
      created_at: new Date().toISOString()
    });

    setQrEquipo('');
    setReferencia('');
    setNumeroSerie('');
    setNombreEquipo('');
    setVoidBlanco('');
    setVoidGris('');
    setDocumentoRef('');
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
          <QrCode size={22} style={{ color: 'var(--accent, #005eb8)' }} />
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text, #0f172a)', margin: 0 }}>
              Registrar Equipo y VOIDs
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
              1. QR Equipo (Pistolear aquí)
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
              <input required type="text" value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Ej: HI98194" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.875rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text, #334155)', marginBottom: 6 }}>Número de Serie</label>
              <input required type="text" value={numeroSerie} onChange={(e) => setNumeroSerie(e.target.value)} placeholder="Ej: 1847120" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.875rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text, #334155)', marginBottom: 6 }}>Nombre del Equipo</label>
              <input required type="text" value={nombreEquipo} onChange={(e) => setNombreEquipo(e.target.value)} placeholder="Ej: Multiparámetro Portátil" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.875rem' }} />
            </div>
          </div>
        )}

        {referencia && !modoManual && (
          <div style={{ background: 'var(--accent-bg, #eff6ff)', border: '1px solid var(--accent, #93c5fd)', borderRadius: 8, padding: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, fontSize: '0.8rem' }}>
            <div><strong style={{ color: 'var(--accent, #1d4ed8)' }}>Ref:</strong> {referencia}</div>
            <div><strong style={{ color: 'var(--accent, #1d4ed8)' }}>Serie:</strong> {numeroSerie}</div>
            <div><strong style={{ color: 'var(--accent, #1d4ed8)' }}>Nombre:</strong> {nombreEquipo}</div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text, #334155)', marginBottom: 6, textTransform: 'uppercase' }}>
              2. VOID Blanco (Pistolear)
            </label>
            <input
              required
              ref={inputVoidBlancoRef}
              type="text"
              value={voidBlanco}
              onChange={(e) => setVoidBlanco(e.target.value)}
              onKeyDown={handleVoidBlancoKeyDown}
              placeholder="CO342500HA"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '0.875rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text, #334155)', marginBottom: 6, textTransform: 'uppercase' }}>
              3. VOID Gris (Pistolear)
            </label>
            <input
              required
              ref={inputVoidGrisRef}
              type="text"
              value={voidGris}
              onChange={(e) => setVoidGris(e.target.value)}
              onKeyDown={handleVoidGrisKeyDown}
              placeholder="CO16517B"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '0.875rem' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text, #334155)', marginBottom: 6, textTransform: 'uppercase' }}>Factura / Remisión / OTST</label>
            <input required ref={inputDocRef} type="text" value={documentoRef} onChange={(e) => setDocumentoRef(e.target.value)} placeholder="Ej: FV 123456 / OTST 41000" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.875rem' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text, #334155)', marginBottom: 6, textTransform: 'uppercase' }}>Observaciones (Opcional)</label>
            <input type="text" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Notas sobre el estado del equipo..." style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.875rem' }} />
          </div>
        </div>

        <button
          type="submit"
          style={{ background: 'var(--accent, #005eb8)', color: '#ffffff', border: 'none', padding: '12px', borderRadius: 8, fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 }}
        >
          <CheckCircle2 size={18} /> Guardar Registro
        </button>
      </form>
    </div>
  );
};