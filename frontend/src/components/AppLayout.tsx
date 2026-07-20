import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect, useState } from 'react'
import { logout } from '../api/endpoints'
import logo from '../assets/vaanievallogo.jpg'

export function AppLayout() {
  const navigate = useNavigate()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('vaanieval-sidebar-collapsed') === 'true')

  useEffect(() => {
    localStorage.setItem('vaanieval-sidebar-collapsed', String(sidebarCollapsed))
  }, [sidebarCollapsed])

  const navItems = [
    { to: '/dashboard', icon: 'house', label: 'Dashboard' },
    { to: '/conversations', icon: 'comments', label: 'Conversations' },
    { to: '/settings/agents', icon: 'users', label: 'Agents' },
    { to: '/imports/new', icon: 'file-import', label: 'Imports' },
    { to: '/settings/provider', icon: 'plug', label: 'Providers' },
    { to: '/rubrics', icon: 'sliders', label: 'Rubrics' },
    { to: '/settings/reporting', icon: 'bell', label: 'Reporting' },
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
    <div className={sidebarCollapsed ? 'app-shell sidebar-collapsed' : 'app-shell'}>
      <aside className="app-sidebar">
        <Link to="/dashboard" className="sidebar-brand">
          <img src={logo} alt="VaaniEval" />
          <span>VaaniEval</span>
        </Link>

        <button
          className="sidebar-collapse-toggle"
          type="button"
          onClick={() => setSidebarCollapsed((current) => !current)}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span aria-hidden="true">{sidebarCollapsed ? '»' : '«'}</span>
        </button>

        <nav className="sidebar-nav" aria-label="Primary">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <FontAwesomeIcon icon={item.icon as never} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <button className="sidebar-logout" onClick={handleLogout} type="button" title={sidebarCollapsed ? 'Logout' : undefined}>
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
