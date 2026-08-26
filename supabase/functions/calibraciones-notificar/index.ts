import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

// Recibe un cambio de estado de una orden de calibración y lo reenvía al
// trigger HTTP de Power Automate — la URL del webhook nunca se expone al
// navegador, vive solo como secret de esta función (POWER_AUTOMATE_WEBHOOK_URL).
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Sin autorización')

    const caller = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authErr } = await caller.auth.getUser()
    if (authErr || !user) throw new Error('No autenticado')

    const { data: puedeEditar, error: rpcErr } = await caller.rpc('has_capability', { _capability_key: 'calibraciones_editar' })
    if (rpcErr || !puedeEditar) throw new Error('Se requiere permiso de edición de calibraciones')

    const body = await req.json()
    const { ordenId, cliente, numeroOc, correoAsesor, estadoAnterior, estadoNuevo, ordenUrl, usuario } = body

    if (!ordenId || !correoAsesor || !estadoNuevo) {
      throw new Error('ordenId, correoAsesor y estadoNuevo son requeridos')
    }

    const webhookUrl = Deno.env.get('POWER_AUTOMATE_WEBHOOK_URL')
    if (!webhookUrl) throw new Error('POWER_AUTOMATE_WEBHOOK_URL no está configurado')

    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ordenId, cliente, numeroOc, correoAsesor, estadoAnterior, estadoNuevo, ordenUrl, usuario,
        fecha: new Date().toISOString(),
      }),
    })

    if (!resp.ok) {
      const text = await resp.text().catch(() => '')
      throw new Error(`Power Automate respondió ${resp.status}: ${text}`)
    }

    return json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return json({ success: false, error: message }, 400)
  }
})
