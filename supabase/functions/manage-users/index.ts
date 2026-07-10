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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Sin autorización')

    // Verify caller is authenticated and has admin role
    const caller = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authErr } = await caller.auth.getUser()
    if (authErr || !user) throw new Error('No autenticado')

    const { data: isAdmin, error: rpcErr } = await caller.rpc('has_module', { _module_key: 'admin' })

    if (rpcErr || !isAdmin) {
      throw new Error('Se requiere el módulo de Administración')
    }

    // Admin client uses service_role — never exposed to the browser
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const body = await req.json()
    const { action } = body

    if (action === 'create') {
      const { email, full_name, role_id, password } = body

      if (!email || !password || !full_name || !role_id) {
        throw new Error('email, full_name, role_id y password son requeridos')
      }
      if (password.length < 6) {
        throw new Error('La contraseña debe tener mínimo 6 caracteres')
      }

      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, role_id },
      })

      if (error) throw error
      return json({ success: true, userId: data.user?.id })
    }

    if (action === 'delete') {
      const { userId } = body
      if (!userId) throw new Error('userId es requerido')
      if (userId === user.id) throw new Error('No puedes eliminarte a ti mismo')

      const { error } = await admin.auth.admin.deleteUser(userId)
      if (error) throw error
      return json({ success: true })
    }

    throw new Error(`Acción no reconocida: ${action}`)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return json({ success: false, error: message }, 400)
  }
})
