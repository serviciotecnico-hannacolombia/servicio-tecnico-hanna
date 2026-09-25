import { useState } from 'react';
import { toast } from 'sonner';
import { Copy, Plus, Trash2, Save, X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { supabase } from '../../../lib/supabase';
import { copyToClipboard } from '../utils/clipboard';
import { MonthYearInput } from './MonthYearInput';
import { buildBloqueHtml, buildAllBloquesHtml } from '../utils/mediciones';
import { useInvalidateCertificadosCalidad } from '../hooks/useCertificadosCalidad';
import type { MedicionBloque, MedicionFila } from '../types';

interface MedicionesEditorProps {
  bloques: MedicionBloque[];
  onChange: (bloques: MedicionBloque[]) => void;
  onRemoveBloque: (bloque: MedicionBloque) => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
  background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: '0.82rem',
};

const textareaStyle: React.CSSProperties = {
  width: '100%', minHeight: 70, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
  background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: '0.82rem', resize: 'vertical',
};

export function MedicionesEditor({ bloques, onChange, onRemoveBloque }: MedicionesEditorProps) {
  const invalidate = useInvalidateCertificadosCalidad();
  const [guardando, setGuardando] = useState<number | null>(null);
  const [nuevoCodigo, setNuevoCodigo] = useState('');
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [saving, setSaving] = useState(false);

  const updateBloque = (i: number, patch: Partial<MedicionBloque>) => {
    const next = bloques.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };

  const updateFila = (i: number, filaIdx: number, patch: Partial<MedicionFila>) => {
    const filas = bloques[i].filas.slice();
    filas[filaIdx] = { ...filas[filaIdx], ...patch };
    updateBloque(i, { filas });
  };

  const addFila = (i: number) => updateBloque(i, { filas: [...bloques[i].filas, { valor: '', estandar: '', tolerancia: '' }] });
  const removeFila = (i: number, filaIdx: number) => updateBloque(i, { filas: bloques[i].filas.filter((_, idx) => idx !== filaIdx) });

  const openGuardar = (i: number) => {
    setNuevoCodigo(bloques[i].titulo);
    setNuevaCategoria('');
    setGuardando(i);
  };

  const handleGuardarPlantilla = async () => {
    if (guardando === null) return;
    if (!nuevoCodigo.trim()) { toast.error('Ingresa un código para la plantilla'); return; }
    const bloque = bloques[guardando];
    setSaving(true);
    const { error } = await supabase.from('certificados_calidad_plantillas').upsert(
      {
        codigo: nuevoCodigo.trim(),
        categoria: nuevaCategoria.trim() || null,
        filas: bloque.filas,
        notas_generales: bloque.notas || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'codigo' }
    );
    setSaving(false);
    if (error) { toast.error('Error al guardar plantilla: ' + error.message); return; }
    invalidate();
    toast.success(`Plantilla "${nuevoCodigo.trim()}" guardada`);
    setGuardando(null);
  };

  return (
    <div>
      {bloques.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(buildAllBloquesHtml(bloques), 'Todas las mediciones')}>
            <Copy size={13} /> Copiar todo
          </Button>
        </div>
      )}

      {bloques.length === 0 && (
        <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
          Elige una plantilla en la tabla de Equipos para traer aquí su estructura de mediciones.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {bloques.map((bloque, i) => (
          <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 14 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 10 }}>
              <Input
                label={bloque.filas.length > 0 ? 'Título (código del equipo en esta tabla)' : 'Referencia (aparece como "Ref. ..." en el certificado)'}
                value={bloque.titulo}
                onChange={e => updateBloque(i, { titulo: e.target.value })}
                wrapStyle={{ flex: 1 }}
              />
              <button
                onClick={() => { if (window.confirm('¿Quitar este bloque de mediciones? También se des-selecciona su plantilla en Equipos.')) onRemoveBloque(bloque); }}
                title="Quitar bloque"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', padding: '8px 0' }}
              >
                <X size={16} />
              </button>
            </div>

            {bloque.filas.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
                <thead>
                  <tr>
                    {['Valor', 'Sol. Estándar', 'Tolerancia', ''].map(h => (
                      <th key={h} style={{ textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', padding: '4px 6px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bloque.filas.map((fila, filaIdx) => (
                    <tr key={filaIdx}>
                      <td style={{ padding: '3px 6px' }}><input style={inputStyle} value={fila.valor} onChange={e => updateFila(i, filaIdx, { valor: e.target.value })} /></td>
                      <td style={{ padding: '3px 6px' }}><input style={inputStyle} value={fila.estandar} onChange={e => updateFila(i, filaIdx, { estandar: e.target.value })} /></td>
                      <td style={{ padding: '3px 6px' }}><input style={inputStyle} value={fila.tolerancia} onChange={e => updateFila(i, filaIdx, { tolerancia: e.target.value })} /></td>
                      <td style={{ padding: '3px 6px', width: 28 }}>
                        <button onClick={() => removeFila(i, filaIdx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <Button variant="ghost" size="sm" onClick={() => addFila(i)} style={{ marginBottom: 10 }}>
              <Plus size={13} /> Agregar fila
            </Button>

            {bloque.filas.length === 0 ? (
              // Reactivo/solución/bomba/titulador: campos separados y
              // amigables en vez de un solo bloque de texto libre — el
              // encabezado "Ref./Lote/Vencimiento" se arma solo al copiar.
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
                  <Input label="Lote" value={bloque.lote} onChange={e => updateBloque(i, { lote: e.target.value })} placeholder="Ej. 2249" />
                  <MonthYearInput label="Fecha de Vencimiento" value={bloque.fecha_vencimiento} onChange={v => updateBloque(i, { fecha_vencimiento: v })} />
                </div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>
                  Texto de certificación
                </label>
                <textarea style={textareaStyle} value={bloque.notas} onChange={e => updateBloque(i, { notas: e.target.value })} />
              </div>
            ) : (
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>
                  Notas (texto narrativo, opcional)
                </label>
                <textarea style={textareaStyle} value={bloque.notas} onChange={e => updateBloque(i, { notas: e.target.value })} />
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(buildBloqueHtml(bloque), 'Bloque de mediciones')}>
                <Copy size={13} /> Copiar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => openGuardar(i)}>
                <Save size={13} /> Guardar como plantilla
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={guardando !== null} onClose={() => setGuardando(null)} title="Guardar como plantilla" width={420}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
            Si el código ya existe como plantilla, se actualiza con estos valores.
          </p>
          <Input label="Código de la plantilla" value={nuevoCodigo} onChange={e => setNuevoCodigo(e.target.value)} />
          <Input label="Categoría" value={nuevaCategoria} onChange={e => setNuevaCategoria(e.target.value)} placeholder="Ej. pH, Cloro Libre" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="ghost" onClick={() => setGuardando(null)}>Cancelar</Button>
            <Button onClick={handleGuardarPlantilla} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
