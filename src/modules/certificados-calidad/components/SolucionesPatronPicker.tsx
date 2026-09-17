import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import type { SolucionFila, SolucionPatron } from '../types';

interface SolucionesPatronPickerProps {
  soluciones: SolucionFila[];
  onChange: (soluciones: SolucionFila[]) => void;
  catalogo: SolucionPatron[];
  categorias: string[];
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--surface)',
  color: 'var(--text)',
  fontFamily: 'var(--sans)',
  fontSize: '0.82rem',
};

const th: React.CSSProperties = {
  textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.04em', color: 'var(--muted)', padding: '6px 8px',
};

export function SolucionesPatronPicker({ soluciones, onChange, catalogo, categorias }: SolucionesPatronPickerProps) {
  const sugeridas = catalogo.filter(s => s.activo && categorias.some(c => c.toLowerCase() === s.categoria.toLowerCase()));

  const updateRow = (i: number, patch: Partial<SolucionFila>) => {
    const next = soluciones.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };

  const addRow = (fila?: SolucionFila) => onChange([...soluciones, fila ?? { codigo: '', lote: '', fecha_expiracion: '', descripcion: '' }]);
  const removeRow = (i: number) => onChange(soluciones.filter((_, idx) => idx !== i));

  return (
    <div>
      {sugeridas.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {sugeridas.map(s => (
            <Button
              key={s.id}
              variant="ghost"
              size="sm"
              onClick={() => addRow({ codigo: s.codigo || '', lote: s.lote || '', fecha_expiracion: s.fecha_expiracion || '', descripcion: s.descripcion || '' })}
            >
              <Plus size={13} /> {s.descripcion || s.categoria}
            </Button>
          ))}
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th}>Código</th>
            <th style={th}>Lote</th>
            <th style={th}>Fecha de Expiración</th>
            <th style={th}>Descripción</th>
            <th style={th}></th>
          </tr>
        </thead>
        <tbody>
          {soluciones.map((s, i) => (
            <tr key={i}>
              <td style={{ padding: '4px 8px' }}><input style={inputStyle} value={s.codigo} onChange={e => updateRow(i, { codigo: e.target.value })} /></td>
              <td style={{ padding: '4px 8px' }}><input style={inputStyle} value={s.lote} onChange={e => updateRow(i, { lote: e.target.value })} /></td>
              <td style={{ padding: '4px 8px' }}><input style={inputStyle} type="date" value={s.fecha_expiracion} onChange={e => updateRow(i, { fecha_expiracion: e.target.value })} /></td>
              <td style={{ padding: '4px 8px' }}><input style={inputStyle} value={s.descripcion} onChange={e => updateRow(i, { descripcion: e.target.value })} /></td>
              <td style={{ padding: '4px 8px', width: 32 }}>
                <button onClick={() => removeRow(i)} title="Quitar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}>
                  <Trash2 size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 10 }}>
        <Button variant="ghost" size="sm" onClick={() => addRow()}>
          <Plus size={14} /> Agregar fila manual
        </Button>
      </div>
    </div>
  );
}
