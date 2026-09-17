import { Copy } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { copyToClipboard } from '../utils/clipboard';

interface MedicionesBoxProps {
  value: string;
  onChange: (value: string) => void;
}

export function MedicionesBox({ value, onChange }: MedicionesBoxProps) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(value, 'Mediciones')}>
          <Copy size={13} /> Copiar
        </Button>
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={12}
        placeholder="Al agregar equipos arriba, su plantilla de mediciones aparece acá — edita los valores reales antes de copiar."
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--surface)',
          color: 'var(--text)',
          fontFamily: 'var(--mono)',
          fontSize: '0.78rem',
          resize: 'vertical',
        }}
      />
    </div>
  );
}
