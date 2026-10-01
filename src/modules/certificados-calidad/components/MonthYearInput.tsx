import { useState } from 'react';

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

// Incluye el año del valor actual aunque quede fuera del rango por defecto
// (p. ej. un borrador viejo), para que el <select> no aparezca en blanco.
function anioOptions(anioActual: string): number[] {
  const actual = new Date().getFullYear();
  const years = new Set<number>();
  for (let y = actual - 5; y <= actual + 15; y++) years.add(y);
  const n = Number(anioActual);
  if (anioActual && Number.isInteger(n)) years.add(n);
  return [...years].sort((a, b) => a - b);
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
  // Mientras solo se ha elegido uno de los dos (mes o año), el valor hacia
  // afuera sigue siendo "" — pero la selección parcial se recuerda aquí, si
  // no el <select> recién elegido volvería a "Mes"/"Año" y obligaría a
  // elegir siempre primero el año.
  const [parcial, setParcial] = useState({ anio: '', mes: '' });
  const [anio, mes] = value ? value.split('-') : [parcial.anio, parcial.mes];

  const update = (nextAnio: string, nextMes: string) => {
    setParcial({ anio: nextAnio, mes: nextMes });
    onChange(nextAnio && nextMes ? `${nextAnio}-${nextMes}` : '');
  };

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
          {anioOptions(anio).map(y => <option key={y} value={String(y)}>{y}</option>)}
        </select>
      </div>
    </div>
  );
}
