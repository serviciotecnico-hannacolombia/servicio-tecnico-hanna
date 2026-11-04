import type {ComponentProps, CSSProperties, ReactNode} from 'react'
import {Button as SharedButton} from '../../components/ui/Button'

// Module variants: shared intranet components and their consumers remain untouched.
export function Header({title, subtitle, actions}: {title: string; subtitle?: ReactNode; actions?: ReactNode}) {
  return <header className="gm-page-header"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{actions && <div className="gm-page-actions">{actions}</div>}</header>
}

export function Card({title, children, style, bodyStyle}: {title?: string; children: ReactNode; style?: CSSProperties; bodyStyle?: CSSProperties}) {
  return <div className="gm-card" style={style}>{title && <div className="gm-card-title">{title}</div>}<div className="gm-card-body" style={bodyStyle}>{children}</div></div>
}

export function Button({style, ...props}: ComponentProps<typeof SharedButton>) {
  return <SharedButton {...props} style={{...(props.variant === 'link' ? {color:'var(--gm-link)'} : {}), ...style}}/>
}
