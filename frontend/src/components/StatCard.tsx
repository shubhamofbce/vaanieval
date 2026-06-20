import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { IconProp } from '@fortawesome/fontawesome-svg-core'

type StatCardProps = {
  icon: IconProp
  label: string
  value: string
  tone?: 'default' | 'good' | 'warn'
}

export function StatCard({ icon, label, value, tone = 'default' }: StatCardProps) {
  return (
    <article className={`stat-card stat-${tone}`}>
      <span className="stat-icon" aria-hidden="true">
        <FontAwesomeIcon icon={icon} />
      </span>
      <small>{label}</small>
      <p>{value}</p>
    </article>
  )
}
