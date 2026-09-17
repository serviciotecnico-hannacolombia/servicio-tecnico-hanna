import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Upload, Trash2, Paperclip } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Select } from '../../../components/ui/Select';
import { Input } from '../../../components/ui/Input';
import { supabase } from '../../../lib/supabase';
import { useUser } from '../../../hooks/useUser';
import { usePlantillas, useArchivosCertificado, useInvalidateCertificadosCalidad } from '../hooks/useCertificadosCalidad';

export function ArchivosCatalogoTab() {
  const { user } = useUser();
  const { data: plantillas = [] } = usePlantillas();
  const { data: archivos = [] } = useArchivosCertificado();
  const invalidate = useInvalidateCertificadosCalidad();

  const [modo, setModo] = useState<'categoria' | 'plantilla'>('categoria');
  const [categoria, setCategoria] = useState('');
  const [plantillaId, setPlantillaId] = useState('');
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (modo === 'categoria' && !categoria.trim()) { toast.error('Indica la categoría'); e.target.value = ''; return; }
    if (modo === 'plantilla' && !plantillaId) { toast.error('Elige una plantilla'); e.target.value = ''; return; }

    setUploading(true);
    const carpeta = modo === 'categoria' ? categoria.trim() : plantillas.find(p => p.id === plantillaId)?.codigo || plantillaId;
    const path = `${carpeta}/${Date.now()}-${file.name}`.replace(/\s+/g, '_');

    const { error: uploadError } = await supabase.storage.from('certificados-calidad').upload(path, file);
    if (uploadError) { toast.error('Error al subir archivo: ' + uploadError.message); setUploading(false); if (inputRef.current) inputRef.current.value = ''; return; }

    const { error: insertError } = await supabase.from('certificados_calidad_archivos').insert({
      plantilla_id: modo === 'plantilla' ? plantillaId : null,
      categoria: modo === 'categoria' ? categoria.trim() : null,
      nombre_archivo: file.name,
      storage_path: path,
      created_by: user?.id ?? null,
    });
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
    if (insertError) { toast.error('Error al registrar archivo: ' + insertError.message); return; }
    invalidate();
    toast.success('Archivo cargado al repositorio');
  };

  const handleDelete = async (id: string, storagePath: string) => {
    if (!window.confirm('¿Eliminar este archivo del repositorio?')) return;
    await supabase.storage.from('certificados-calidad').remove([storagePath]);
    const { error } = await supabase.from('certificados_calidad_archivos').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar: ' + error.message); return; }
    invalidate();
    toast.success('Archivo eliminado');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card title="Cargar Archivo al Repositorio">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
          <Select
            label="Asociar a"
            value={modo}
            onChange={e => setModo(e.target.value as 'categoria' | 'plantilla')}
            options={[{ value: 'categoria', label: 'Categoría (compartido)' }, { value: 'plantilla', label: 'Plantilla específica' }]}
          />
          {modo === 'categoria' ? (
            <Input label="Categoría" value={categoria} onChange={e => setCategoria(e.target.value)} placeholder="Ej. pH, Cloro Libre" />
          ) : (
            <Select
              label="Plantilla"
              value={plantillaId}
              onChange={e => setPlantillaId(e.target.value)}
              placeholder="Selecciona..."
              options={plantillas.map(p => ({ value: p.id, label: `${p.codigo} — ${p.nombre ?? ''}` }))}
            />
          )}
        </div>
        <div
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed var(--border)`, borderRadius: 'var(--radius)', padding: '20px',
            textAlign: 'center', cursor: uploading ? 'default' : 'pointer', background: 'var(--surface2)',
          }}
        >
          <Upload size={20} style={{ color: 'var(--muted)', marginBottom: 6 }} />
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>
            {uploading ? 'Subiendo...' : 'Seleccionar archivo'}
          </div>
          <input ref={inputRef} type="file" onChange={handleFile} disabled={uploading} style={{ display: 'none' }} />
        </div>
      </Card>

      <Card title="Archivos en el Repositorio" bodyStyle={{ padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Archivo', 'Asociado a', ''].map(h => (
                <th key={h} style={{ textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', padding: '8px 20px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {archivos.map(a => {
              const plantilla = plantillas.find(p => p.id === a.plantilla_id);
              return (
                <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 20px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Paperclip size={13} style={{ color: 'var(--muted)' }} /> {a.nombre_archivo}
                  </td>
                  <td style={{ padding: '8px 20px', fontSize: '0.82rem', color: 'var(--muted)' }}>
                    {plantilla ? `Plantilla: ${plantilla.codigo}` : `Categoría: ${a.categoria}`}
                  </td>
                  <td style={{ padding: '8px 20px' }}>
                    <button onClick={() => handleDelete(a.id, a.storage_path)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', display: 'flex' }}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {archivos.length === 0 && (
              <tr><td colSpan={3} style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>Sin archivos cargados</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
