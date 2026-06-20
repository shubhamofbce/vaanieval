import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { logout } from '../api/endpoints'

export function AppLayout() {
  const navigate = useNavigate()

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
      <aside className="sidebar">
        <Link to="/onboarding" className="brand">
          VaaniEval
        </Link>
        <nav>
          <NavLink to="/onboarding">
            <FontAwesomeIcon icon="house" />
            <span>Overview</span>
          </NavLink>
          <NavLink to="/settings/provider">
            <FontAwesomeIcon icon="plug" />
            <span>Provider</span>
          </NavLink>
          <NavLink to="/settings/agents">
            <FontAwesomeIcon icon="users" />
            <span>Agents</span>
          </NavLink>
          <NavLink to="/imports/new">
            <FontAwesomeIcon icon="file-import" />
            <span>New Import</span>
          </NavLink>
          <NavLink to="/conversations">
            <FontAwesomeIcon icon="comments" />
            <span>Conversations</span>
          </NavLink>
        </nav>
        <button className="secondary" onClick={handleLogout} type="button">
          Logout
        </button>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
