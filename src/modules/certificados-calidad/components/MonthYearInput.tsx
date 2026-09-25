// Reemplaza <input type="month"> — su selector nativo hace que Tab salte del
// mes al siguiente campo del formulario sin pasar por el año (el foco entre
// sus dos "segmentos" internos no se comporta como un tabstop normal). Dos
// <select> normales no tienen ese problema y son más amigables para elegir
// mes/año. Value y onChange siguen usando "AAAA-MM" para no tocar dónde se
// guarda el dato.

const MESES = [
  { value: '01', label: 'Enero' }, { value: '02', label: 'Febrero' }, { value: '03', label: 'Marzo' },
  { value: '04', label: 'Abril' }, { value: '05', label: 'Mayo' }, { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' }, { value: '08', label: 'Agosto' }, { value: '09', label: 'Septiembre' },
  { value: '10', label: 'Octubre' }, { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' },
];

function anioOptions(): number[] {
  const actual = new Date().getFullYear();
  const years: number[] = [];
  for (let y = actual - 5; y <= actual + 15; y++) years.push(y);
  return years;
}

const selectStyle: React.CSSProperties = {
  flex: 1, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
  background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: '0.82rem',
};

interface MonthYearInputProps {
  label?: string;
  value: string; // "AAAA-MM" o ""
  onChange: (value: string) => void;
}

export function MonthYearInput({ label, value, onChange }: MonthYearInputProps) {
  const [anio, mes] = value ? value.split('-') : ['', ''];

  const update = (nextAnio: string, nextMes: string) =>
    onChange(nextAnio && nextMes ? `${nextAnio}-${nextMes}` : '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)' }}>{label}</label>}
      <div style={{ display: 'flex', gap: 6 }}>
        <select style={selectStyle} value={mes} onChange={e => update(anio, e.target.value)}>
          <option value="">Mes</option>
          {MESES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <select style={selectStyle} value={anio} onChange={e => update(e.target.value, mes)}>
          <option value="">Año</option>
          {anioOptions().map(y => <option key={y} value={String(y)}>{y}</option>)}
        </select>
      </div>
    </div>
  );
}
