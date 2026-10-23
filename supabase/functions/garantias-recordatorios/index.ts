import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { renderRecordatorio, type FilaCorreo } from './render.ts'

const CC_SERVICIO_TECNICO = 'serviciotecnico@hannacolombia.com'
const MAX_INTENTOS = 5

const ESTADO_LABEL: Record<string, string> = {
  pnc_pendiente: 'PNC pendiente',
  nv: 'NV',
  importacion: 'Importación',
  informe: 'Informe',
  finalizada: 'Finalizada',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}

function fmtFecha(iso: string | null): string {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

function fmtFechaHora(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    timeZone: 'America/Bogota', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

interface Recordatorio {
  id: string
  garantia_id: string
  fecha_hora: string
  nota: string | null
  creado_por: string | null
  intentos: number
}

// La invoca pg_cron (vía pg_net) cada 5 minutos cuando hay recordatorios de
// garantía vencidos. No hay usuario: se valida el header x-cron-secret
// contra el secret CRON_SECRET y se trabaja con service_role. Se despliega
// con --no-verify-jwt. Secrets: CRON_SECRET, RESEND_API_KEY,
// RESEND_FROM_EMAIL, APP_URL (opcional, para el botón "Ver garantía").
Deno.serve(async (req) => {
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return json({ success: false, error: 'No autorizado' }, 401)
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL')
  if (!resendApiKey || !fromEmail) {
    return json({ success: false, error: 'RESEND_API_KEY / RESEND_FROM_EMAIL no configurados' }, 500)
  }
  const appUrl = (Deno.env.get('APP_URL') || '').replace(/\/+$/, '')

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: tomados, error: tomarErr } = await admin.rpc('garantias_recordatorios_tomar')
  if (tomarErr) return json({ success: false, error: tomarErr.message }, 500)
  const recordatorios = (tomados || []) as Recordatorio[]
  if (!recordatorios.length) return json({ success: true, enviados: 0 })

  const garantiaIds = [...new Set(recordatorios.map(r => r.garantia_id))]
  const { data: garantias, error: gErr } = await admin.from('garantias').select('*').in('id', garantiaIds)
  if (gErr) return json({ success: false, error: gErr.message }, 500)
  const garantiaPorId = new Map((garantias || []).map(g => [g.id, g]))

  const perfilIds = new Set<string>()
  for (const g of garantias || []) for (const r of g.responsables || []) perfilIds.add(r)
  for (const r of recordatorios) if (r.creado_por) perfilIds.add(r.creado_por)
  const { data: perfiles } = await admin.from('profiles').select('id, email, full_name, activo').in('id', [...perfilIds])
  const perfilPorId = new Map((perfiles || []).map(p => [p.id, p]))

  const correosAsesor = [...new Set((garantias || []).map(g => g.asesor_correo))]
  const { data: asesores } = await admin.from('calibraciones_asesores').select('correo, nombre').in('correo', correosAsesor)
  const asesorPorCorreo = new Map((asesores || []).map(a => [a.correo, a.nombre]))

  async function fallo(r: Recordatorio, error: string, definitivo = false) {
    await admin.from('garantias_recordatorios').update({
      procesando_at: null,
      intentos: definitivo ? MAX_INTENTOS : r.intentos + 1,
      error,
    }).eq('id', r.id)
  }

  let enviados = 0
  const errores: string[] = []

  for (const r of recordatorios) {
    const g = garantiaPorId.get(r.garantia_id)
    if (!g) { await fallo(r, 'Garantía no encontrada', true); continue }
    if (g.anulada) {
      await admin.from('garantias_recordatorios')
        .update({ procesando_at: null, cancelado_at: new Date().toISOString(), error: 'Garantía anulada: no se envió' })
        .eq('id', r.id)
      continue
    }

    const destinatarios = [...new Set((g.responsables as string[] || [])
      .map(id => perfilPorId.get(id))
      .filter(p => p && p.activo && p.email)
      .map(p => p!.email as string))]
    if (!destinatarios.length) { await fallo(r, 'La garantía no tiene responsables activos con correo', true); continue }

    const nombre = (id: string) => { const p = perfilPorId.get(id); return p ? (p.full_name || p.email) : '' }
    const codigo = `GAR-${g.numero}`
    const detalle: FilaCorreo[] = [
      { label: 'Cliente', valor: g.cliente },
      { label: 'NIT', valor: g.nit || '' },
      { label: 'Referencia', valor: g.referencia },
      { label: 'OTST', valor: g.otst || '' },
      { label: 'Requerimiento NV', valor: g.requerimiento_nv || '' },
      { label: 'NV', valor: g.numero_nv || '' },
      { label: 'PNC', valor: g.numero_pnc || '' },
      { label: 'Asesor', valor: asesorPorCorreo.get(g.asesor_correo) || g.asesor_correo },
      { label: 'Stock', valor: g.hay_stock ? 'Sí' : 'No' },
      { label: 'Seguimiento', valor: fmtFecha(g.fecha_seguimiento) },
      { label: 'Entrega', valor: fmtFecha(g.fecha_limite_entrega) },
      { label: 'Responsables', valor: (g.responsables as string[] || []).map(nombre).filter(Boolean).join(', ') },
    ]

    const html = renderRecordatorio({
      codigo,
      cliente: g.cliente,
      estado: ESTADO_LABEL[g.estado] || g.estado,
      fechaHora: fmtFechaHora(r.fecha_hora),
      nota: r.nota,
      programadoPor: r.creado_por ? nombre(r.creado_por) : null,
      detalle,
      garantiaUrl: appUrl ? `${appUrl}/garantias/${g.id}` : null,
    })

    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromEmail,
          to: destinatarios,
          cc: [CC_SERVICIO_TECNICO],
          subject: `Recordatorio: gestionar ${codigo} — ${g.cliente}`,
          html,
        }),
      })
      if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(`Resend respondió ${resp.status}: ${text}`)
      }
      await admin.from('garantias_recordatorios')
        .update({ enviado_at: new Date().toISOString(), procesando_at: null, error: null })
        .eq('id', r.id)
      enviados++
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      errores.push(`${r.id}: ${message}`)
      await fallo(r, message)
    }
  }

  return json({ success: errores.length === 0, enviados, errores })
})
