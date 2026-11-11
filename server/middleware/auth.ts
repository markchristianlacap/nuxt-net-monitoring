import { sendRedirect } from 'h3'
import { getAppSettings } from '../utils/app-settings'
import { getAuthenticatedAdmin } from '../utils/auth'

const PUBLIC_PATHS = new Set([
  '/login',
  '/setup',
  '/api/auth/status',
  '/api/auth/login',
  '/api/auth/setup',
  '/api/auth/logout',
  '/api/features',
])

const FEATURE_PATHS = [
  { prefix: '/api/pings', feature: 'ping' },
  { prefix: '/api/bandwidths', feature: 'bandwidth' },
  { prefix: '/api/interfaces', feature: 'bandwidth' },
  { prefix: '/api/speedtest', feature: 'speedtest' },
  { prefix: '/api/speedtest-results', feature: 'speedtest' },
  { prefix: '/pings', feature: 'ping' },
  { prefix: '/bandwidths', feature: 'bandwidth' },
  { prefix: '/speedtest', feature: 'speedtest' },
  { prefix: '/speedtest-results', feature: 'speedtest' },
] as const

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

  if (!(await getAuthenticatedAdmin(event))) {
    if (path.startsWith('/api/')) {
      throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
    }
    return sendRedirect(event, '/login')
  }

  const featurePath = FEATURE_PATHS.find(item => path.startsWith(item.prefix))
  if (featurePath) {
    const settings = await getAppSettings()
    if (!settings.features[featurePath.feature]) {
      if (path.startsWith('/api/')) {
        throw createError({ statusCode: 404, statusMessage: 'This monitoring feature is disabled' })
      }
      return sendRedirect(event, '/admin')
    }
  }
})
