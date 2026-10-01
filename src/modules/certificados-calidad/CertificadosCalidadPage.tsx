import { useState } from 'react';
import { FilePlus2, LayoutList, FlaskConical, Paperclip, History } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { CrearCertificadoTab } from './components/CrearCertificadoTab';
import { PlantillasCatalogoTab } from './components/PlantillasCatalogoTab';
import { SolucionesPatronCatalogoTab } from './components/SolucionesPatronCatalogoTab';
import { ArchivosCatalogoTab } from './components/ArchivosCatalogoTab';
import { HistorialTab } from './components/HistorialTab';
import type { CertificadoGenerado } from './types';

type TabKey = 'crear' | 'plantillas' | 'soluciones' | 'archivos' | 'historial';

const TABS: { key: TabKey; label: string; icon: typeof FilePlus2 }[] = [
  { key: 'crear', label: 'Crear Certificado', icon: FilePlus2 },
  { key: 'plantillas', label: 'Plantillas de Referencia', icon: LayoutList },
  { key: 'soluciones', label: 'Soluciones Patrón', icon: FlaskConical },
  { key: 'archivos', label: 'Archivos', icon: Paperclip },
  { key: 'historial', label: 'Historial', icon: History },
];

export function CertificadosCalidadPage() {
  const [tab, setTab] = useState<TabKey>('crear');
  const [draftToLoad, setDraftToLoad] = useState<CertificadoGenerado | null>(null);
  // Fuerza el remount de CrearCertificadoTab al cargar un borrador del
  // historial, para que reinicialice su estado desde initialDraft sin
  // necesitar un efecto que sincronice props → estado.
  const [loadKey, setLoadKey] = useState(0);

  const handleLoadDraft = (draft: CertificadoGenerado) => {
    setDraftToLoad(draft);
    setLoadKey(k => k + 1);
    setTab('crear');
  };

  return (
    <div>
      <Header
        title="Certificados de Calidad"
        subtitle="Arma los datos por referencia de equipo y cópialos a la plataforma oficial — este módulo no reemplaza la generación del certificado real."
      />

      <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 20, fontSize: '0.78rem', cursor: 'pointer',
              fontFamily: 'var(--sans)', fontWeight: tab === key ? 700 : 500,
              border: `1px solid ${tab === key ? 'var(--accent)' : 'var(--border)'}`,
              background: tab === key ? 'var(--accent)' : 'var(--surface)',
              color: tab === key ? '#fff' : 'var(--muted)',
              transition: 'all .15s',
            }}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'crear' && (
        <CrearCertificadoTab key={loadKey} initialDraft={draftToLoad} />
      )}
      {tab === 'plantillas' && <PlantillasCatalogoTab />}
      {tab === 'soluciones' && <SolucionesPatronCatalogoTab />}
      {tab === 'archivos' && <ArchivosCatalogoTab />}
      {tab === 'historial' && <HistorialTab onLoadDraft={handleLoadDraft} />}
    </div>
  );
}

export default CertificadosCalidadPage;