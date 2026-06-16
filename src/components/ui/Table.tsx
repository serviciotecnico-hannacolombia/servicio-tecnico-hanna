import type { ReactNode } from 'react'

export interface Column<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode
  width?: string
  align?: 'left' | 'center' | 'right'
}

interface TableProps<T extends object> {
  columns: Column<T>[]
  data: T[]
  emptyMessage?: string
  keyExtractor?: (row: T, i: number) => string | number
}

export function Table<T extends object>({
  columns,
  data,
  emptyMessage = 'Sin datos',
  keyExtractor,
}: TableProps<T>) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border)' }}>
            {columns.map(col => (
              <th
                key={col.key}
                style={{
                  padding: '10px 14px',
                  textAlign: col.align ?? 'left',
                  fontFamily: 'var(--mono)',
                  fontSize: '0.68rem',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  color: 'var(--muted)',
                  whiteSpace: 'nowrap',
                  width: col.width,
                  background: 'var(--surface)',
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.875rem' }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => {
              const k = keyExtractor ? keyExtractor(row, i) : i
              return (
                <tr
                  key={k}
                  style={{ borderBottom: '1px solid var(--border)', transition: 'background .1s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  {columns.map(col => (
                    <td
                      key={col.key}
                      style={{ padding: '10px 14px', color: 'var(--text)', textAlign: col.align ?? 'left', verticalAlign: 'middle' }}
                    >
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
