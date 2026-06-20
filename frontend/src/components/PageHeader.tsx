import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import type { ReactNode } from 'react'

type PageHeaderProps = {
  icon: IconProp
  title: string
  subtitle?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ icon, title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <header className={`panel page-header ${className ?? ''}`.trim()}>
      <div className="page-header-title-group">
        <span className="page-header-icon" aria-hidden="true">
          <FontAwesomeIcon icon={icon} />
        </span>
        <div>
          <h1>{title}</h1>
          {subtitle ? <p className="muted">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </header>
  )
}
