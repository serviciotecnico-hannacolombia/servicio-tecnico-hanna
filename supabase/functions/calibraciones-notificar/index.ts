import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { renderCorreo } from './render.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CC_SERVICIO_TECNICO = 'serviciotecnico@hannacolombia.com'

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

// Recibe un cambio de estado de una orden de calibración y envía el correo
// directamente vía Resend — al asesor de la orden, con copia a Servicio
// Técnico. La API key y el remitente viven como secrets de esta función
// (RESEND_API_KEY, RESEND_FROM_EMAIL), nunca expuestos al navegador.
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

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) throw new Error('RESEND_API_KEY no está configurado')
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL')
    if (!fromEmail) throw new Error('RESEND_FROM_EMAIL no está configurado')

    // El asunto no lleva HTML — se arma con el texto plano (Resend lo escapa).
    const clienteTxt = cliente ? String(cliente) : ''
    const numeroOcTxt = numeroOc ? String(numeroOc) : ''
    const subject = `${numeroOcTxt || 'Orden de calibración'}${clienteTxt ? ' · ' + clienteTxt : ''} — ${String(estadoNuevo)}`

    // titular/detalles/proximoPaso/resumen son opcionales: si el frontend
    // no los manda (versión anterior), el correo sale solo con el cambio.
    const html = renderCorreo({
      ordenId, cliente, numeroOc, estadoAnterior, estadoNuevo, ordenUrl, usuario,
      titular: body.titular, detalles: body.detalles, proximoPaso: body.proximoPaso, resumen: body.resumen,
    })

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [correoAsesor],
        cc: [CC_SERVICIO_TECNICO],
        subject,
        html,
      }),
    })

    if (!resp.ok) {
      const text = await resp.text().catch(() => '')
      throw new Error(`Resend respondió ${resp.status}: ${text}`)
    }

    return json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return json({ success: false, error: message }, 400)
  }
})
