import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import type { ReactNode } from 'react'

type EmptyStateProps = {
  icon: IconProp
  title: string
  message: string
  action?: ReactNode
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="empty-state panel">
      <span className="empty-state-icon" aria-hidden="true">
        <FontAwesomeIcon icon={icon} />
      </span>
      <h3>{title}</h3>
      <p className="muted">{message}</p>
      {action ? <div>{action}</div> : null}
    </div>
  )
}
