import type { ModuleKey } from '../types'

export const INTRANET_URL = 'https://intranet.hannacolombia.com/stecnico/item/'

// Orden de prioridad para decidir a dónde aterriza cada quien al entrar —
// el mismo orden que ve en el sidebar (Sidebar.tsx).
export const MODULE_ROUTES: { key: ModuleKey; path: string }[] = [
  { key: 'llamadas',    path: '/llamadas' },
  { key: 'bodega',      path: '/bodega' },
  { key: 'consumibles', path: '/consumibles' },
  { key: 'tarifas',     path: '/tarifas' },
  { key: 'codigos',     path: '/codigos' },
  { key: 'editor',      path: '/editor' },
  { key: 'indicadores', path: '/indicadores' },
  { key: 'correos',     path: '/correos' },
  { key: 'reporte_st',  path: '/reporte-st' },
  { key: 'tareas',      path: '/tareas' },
  { key: 'admin',       path: '/admin' },
]

// Ruta del primer módulo al que el usuario tiene acceso, en el orden de
// arriba. Si no tiene ninguno, cae en /llamadas (ModuleGuard mostrará
// "sin acceso" ahí, que es el mensaje correcto para ese caso).
export function getDefaultRoute(hasModule: (key: ModuleKey) => boolean): string {
  return MODULE_ROUTES.find(m => hasModule(m.key))?.path ?? '/llamadas'
}

export const RESPONSABLES = [
  'Cristiam Villate',
  'Sol Rojas',
  'Wilfor Leyva',
  'German Mosso',
  'Andres Herrera',
  'Andres Latorre',
  'Juan Peñuela',
  'Brayan Galeano',
  'Maicol Peralta',
  'Zaira Manuela Trujillo',
]

export const UBICACIONES = ['Control de Calidad', 'Servicio Técnico']

export const TEAM_USERS = ['Juan Camilo', 'Brayan', 'Sol', 'Cristiam']
