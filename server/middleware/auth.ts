import type { H3Event } from 'h3'
import { Buffer } from 'node:buffer'

const AUTH_COOKIE = 'last_auth_time'
const AUTH_INTERVAL = 1000 * 60 * 60 * 48

export default defineEventHandler((event: H3Event) => {
  const lastAuth = getCookie(event, AUTH_COOKIE)

  if (lastAuth && Date.now() - Number(lastAuth) < AUTH_INTERVAL) {
    return
  }
  const config = useRuntimeConfig()
  const auth = getHeader(event, 'authorization')
  const user = config.USER
  const pass = config.PASS

  if (!auth || !auth.startsWith('Basic ')) {
    setHeader(event, 'WWW-Authenticate', 'Basic realm="Protected"')
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const [username, password] = Buffer.from(auth.split(' ')[1], 'base64')
    .toString()
    .split(':')

  if (username !== user || password !== pass) {
    setHeader(event, 'WWW-Authenticate', 'Basic realm="Protected"')
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  setCookie(event, AUTH_COOKIE, String(Date.now()), {
    httpOnly: true,
    maxAge: AUTH_INTERVAL / 1000,
    sameSite: 'strict',
    path: '/',
  })
})
