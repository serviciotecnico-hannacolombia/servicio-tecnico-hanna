export function EncabezadoPanel({ titulo, subtitulo, acciones }: { titulo: string, subtitulo?: React.ReactNode, acciones?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 700 }}>{titulo}</h3>
        {subtitulo && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{subtitulo}</p>}
      </div>
      {acciones}
    </div>
  )
}
