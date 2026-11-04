import {supabase} from '../../lib/supabase'
export async function validarExportacionGestion(apartado:'solicitudes'|'consultas') {
 if(import.meta.env.DEV)return
 const {error}=await supabase.rpc('gestion_validar_exportacion',{p_apartado:apartado})
 if(error)throw Error(error.message)
}
