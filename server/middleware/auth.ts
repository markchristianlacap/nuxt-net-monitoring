import type { H3Event } from 'h3'
import { Buffer } from 'node:buffer'
import bcrypt from 'bcrypt'
import { db } from '~~/server/db'

const AUTH_COOKIE = 'last_auth_time'
const AUTH_INTERVAL = 1000 * 60 * 60 * 48

export default defineEventHandler(async (event: H3Event) => {
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

  // Save or update user in database
  try {
    const now = new Date().toISOString()
    const existingUser = await db
      .selectFrom('users')
      .select(['id', 'username'])
      .where('username', '=', username)
      .executeTakeFirst()

    if (existingUser) {
      // Update last login time for existing user
      await db
        .updateTable('users')
        .set({
          lastLoginAt: now,
          updatedAt: now,
        })
        .where('id', '=', existingUser.id)
        .execute()
    }
    else {
      // Create new user with hashed password for record-keeping
      // Note: Authentication continues to use environment variables
      const hashedPassword = await bcrypt.hash(password, 10)
      await db
        .insertInto('users')
        .values({
          username,
          password: hashedPassword,
          email: null,
          name: username,
          lastLoginAt: now,
        })
        .execute()
    }
  }
  catch (error) {
    // Log error but don't fail authentication
    console.error('Failed to save user to database:', error)
  }

  setCookie(event, AUTH_COOKIE, String(Date.now()), {
    httpOnly: true,
    maxAge: AUTH_INTERVAL / 1000,
    sameSite: 'strict',
    path: '/',
  })
})
