import { sendRedirect } from 'h3'
import { getAuthenticatedAdmin } from '../utils/auth'

const PUBLIC_PATHS = new Set([
  '/login',
  '/setup',
  '/api/auth/status',
  '/api/auth/login',
  '/api/auth/setup',
  '/api/auth/logout',
])

export default defineEventHandler(async (event) => {
  const path = event.path.split('?')[0] ?? '/'
  if (
    PUBLIC_PATHS.has(path)
    || path.startsWith('/_nuxt/')
    || path.startsWith('/assets/')
    || path === '/favicon.ico'
  ) {
    return
  }

  if (await getAuthenticatedAdmin(event))
    return

  if (path.startsWith('/api/')) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  return sendRedirect(event, '/login')
})
