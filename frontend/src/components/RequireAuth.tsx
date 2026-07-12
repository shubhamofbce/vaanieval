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
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
