import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { IconProp } from '@fortawesome/fontawesome-svg-core'

type StatusPillProps = {
  icon: IconProp
  label: string
  tone?: 'success' | 'neutral' | 'warning' | 'danger'
}

export function StatusPill({ icon, label, tone = 'neutral' }: StatusPillProps) {
  return (
    <span className={`status-pill status-${tone}`}>
      <FontAwesomeIcon icon={icon} />
      <span>{label}</span>
    </span>
  )
}
