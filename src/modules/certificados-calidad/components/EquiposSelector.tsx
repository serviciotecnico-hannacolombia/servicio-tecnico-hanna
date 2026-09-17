import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import type { CertificadoPlantilla, EquipoFila } from '../types';

interface EquiposSelectorProps {
  equipos: EquipoFila[];
  onChange: (equipos: EquipoFila[]) => void;
  onSelectPlantilla: (rowIndex: number, plantillaId: string) => void;
  plantillas: CertificadoPlantilla[];
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

function groupByCategoria(plantillas: CertificadoPlantilla[]) {
  const groups = new Map<string, CertificadoPlantilla[]>();
  plantillas.forEach(p => {
    const key = p.categoria || 'Sin categoría';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  });
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function EquiposSelector({ equipos, onChange, onSelectPlantilla, plantillas }: EquiposSelectorProps) {
  const grupos = groupByCategoria(plantillas);

  const updateRow = (i: number, patch: Partial<EquipoFila>) => {
    const next = equipos.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };

  const addRow = () => onChange([...equipos, { codigo: '', nombre: '', serie: '', sello_calidad: '', plantilla_id: null }]);
  const removeRow = (i: number) => onChange(equipos.filter((_, idx) => idx !== i));

  return (
    <div>
      <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 10 }}>
        "Plantilla" trae la estructura de mediciones/checklist de esa familia de equipo. "Código" es la referencia real
        de tu factura/remisión — se usa para reemplazar el título de la plantilla al copiarla a Mediciones.
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th}>Plantilla</th>
            <th style={th}>Código (factura)</th>
            <th style={th}>Nombre</th>
            <th style={th}>Serie</th>
            <th style={th}>Sello Calidad</th>
            <th style={th}></th>
          </tr>
        </thead>
        <tbody>
          {equipos.map((eq, i) => (
            <tr key={i}>
              <td style={{ padding: '4px 8px', minWidth: 160 }}>
                <select
                  style={inputStyle}
                  value={eq.plantilla_id ?? ''}
                  onChange={e => e.target.value && onSelectPlantilla(i, e.target.value)}
                >
                  <option value="">Selecciona...</option>
                  {grupos.map(([categoria, items]) => (
                    <optgroup key={categoria} label={categoria}>
                      {items.map(p => <option key={p.id} value={p.id}>{p.codigo}</option>)}
                    </optgroup>
                  ))}
                </select>
              </td>
              <td style={{ padding: '4px 8px' }}>
                <input style={inputStyle} value={eq.codigo} onChange={e => updateRow(i, { codigo: e.target.value })} placeholder="Ej. HI 98107" />
              </td>
              <td style={{ padding: '4px 8px' }}>
                <input style={inputStyle} value={eq.nombre} onChange={e => updateRow(i, { nombre: e.target.value })} placeholder="Nombre del equipo" />
              </td>
              <td style={{ padding: '4px 8px' }}>
                <input style={inputStyle} value={eq.serie} onChange={e => updateRow(i, { serie: e.target.value })} placeholder="N° de serie" />
              </td>
              <td style={{ padding: '4px 8px' }}>
                <input style={inputStyle} value={eq.sello_calidad} onChange={e => updateRow(i, { sello_calidad: e.target.value })} placeholder="Sello calidad" />
              </td>
              <td style={{ padding: '4px 8px', width: 32 }}>
                <button
                  onClick={() => removeRow(i)}
                  title="Quitar equipo"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}
                >
                  <Trash2 size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 10 }}>
        <Button variant="ghost" size="sm" onClick={addRow}>
          <Plus size={14} /> Agregar equipo
        </Button>
      </div>
    </div>
  );
}
