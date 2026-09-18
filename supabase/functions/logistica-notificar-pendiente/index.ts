import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DESTINATARIO = 'brayan@hannacolombia.com'

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Recibe un pendiente de Logística recién creado y envía el correo
// directamente vía Resend — a un destinatario fijo (no viene del cliente,
// para que no se pueda mandar a otra dirección desde devtools). La API key
// y el remitente viven como secrets del proyecto (RESEND_API_KEY,
// RESEND_FROM_EMAIL), compartidos con calibraciones-notificar.
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
    const { cliente, mensaje } = body

    if (!mensaje) throw new Error('mensaje es requerido')

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) throw new Error('RESEND_API_KEY no está configurado')
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL')
    if (!fromEmail) throw new Error('RESEND_FROM_EMAIL no está configurado')

    const clienteTxt = cliente ? escapeHtml(String(cliente)) : ''
    const mensajeHtml = escapeHtml(String(mensaje)).replace(/\n/g, '<br>')

    const subject = `Pendiente de gestión — ${clienteTxt || 'Sin cliente'}`
    const html = `<p>${mensajeHtml}</p>`

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [DESTINATARIO],
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
