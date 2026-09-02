import { createClient, type PostgrestFilterBuilder } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
)

// PostgREST caps unbounded selects at 1000 rows by default and truncates
// silently (no error) instead of returning the rest — any query against a
// table that can grow past that must page through with .range() or it will
// quietly lose the oldest/newest rows depending on the ordering used.
export async function fetchAllRows<T>(
  table: string,
  build: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any> = q => q
): Promise<T[]> {
  const PAGE = 1000
  let all: T[] = []
  let from = 0
  while (true) {
    const { data, error } = await build(supabase.from(table).select('*')).range(from, from + PAGE - 1)
    if (error) throw error
    all = all.concat((data ?? []) as T[])
    if (!data || data.length < PAGE) break
    from += PAGE
  }
  return all
}
