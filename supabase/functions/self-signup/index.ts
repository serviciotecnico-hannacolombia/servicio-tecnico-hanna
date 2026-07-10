import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_DOMAIN = 'hannacolombia.com'
const DEFAULT_ROLE_NAME = 'Ventas'

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { email, full_name, password } = await req.json()

    if (!email || !password || !full_name) {
      throw new Error('email, full_name y password son requeridos')
    }
    if (password.length < 6) {
      throw new Error('La contraseña debe tener mínimo 6 caracteres')
    }
    const domain = String(email).split('@')[1]?.toLowerCase()
    if (domain !== ALLOWED_DOMAIN) {
      throw new Error(`Solo se permiten cuentas con correo @${ALLOWED_DOMAIN}`)
    }

    // Admin client usa service_role — nunca se expone al navegador
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: ventasRole, error: roleErr } = await admin
      .from('roles')
      .select('id')
      .eq('name', DEFAULT_ROLE_NAME)
      .single()
    if (roleErr || !ventasRole) throw new Error('No se encontró el rol por defecto')

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role_id: ventasRole.id },
    })

    if (error) throw error
    return json({ success: true, userId: data.user?.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return json({ success: false, error: message }, 400)
  }
})
