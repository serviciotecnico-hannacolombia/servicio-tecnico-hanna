import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import type { CertificadoPlantilla, EquipoFila } from '../types';

interface EquiposSelectorProps {
  equipos: EquipoFila[];
  onAddRow: () => void;
  onRemoveRow: (rowIndex: number) => void;
  onSelectPlantilla: (rowIndex: number, plantillaId: string) => void;
  plantillas: CertificadoPlantilla[];
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--surface)',
  color: 'var(--text)',
  fontFamily: 'var(--sans)',
  fontSize: '0.82rem',
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

export function EquiposSelector({ equipos, onAddRow, onRemoveRow, onSelectPlantilla, plantillas }: EquiposSelectorProps) {
  const grupos = groupByCategoria(plantillas);

  return (
    <div>
      <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 10 }}>
        Cada plantilla trae la estructura de mediciones/checklist de esa familia de equipo — se agrega abajo, en Mediciones,
        donde puedes editar la referencia y los valores antes de copiar. Código, serie y demás datos del equipo se cargan solos en la intranet.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {equipos.map((eq, i) => (
          <div key={eq.id} style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: 360 }}>
            <select
              style={selectStyle}
              value={eq.plantilla_id ?? ''}
              onChange={e => e.target.value && onSelectPlantilla(i, e.target.value)}
            >
              <option value="">Selecciona una plantilla...</option>
              {grupos.map(([categoria, items]) => (
                <optgroup key={categoria} label={categoria}>
                  {items.map(p => <option key={p.id} value={p.id}>{p.codigo}</option>)}
                </optgroup>
              ))}
            </select>
            <button
              onClick={() => onRemoveRow(i)}
              title="Quitar"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', flexShrink: 0 }}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10 }}>
        <Button variant="ghost" size="sm" onClick={onAddRow}>
          <Plus size={14} /> Agregar equipo
        </Button>
      </div>
    </div>
  );
}
