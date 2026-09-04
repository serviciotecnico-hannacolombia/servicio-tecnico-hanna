import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { RegistroBodegaST, EstadoRestauracion } from '../types';
import { UBICACIONES_BODEGA_ST } from '../types';
import { parseEquipoQR } from '../../void/utils/qrParser';
import { Wrench, PackageCheck, Edit3, PackageSearch } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';

interface BodegaSTFormProps {
  onSave: (record: RegistroBodegaST) => void;
}

const ESTADO_OPTIONS = [
  { value: 'en_diagnostico', label: '🔍 En Diagnóstico' },
  { value: 'en_reparacion', label: '⚙️ En Reparación' },
  { value: 'incompleto_espera_partes', label: '🧩 Incompleto (Espera Accesorios/Partes)' },
  { value: 'restaurado_listo', label: '✅ Restaurado (Listo)' },
];

export function BodegaSTForm({ onSave }: BodegaSTFormProps) {
  const [modoManual, setModoManual] = useState(false);
  const [qrEquipo, setQrEquipo] = useState('');
  const [referencia, setReferencia] = useState('');
  const [numeroSerie, setNumeroSerie] = useState('');
  const [nombreEquipo, setNombreEquipo] = useState('');
  const [estado, setEstado] = useState<EstadoRestauracion>('en_diagnostico');

  const [repuestosPedir, setRepuestosPedir] = useState('');
  const [piezasColocar, setPiezasColocar] = useState('');
  const [reparacionesRealizadas, setReparacionesRealizadas] = useState('');
  const [accesoriosFaltantes, setAccesoriosFaltantes] = useState('');

  const [ubicacion, setUbicacion] = useState(UBICACIONES_BODEGA_ST[0]);
  const [bodegaDestino, setBodegaDestino] = useState('Bodega Principal');
  const [observaciones, setObservaciones] = useState('');

  const inputQrRef = useRef<HTMLInputElement>(null);

  const handleQrKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const parsed = parseEquipoQR(qrEquipo);
      setReferencia(parsed.referencia);
      setNumeroSerie(parsed.serie);
      setNombreEquipo(parsed.nombre);
    }
  };

  const handleSubmit = (e: FormEvent) => {
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
      ubicacion_estante: (estado === 'restaurado_listo' || estado === 'incompleto_espera_partes') ? undefined : ubicacion,
      bodega_destino: estado === 'restaurado_listo' ? bodegaDestino : (estado === 'incompleto_espera_partes' ? 'Bodega Incompletos' : undefined),
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
    <Card style={{ marginBottom: 18 }} bodyStyle={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Wrench size={20} style={{ color: 'var(--accent)' }} />
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Ingreso y Control de Restauración (Bodega ST)</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>Gestión por etapas y control de inventario</p>
          </div>
        </div>

        <Button type="button" variant={modoManual ? 'primary' : 'ghost'} size="sm" onClick={() => setModoManual(!modoManual)}>
          <Edit3 size={14} /> {modoManual ? 'Desactivar modo manual' : 'Ingreso sin QR (manual)'}
        </Button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {!modoManual ? (
          <Input
            ref={inputQrRef}
            label="QR EQUIPO (PISTOLEAR AQUÍ)"
            value={qrEquipo}
            onChange={e => setQrEquipo(e.target.value)}
            onKeyDown={handleQrKeyDown}
            placeholder="HI76312Ñ121417CMÑMAURITIUSÑConductivity Probe"
            style={{ fontFamily: 'var(--mono)', background: 'var(--surface2)' }}
            autoFocus
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 12 }}>
            <Input label="Referencia" value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="Ej: HI98194" />
            <Input label="Número de Serie" value={numeroSerie} onChange={e => setNumeroSerie(e.target.value)} placeholder="Ej: 1847120" />
            <Input label="Nombre del Equipo" value={nombreEquipo} onChange={e => setNombreEquipo(e.target.value)} placeholder="Ej: Multiparámetro Portátil" />
          </div>
        )}

        {referencia && !modoManual && (
          <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', padding: 14, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, fontSize: '0.85rem' }}>
            <div><strong style={{ color: 'var(--accent)', display: 'block', marginBottom: 4 }}>Referencia</strong><span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)' }}>{referencia}</span></div>
            <div><strong style={{ color: 'var(--accent)', display: 'block', marginBottom: 4 }}>Serie</strong><span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)' }}>{numeroSerie}</span></div>
            <div><strong style={{ color: 'var(--accent)', display: 'block', marginBottom: 4 }}>Equipo</strong><span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)' }}>{nombreEquipo}</span></div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Select label="ESTADO DEL EQUIPO (ETAPA)" value={estado} onChange={e => setEstado(e.target.value as EstadoRestauracion)} options={ESTADO_OPTIONS} />

          {estado === 'restaurado_listo' ? (
            <Select
              label="📦 BODEGA DESTINO"
              value={bodegaDestino}
              onChange={e => setBodegaDestino(e.target.value)}
              options={[{ value: 'Bodega Principal', label: 'Bodega Principal' }, { value: 'Bodega Incompletos', label: 'Bodega Incompletos' }]}
              style={{ border: '1px solid var(--green)', background: 'var(--green-bg)', fontWeight: 600 }}
            />
          ) : estado === 'incompleto_espera_partes' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--red-bg, rgba(239,68,68,.08))', border: '1px solid var(--red)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: '0.85rem', color: 'var(--text)' }}>
              <PackageSearch size={16} style={{ color: 'var(--red)', flexShrink: 0 }} />
              <span>Se asignará automáticamente a <strong>Bodega Incompletos</strong></span>
            </div>
          ) : (
            <Select
              label="UBICACIÓN EN ESTANTE (BODEGA ST)"
              value={ubicacion}
              onChange={e => setUbicacion(e.target.value)}
              options={UBICACIONES_BODEGA_ST.map(loc => ({ value: loc, label: loc }))}
            />
          )}
        </div>

        {estado === 'en_diagnostico' && (
          <Input label="REPUESTOS A PEDIR / DIAGNÓSTICO INICIAL" value={repuestosPedir} onChange={e => setRepuestosPedir(e.target.value)} placeholder="Ej: Solicitar tarjeta lógica y pantalla LCD" />
        )}

        {estado === 'en_reparacion' && (
          <Input label="REPUESTOS O PIEZAS A COLOCAR" value={piezasColocar} onChange={e => setPiezasColocar(e.target.value)} placeholder="Ej: Instalación de sensor de pH y batería nueva" />
        )}

        {estado === 'incompleto_espera_partes' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Input label="REPARACIONES REALIZADAS" value={reparacionesRealizadas} onChange={e => setReparacionesRealizadas(e.target.value)} placeholder="Ej: Limpieza interna y soldadura de conector" />
            <Input label="ACCESORIOS / PARTES FALTANTES" value={accesoriosFaltantes} onChange={e => setAccesoriosFaltantes(e.target.value)} placeholder="Ej: Falta tapa trasera y manual" />
          </div>
        )}

        <Input label="OBSERVACIONES ADICIONALES" value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Detalles sobre el estado estético o pruebas..." />

        <Button type="submit" style={{ marginTop: 4 }}>
          <PackageCheck size={16} /> Registrar Estado en Bodega ST
        </Button>
      </form>
    </Card>
  );
}
