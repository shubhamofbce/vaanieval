import { useQuery } from '@tanstack/react-query'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getMe } from '../api/endpoints'
import { PageSkeleton } from './Skeleton'

export function RequireAuth() {
  const location = useLocation()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    retry: false,
  })

  if (isLoading) {
    return <PageSkeleton />
  }

  if (isError || !data) {
    const from = `${location.pathname}${location.search}${location.hash}`
    try { window.localStorage.setItem('vaanieval:auth:return-to', from) } catch { /* optional browser convenience */ }
    return <Navigate to="/login" replace state={{ from }} />
  }

  return <Outlet />
}
