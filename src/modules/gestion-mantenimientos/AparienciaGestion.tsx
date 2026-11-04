import {useEffect, useId, useRef, useState, type ReactNode} from 'react'
import {ChevronDown, Palette} from 'lucide-react'
import {CLAVE_TEMA_GESTION, PALETAS_GESTION, guardarTemaGestion, interpretarTemaGestion, leerTemaGestion, validarAparienciaGestion, type AparienciaGuardadaGestion, type PaletaGestion, type PreferenciaTemaGestion} from './temaGestion'
import './aparienciaGestion.css'
import './paletasGestion.css'

function preferenciaInicial() {
  try { return leerTemaGestion(window.localStorage) }
  catch { return validarAparienciaGestion(null) }
}
export function AparienciaGestion({children}: {children: (selector: ReactNode) => ReactNode}) {
  const [preferencia, setPreferencia] = useState(preferenciaInicial)
  const [sinPersistencia, setSinPersistencia] = useState(false)
  const menu = useRef<HTMLDetailsElement>(null), id = useId()
  useEffect(() => {
    const sincronizar = (evento: StorageEvent) => {
      if (evento.key === CLAVE_TEMA_GESTION || evento.key === null) setPreferencia(interpretarTemaGestion(evento.newValue))
    }
    const cerrarFuera = (evento: PointerEvent) => {
      if (evento.target instanceof Node && menu.current && !menu.current.contains(evento.target)) menu.current.open = false
    }
    const cerrarTeclado = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape' && menu.current?.open) {
        menu.current.open = false
        menu.current.querySelector('summary')?.focus()
      }
    }
    window.addEventListener('storage', sincronizar)
    document.addEventListener('pointerdown', cerrarFuera)
    document.addEventListener('keydown', cerrarTeclado)
    return () => {
      window.removeEventListener('storage', sincronizar)
      document.removeEventListener('pointerdown', cerrarFuera)
      document.removeEventListener('keydown', cerrarTeclado)
    }
  }, [])
  function elegir(cambio: Partial<AparienciaGuardadaGestion>) {
    const valor = {...preferencia,...cambio}
    setPreferencia(valor)
    try { setSinPersistencia(!guardarTemaGestion(window.localStorage, valor)) }
    catch { setSinPersistencia(true) }
  }
  const selector = <div className="gm-apariencia">
    <details className="gm-apariencia-menu" ref={menu}>
      <summary aria-label="Personalizar apariencia de Gestión"><Palette size={17} aria-hidden="true"/><span>Apariencia</span><i className={'gm-muestra gm-muestra-'+preferencia.paleta} aria-hidden="true"/><ChevronDown size={14} aria-hidden="true"/></summary>
      <div className="gm-apariencia-panel">
        <strong>Tu espacio de trabajo</strong>
        <p>Combina luminosidad y color. Los cambios se aplican al instante.</p>
        <label htmlFor={id+'-modo'}>Modo<select id={id+'-modo'} value={preferencia.modo} onChange={e=>elegir({modo:e.target.value as PreferenciaTemaGestion})}><option value="claro">Claro</option><option value="oscuro">Oscuro</option></select></label>
        <label htmlFor={id+'-paleta'}>Paleta de color<select id={id+'-paleta'} value={preferencia.paleta} onChange={e=>elegir({paleta:e.target.value as PaletaGestion})}>{Object.entries(PALETAS_GESTION).map(([valor,nombre])=><option key={valor} value={valor}>{nombre}</option>)}</select></label>
        <div className="gm-paleta-preview" aria-hidden="true"><span/><span/><span/></div>
        <small>{preferencia.modo==='claro'?'Claro':'Oscuro'} · {PALETAS_GESTION[preferencia.paleta]} · Sólo Gestión</small>
        {sinPersistencia && <small role="status">Tema aplicado. El navegador no permite guardar la preferencia.</small>}
      </div>
    </details>
  </div>
  return <section className="gm-workspace" data-gm-theme={preferencia.modo} data-gm-palette={preferencia.paleta} aria-label="Gestión de mantenimientos">{children(selector)}</section>
}
