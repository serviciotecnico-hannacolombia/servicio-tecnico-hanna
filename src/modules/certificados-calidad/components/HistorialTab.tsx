import { useState } from 'react';
import { toast } from 'sonner';
import { FolderOpen, Trash2, Search } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { supabase } from '../../../lib/supabase';
import { useCertificadosGenerados, useInvalidateCertificadosCalidad } from '../hooks/useCertificadosCalidad';
import type { CertificadoGenerado } from '../types';

interface HistorialTabProps {
  onLoadDraft: (draft: CertificadoGenerado) => void;
}

export function HistorialTab({ onLoadDraft }: HistorialTabProps) {
  const { data: certificados = [] } = useCertificadosGenerados();
  const invalidate = useInvalidateCertificadosCalidad();
  const [busqueda, setBusqueda] = useState('');

  const filtrados = certificados.filter(c => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return [c.tecnico, ...c.mediciones.map(m => m.titulo)]
      .some(v => v?.toLowerCase().includes(q));
  });

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!window.confirm('¿Eliminar este borrador del historial?')) return;
    const { error } = await supabase.from('certificados_calidad_generados').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar: ' + error.message); return; }
    invalidate();
    toast.success('Borrador eliminado del historial');
  };

  return (
    <Card title="Historial de Borradores" bodyStyle={{ padding: 0 }}>
      <div style={{ padding: '14px 20px' }}>
        <Input icon={<Search size={14} />} placeholder="Buscar por referencia o técnico..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
            {['Referencias', 'Técnico', 'Fecha', ''].map(h => (
              <th key={h} style={{ textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', padding: '8px 20px' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtrados.map(c => (
            <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '8px 20px', fontSize: '0.82rem' }}>{c.mediciones.map(m => m.titulo).join(', ')}</td>
              <td style={{ padding: '8px 20px', fontSize: '0.82rem' }}>{c.tecnico}</td>
              <td style={{ padding: '8px 20px', fontSize: '0.82rem', color: 'var(--muted)' }}>{c.fecha}</td>
              <td style={{ padding: '8px 20px', display: 'flex', gap: 10 }}>
                <button onClick={() => onLoadDraft(c)} title="Cargar en el formulario" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', display: 'flex' }}>
                  <FolderOpen size={15} />
                </button>
                <button onClick={() => handleDelete(c.id)} title="Eliminar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', display: 'flex' }}>
                  <Trash2 size={15} />
                </button>
              </td>
            </tr>
          ))}
          {filtrados.length === 0 && (
            <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>Sin borradores guardados</td></tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}
