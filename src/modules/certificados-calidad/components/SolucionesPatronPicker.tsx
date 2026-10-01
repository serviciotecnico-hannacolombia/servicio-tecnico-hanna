import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { MonthYearInput } from './MonthYearInput';
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
  const norm = (c: string) => c.trim().toLowerCase();
  const activas = catalogo.filter(s => s.activo);
  const sugeridas = activas.filter(s => categorias.some(c => norm(c) === norm(s.categoria)));
  // El resto del catálogo activo: antes un patrón cuya categoría no coincidía
  // exactamente con la de la plantilla elegida (p. ej. "Buffers pH" vs "pH")
  // no aparecía en ningún lado, como si no se hubiera guardado.
  const otras = activas.filter(s => !sugeridas.includes(s)).sort((a, b) => a.categoria.localeCompare(b.categoria));

  const aFila = (s: SolucionPatron): SolucionFila => ({
    codigo: s.codigo || '', lote: s.lote || '', fecha_expiracion: s.fecha_expiracion || '', descripcion: s.descripcion || '',
  });

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
              onClick={() => addRow(aFila(s))}
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
            <th style={th}>Fecha de Expiración (mes/año)</th>
            <th style={th}>Descripción</th>
            <th style={th}></th>
          </tr>
        </thead>
        <tbody>
          {soluciones.map((s, i) => (
            <tr key={i}>
              <td style={{ padding: '4px 8px' }}><input style={inputStyle} value={s.codigo} onChange={e => updateRow(i, { codigo: e.target.value })} /></td>
              <td style={{ padding: '4px 8px' }}><input style={inputStyle} value={s.lote} onChange={e => updateRow(i, { lote: e.target.value })} /></td>
              <td style={{ padding: '4px 8px', minWidth: 190 }}><MonthYearInput value={s.fecha_expiracion} onChange={v => updateRow(i, { fecha_expiracion: v })} /></td>
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
      <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button variant="ghost" size="sm" onClick={() => addRow()}>
          <Plus size={14} /> Agregar fila manual
        </Button>
        {otras.length > 0 && (
          <select
            value=""
            onChange={e => { const s = otras.find(o => o.id === e.target.value); if (s) addRow(aFila(s)); }}
            style={{ ...inputStyle, width: 'auto', maxWidth: 320 }}
          >
            <option value="">+ Agregar otra del catálogo...</option>
            {[...new Set(otras.map(s => s.categoria))].map(cat => (
              <optgroup key={cat} label={cat}>
                {otras.filter(s => s.categoria === cat).map(s => (
                  <option key={s.id} value={s.id}>{[s.codigo, s.descripcion].filter(Boolean).join(' — ') || s.categoria}</option>
                ))}
              </optgroup>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
