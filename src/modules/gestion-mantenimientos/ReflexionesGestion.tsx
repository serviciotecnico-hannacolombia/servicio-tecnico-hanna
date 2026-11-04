import { useEffect, useState } from 'react'
import { BookOpen, Compass, DraftingCompass, Feather, Gem, GraduationCap, Lightbulb, Microscope, PencilRuler, Sprout } from 'lucide-react'
import './reflexionesGestion.css'

const reflexiones = [
  { texto: 'Si quieres tomar ventaja en la vida, comienza por trabajar tu educación.', dibujo: Compass },
  { texto: 'Las buenas preguntas superan a las respuestas fáciles.', dibujo: Lightbulb },
  { texto: 'Estudia no para saber una cosa más, sino para saberla mejor.', autor: 'Séneca', fuente: 'https://philpapers.org/archive/PELLDH.pdf', dibujo: Microscope },
  { texto: 'Lo que la escultura es a un bloque de mármol, la educación es para el alma.', autor: 'Joseph Addison', fuente: 'https://metaphors.iath.virginia.edu/metaphors/10705', dibujo: Gem },
  { texto: 'El estudio sin deseo estropea la memoria y no retiene nada de lo que toma.', autor: 'Leonardo da Vinci', fuente: 'https://www.gutenberg.org/files/67931/67931-h/67931-h.htm', dibujo: Feather },
  { texto: 'La vida debe ser una incesante educación.', dibujo: BookOpen },
  { texto: 'La educación no crea al hombre, le ayuda a crearse a sí mismo.', dibujo: PencilRuler },
  { texto: 'La sabiduría no viene de la edad, sino de la educación y del aprendizaje.', dibujo: Sprout },
  { texto: 'La actividad más alta que un ser humano puede alcanzar es aprender para entender, porque el entendimiento es ser libre.', dibujo: DraftingCompass },
  { texto: 'El que cesa de ser estudiante nunca ha sido estudiante.', dibujo: GraduationCap },
]

export function ReflexionesGestion() {
  const [indice, seleccionar] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => seleccionar(actual => (actual + 1) % reflexiones.length), 20000)
    return () => window.clearInterval(timer)
  }, [])

  return <aside className="gm-reflexiones" aria-label="Reflexiones sobre el aprendizaje">
    <div className="gm-reflexiones-escena">
      {reflexiones.map(({ texto, autor, fuente, dibujo: Dibujo }, posicion) =>
        <figure key={texto} aria-hidden={posicion !== indice} data-visible={posicion === indice}>
          <svg aria-hidden="true" viewBox="0 0 280 180" fill="none" className="gm-reflexion-lamina">
            <g stroke="currentColor">
              <circle cx="143" cy="86" r="61" fill="currentColor" fillOpacity=".055" strokeOpacity=".18"/>
              <path d="M53 92a91 91 0 0 1 148-78M219 43a85 85 0 0 1-10 103" strokeDasharray="2 6" opacity=".52"/>
              <path d="M28 131 213 32M48 153h181m-17-5v10m-145-10v10" opacity=".18"/>
              <g strokeLinejoin="round">
                <path d="m44 137 47-25 57 10 48-28 43 8-81 50-59-9-40 15z" fill="currentColor" fillOpacity=".14" strokeOpacity=".55"/>
                <path d="m43 131 48-25 57 10 48-28 43 8-81 50-59-9-40 15z" fill="var(--surface)" strokeOpacity=".7"/>
                <path d="m99 137 49-21m10 30 81-50" strokeOpacity=".45"/>
              </g>
              <path d="M45 58h8m-4-4v8m179 21h10m-5-5v10" opacity=".6"/>
            </g>
            <Dibujo x={98} y={31} width={91} height={91} strokeWidth={1.35} fill="var(--surface)" />
          </svg>
          <div><blockquote>{texto}</blockquote>
            {autor && <figcaption><a href={fuente} target="_blank" rel="noopener noreferrer" tabIndex={posicion === indice ? 0 : -1}>{autor}</a></figcaption>}
          </div>
        </figure>
      )}
    </div>
  </aside>
}
