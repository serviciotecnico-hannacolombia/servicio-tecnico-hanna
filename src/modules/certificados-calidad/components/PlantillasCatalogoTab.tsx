import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { supabase } from '../../../lib/supabase';
import { usePlantillas, useInvalidateCertificadosCalidad } from '../hooks/useCertificadosCalidad';
import type { CertificadoPlantilla, MedicionFila } from '../types';

const textareaStyle: React.CSSProperties = {
  width: '100%', minHeight: 70, padding: '8px 12px', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)', background: 'var(--surface)', color: 'var(--text)',
  fontFamily: 'var(--sans)', fontSize: '0.82rem', resize: 'vertical',
};

const rowInputStyle: React.CSSProperties = {
  width: '100%', padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
  background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: '0.82rem',
};

type FormState = {
  codigo: string; nombre: string; categoria: string;
  filas: MedicionFila[]; notas_generales: string;
  test_funcional_items: string; embalaje_items: string; control_estetico_items: string;
  activo: boolean;
};

function toForm(p?: CertificadoPlantilla | null): FormState {
  return {
    codigo: p?.codigo ?? '',
    nombre: p?.nombre ?? '',
    categoria: p?.categoria ?? '',
    filas: p?.filas ?? [],
    notas_generales: p?.notas_generales ?? '',
    test_funcional_items: (p?.test_funcional_items ?? []).join(', '),
    embalaje_items: (p?.embalaje_items ?? []).join(', '),
    control_estetico_items: (p?.control_estetico_items ?? []).join(', '),
    activo: p?.activo ?? true,
  };
}

const splitList = (s: string) => s.split(',').map(v => v.trim()).filter(Boolean);

export function PlantillasCatalogoTab() {
  const { data: plantillas = [] } = usePlantillas();
  const invalidate = useInvalidateCertificadosCalidad();
  const [editing, setEditing] = useState<CertificadoPlantilla | null | 'new'>(null);
  const [form, setForm] = useState<FormState>(toForm());
  const [saving, setSaving] = useState(false);

  const openNew = () => { setForm(toForm()); setEditing('new'); };
  const openEdit = (p: CertificadoPlantilla) => { setForm(toForm(p)); setEditing(p); };
  const close = () => setEditing(null);

  const updateFila = (i: number, patch: Partial<MedicionFila>) => {
    const filas = form.filas.slice();
    filas[i] = { ...filas[i], ...patch };
    setForm({ ...form, filas });
  };
  const addFila = () => setForm({ ...form, filas: [...form.filas, { valor: '', estandar: '', tolerancia: '' }] });
  const removeFila = (i: number) => setForm({ ...form, filas: form.filas.filter((_, idx) => idx !== i) });

  const handleSave = async () => {
    if (!form.codigo.trim()) { toast.error('El código es obligatorio'); return; }
    setSaving(true);
    const payload = {
      codigo: form.codigo.trim(),
      nombre: form.nombre.trim() || null,
      categoria: form.categoria.trim() || null,
      filas: form.filas,
      notas_generales: form.notas_generales || null,
      test_funcional_items: splitList(form.test_funcional_items),
      embalaje_items: splitList(form.embalaje_items),
      control_estetico_items: splitList(form.control_estetico_items),
      activo: form.activo,
      updated_at: new Date().toISOString(),
    };
    const { error } = editing === 'new'
      ? await supabase.from('certificados_calidad_plantillas').insert(payload)
      : await supabase.from('certificados_calidad_plantillas').update(payload).eq('id', (editing as CertificadoPlantilla).id);
    setSaving(false);
    if (error) { toast.error('Error al guardar: ' + error.message); return; }
    invalidate();
    toast.success('Plantilla guardada');
    close();
  };

  const handleDelete = async (p: CertificadoPlantilla) => {
    if (!window.confirm(`¿Eliminar la plantilla "${p.codigo}"?`)) return;
    const { error } = await supabase.from('certificados_calidad_plantillas').delete().eq('id', p.id);
    if (error) { toast.error('Error al eliminar: ' + error.message); return; }
    invalidate();
    toast.success('Plantilla eliminada');
  };

  return (
    <Card
      title="Plantillas por Referencia de Equipo"
      bodyStyle={{ padding: 0 }}
    >
      <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'flex-end' }}>
        <Button size="sm" onClick={openNew}><Plus size={14} /> Nueva plantilla</Button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
            {['Código', 'Nombre', 'Categoría', 'Activo', ''].map(h => (
              <th key={h} style={{ textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', padding: '8px 20px' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {plantillas.map(p => (
            <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '8px 20px', fontFamily: 'var(--mono)', fontSize: '0.82rem' }}>{p.codigo}</td>
              <td style={{ padding: '8px 20px', fontSize: '0.82rem' }}>{p.nombre}</td>
              <td style={{ padding: '8px 20px', fontSize: '0.82rem', color: 'var(--muted)' }}>{p.categoria}</td>
              <td style={{ padding: '8px 20px', fontSize: '0.82rem' }}>{p.activo ? 'Sí' : 'No'}</td>
              <td style={{ padding: '8px 20px', display: 'flex', gap: 10 }}>
                <button onClick={() => openEdit(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}><Pencil size={15} /></button>
                <button onClick={() => handleDelete(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', display: 'flex' }}><Trash2 size={15} /></button>
              </td>
            </tr>
          ))}
          {plantillas.length === 0 && (
            <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>Sin plantillas todavía</td></tr>
          )}
        </tbody>
      </table>

      <Modal open={!!editing} onClose={close} title={editing === 'new' ? 'Nueva plantilla' : `Editar ${(editing as CertificadoPlantilla)?.codigo ?? ''}`} width={640}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Código" value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} />
            <Input label="Categoría" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} placeholder="Ej. pH, Cloro Libre, Temperatura" />
          </div>
          <Input label="Nombre" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>
              Mediciones — filas de la tabla (Valor / Sol. Estándar / Tolerancia)
            </label>
            {form.filas.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
                <thead>
                  <tr>
                    {['Valor', 'Sol. Estándar', 'Tolerancia', ''].map(h => (
                      <th key={h} style={{ textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', padding: '3px 6px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {form.filas.map((fila, i) => (
                    <tr key={i}>
                      <td style={{ padding: '3px 6px' }}><input style={rowInputStyle} value={fila.valor} onChange={e => updateFila(i, { valor: e.target.value })} /></td>
                      <td style={{ padding: '3px 6px' }}><input style={rowInputStyle} value={fila.estandar} onChange={e => updateFila(i, { estandar: e.target.value })} /></td>
                      <td style={{ padding: '3px 6px' }}><input style={rowInputStyle} value={fila.tolerancia} onChange={e => updateFila(i, { tolerancia: e.target.value })} /></td>
                      <td style={{ padding: '3px 6px', width: 28 }}>
                        <button onClick={() => removeFila(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <Button variant="ghost" size="sm" onClick={addFila}><Plus size={13} /> Agregar fila</Button>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>
              Notas generales (texto narrativo, para plantillas sin tabla como Bomba o Reactivo)
            </label>
            <textarea style={textareaStyle} value={form.notas_generales} onChange={e => setForm({ ...form, notas_generales: e.target.value })} />
          </div>

          <Input label="Test Funcional (separado por comas)" value={form.test_funcional_items} onChange={e => setForm({ ...form, test_funcional_items: e.target.value })} placeholder="LCD, Teclado, Memoria" />
          <Input label="Embalaje (separado por comas)" value={form.embalaje_items} onChange={e => setForm({ ...form, embalaje_items: e.target.value })} placeholder="Instrumento, Caja, Manual de Instrucciones" />
          <Input label="Control Estético (separado por comas)" value={form.control_estetico_items} onChange={e => setForm({ ...form, control_estetico_items: e.target.value })} placeholder="Estética del instrumento" />

          <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.85rem' }}>
            <input type="checkbox" checked={form.activo} onChange={e => setForm({ ...form, activo: e.target.checked })} />
            Activa (visible al crear certificados)
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="ghost" onClick={close}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
