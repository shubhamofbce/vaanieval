import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { logout } from '../api/endpoints'

export function AppLayout() {
  const navigate = useNavigate()

  const navItems = [
    { to: '/onboarding', icon: 'house', label: 'Dashboard' },
    { to: '/conversations', icon: 'comments', label: 'Conversations' },
    { to: '/settings/agents', icon: 'users', label: 'Agents' },
    { to: '/imports/new', icon: 'file-import', label: 'Imports' },
    { to: '/settings/provider', icon: 'plug', label: 'Providers' },
  ]

  async function handleLogout() {
    try {
      await logout()
    } catch {
      // no-op: always clear local navigation state
    }
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Link to="/onboarding" className="sidebar-brand">
          VaaniEval
        </Link>

        <nav className="sidebar-nav" aria-label="Primary">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}
            >
              <FontAwesomeIcon icon={item.icon as never} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <button className="sidebar-logout" onClick={handleLogout} type="button">
          <FontAwesomeIcon icon="link" />
          <span>Logout</span>
        </button>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
