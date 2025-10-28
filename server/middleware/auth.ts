import type { H3Event } from 'h3'
import { Buffer } from 'node:buffer'
import process from 'node:process' // 48 hours

const AUTH_COOKIE = 'last_auth_time'
const AUTH_INTERVAL = 1000 * 60 * 60 * 48

export default defineEventHandler((event: H3Event) => {
  // if (import.meta.dev)
  //   return

  const lastAuth = getCookie(event, AUTH_COOKIE)

  if (lastAuth && Date.now() - Number(lastAuth) < AUTH_INTERVAL) {
    return
  }

  const auth = getHeader(event, 'authorization')
  const user = process.env.BASIC_AUTH_USER
  const pass = process.env.BASIC_AUTH_PASS

  // ask for login if no auth header
  if (!auth || !auth.startsWith('Basic ')) {
    setHeader(event, 'WWW-Authenticate', 'Basic realm="Protected"')
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  // decode and check credentials
  const [username, password] = Buffer.from(auth.split(' ')[1], 'base64')
    .toString()
    .split(':')

  if (username !== user || password !== pass) {
    setHeader(event, 'WWW-Authenticate', 'Basic realm="Protected"')
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  // ✅ set cookie timestamp after successful auth
  setCookie(event, AUTH_COOKIE, String(Date.now()), {
    httpOnly: true,
    maxAge: AUTH_INTERVAL / 1000, // seconds
    sameSite: 'strict',
    path: '/',
  })
})
