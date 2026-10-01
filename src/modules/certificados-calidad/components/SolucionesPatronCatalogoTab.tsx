import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { supabase } from '../../../lib/supabase';
import { MonthYearInput } from './MonthYearInput';
import { useSolucionesPatron, useInvalidateCertificadosCalidad } from '../hooks/useCertificadosCalidad';
import type { SolucionPatron } from '../types';

type FormState = { categoria: string; codigo: string; lote: string; fecha_expiracion: string; descripcion: string; activo: boolean };

function toForm(s?: SolucionPatron | null): FormState {
  return {
    categoria: s?.categoria ?? '',
    codigo: s?.codigo ?? '',
    lote: s?.lote ?? '',
    fecha_expiracion: s?.fecha_expiracion ?? '',
    descripcion: s?.descripcion ?? '',
    activo: s?.activo ?? true,
  };
}

export function SolucionesPatronCatalogoTab() {
  const { data: soluciones = [] } = useSolucionesPatron();
  const invalidate = useInvalidateCertificadosCalidad();
  const [editing, setEditing] = useState<SolucionPatron | null | 'new'>(null);
  const [form, setForm] = useState<FormState>(toForm());
  const [saving, setSaving] = useState(false);

  const openNew = () => { setForm(toForm()); setEditing('new'); };
  const openEdit = (s: SolucionPatron) => { setForm(toForm(s)); setEditing(s); };
  const close = () => setEditing(null);

  const handleSave = async () => {
    if (!form.categoria.trim()) { toast.error('La categoría es obligatoria'); return; }
    setSaving(true);
    const payload = {
      categoria: form.categoria.trim(),
      codigo: form.codigo || null,
      lote: form.lote || null,
      fecha_expiracion: form.fecha_expiracion || null,
      descripcion: form.descripcion || null,
      activo: form.activo,
      updated_at: new Date().toISOString(),
    };
    const { error } = editing === 'new'
      ? await supabase.from('certificados_calidad_soluciones_patron').insert(payload)
      : await supabase.from('certificados_calidad_soluciones_patron').update(payload).eq('id', (editing as SolucionPatron).id);
    setSaving(false);
    if (error) { toast.error('Error al guardar: ' + error.message); return; }
    invalidate();
    toast.success('Solución patrón guardada');
    close();
  };

  const handleDelete = async (s: SolucionPatron) => {
    if (!window.confirm(`¿Eliminar "${s.descripcion || s.categoria}"?`)) return;
    const { error } = await supabase.from('certificados_calidad_soluciones_patron').delete().eq('id', s.id);
    if (error) { toast.error('Error al eliminar: ' + error.message); return; }
    invalidate();
    toast.success('Eliminada');
  };

  return (
    <Card title="Catálogo de Soluciones Estándar / Equipos Patrón" bodyStyle={{ padding: 0 }}>
      <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'flex-end' }}>
        <Button size="sm" onClick={openNew}><Plus size={14} /> Nueva solución</Button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
            {['Categoría', 'Código', 'Lote', 'Descripción', 'Activo', ''].map(h => (
              <th key={h} style={{ textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', padding: '8px 20px' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {soluciones.map(s => (
            <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '8px 20px', fontSize: '0.82rem' }}>{s.categoria}</td>
              <td style={{ padding: '8px 20px', fontFamily: 'var(--mono)', fontSize: '0.82rem' }}>{s.codigo}</td>
              <td style={{ padding: '8px 20px', fontSize: '0.82rem' }}>{s.lote}</td>
              <td style={{ padding: '8px 20px', fontSize: '0.82rem', color: 'var(--muted)' }}>{s.descripcion}</td>
              <td style={{ padding: '8px 20px', fontSize: '0.82rem' }}>{s.activo ? 'Sí' : 'No'}</td>
              <td style={{ padding: '8px 20px', display: 'flex', gap: 10 }}>
                <button onClick={() => openEdit(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}><Pencil size={15} /></button>
                <button onClick={() => handleDelete(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', display: 'flex' }}><Trash2 size={15} /></button>
              </td>
            </tr>
          ))}
          {soluciones.length === 0 && (
            <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>Sin soluciones registradas</td></tr>
          )}
        </tbody>
      </table>

      <Modal open={!!editing} onClose={close} title={editing === 'new' ? 'Nueva solución patrón' : 'Editar solución patrón'} width={480}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input label="Categoría" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} placeholder="Ej. pH, Cloro Libre" />
          <Input label="Código" value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} />
          <Input label="Lote" value={form.lote} onChange={e => setForm({ ...form, lote: e.target.value })} />
          <MonthYearInput label="Fecha de Expiración" value={form.fecha_expiracion} onChange={v => setForm({ ...form, fecha_expiracion: v })} />
          <Input label="Descripción" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.85rem' }}>
            <input type="checkbox" checked={form.activo} onChange={e => setForm({ ...form, activo: e.target.checked })} />
            Activa (aparece como sugerencia rápida)
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
