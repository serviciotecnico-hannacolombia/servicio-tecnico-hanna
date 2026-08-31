import React, { useState } from 'react';
import { parseEquipoQR } from '../../modules/void/utils/qrParser';
import { Search, X, Shield, Wrench, Box } from 'lucide-react';

interface ParsedResult {
  referencia: string;
  serie: string;
  origen: string;
  nombre: string;
  isValid: boolean;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const [qrCode, setQrCode] = useState('');
  const [searchResult, setSearchResult] = useState<ParsedResult | null>(null);

  if (!isOpen) return null;

  const handleScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const parsed = parseEquipoQR(qrCode);
      setSearchResult(parsed);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
      <div style={{ background: '#ffffff', borderRadius: 12, width: '100%', maxWidth: 500, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={18} style={{ color: '#005eb8' }} /> Verificación & Trazabilidad
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
        </div>

        <input
          type="text"
          value={qrCode}
          onChange={(e) => setQrCode(e.target.value)}
          onKeyDown={handleScan}
          placeholder="Pistolea el QR del equipo para verificar..."
          style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.875rem', fontFamily: 'monospace', outline: 'none' }}
          autoFocus
        />

        {searchResult && (
          <div style={{ marginTop: 16, padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.825rem' }}>
            <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>{searchResult.nombre}</div>
            <div style={{ color: '#64748b', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div><strong>Ref:</strong> {searchResult.referencia}</div>
              <div><strong>Serie:</strong> {searchResult.serie}</div>
            </div>

            <div style={{ marginTop: 12, borderTop: '1px solid #e2e8f0', paddingTop: 8, display: 'flex', gap: 8 }}>
              <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '4px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Shield size={12} /> VOID Verificado
              </span>
              <span style={{ background: '#fef3c7', color: '#b45309', padding: '4px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Box size={12} /> Bodega ST
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};