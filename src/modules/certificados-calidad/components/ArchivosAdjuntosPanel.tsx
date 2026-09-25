import { Download, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import type { ArchivoCertificado, CertificadoPlantilla } from '../types';

const MAX_ADJUNTOS = 5;

interface ArchivosAdjuntosPanelProps {
  archivos: ArchivoCertificado[];
  plantillasSeleccionadas: CertificadoPlantilla[];
  seleccionados: string[];
  onChangeSeleccionados: (ids: string[]) => void;
}

export function ArchivosAdjuntosPanel({ archivos, plantillasSeleccionadas, seleccionados, onChangeSeleccionados }: ArchivosAdjuntosPanelProps) {
  const plantillaIds = new Set(plantillasSeleccionadas.map(p => p.id));
  const categorias = new Set(plantillasSeleccionadas.map(p => p.categoria).filter(Boolean) as string[]);

  const relevantes = archivos.filter(a =>
    (a.plantilla_id && plantillaIds.has(a.plantilla_id)) ||
    (a.categoria && categorias.has(a.categoria))
  );

  const toggle = (id: string) => {
    if (seleccionados.includes(id)) {
      onChangeSeleccionados(seleccionados.filter(s => s !== id));
      return;
    }
    if (seleccionados.length >= MAX_ADJUNTOS) {
      toast.error(`Máximo ${MAX_ADJUNTOS} adjuntos (la intranet solo tiene ${MAX_ADJUNTOS} campos)`);
      return;
    }
    onChangeSeleccionados([...seleccionados, id]);
  };

  const handleDownload = async (archivo: ArchivoCertificado) => {
    const { data, error } = await supabase.storage
      .from('certificados-calidad')
      .createSignedUrl(archivo.storage_path, 60);
    if (error || !data) { toast.error('No se pudo generar el enlace de descarga: ' + (error?.message || '')); return; }
    window.open(data.signedUrl, '_blank');
  };

  if (plantillasSeleccionadas.length === 0) {
    return <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Agrega equipos arriba para ver los archivos disponibles según su categoría.</p>;
  }

  if (relevantes.length === 0) {
    return <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>No hay archivos cargados para los equipos/categorías seleccionados.</p>;
  }

  return (
    <div>
      <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 10 }}>
        Marca hasta {MAX_ADJUNTOS} archivos para incluir en este certificado — se copiarán junto con los demás datos hacia la intranet.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {relevantes.map(a => (
          <div key={a.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
            padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface2)',
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'var(--text)', cursor: 'pointer', flex: 1 }}>
              <input type="checkbox" checked={seleccionados.includes(a.id)} onChange={() => toggle(a.id)} />
              <Paperclip size={14} style={{ color: 'var(--muted)' }} />
              {a.nombre_archivo}
            </label>
            <button
              onClick={() => handleDownload(a)}
              title="Descargar"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', display: 'flex' }}
            >
              <Download size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
