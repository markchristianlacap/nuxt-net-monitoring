import { eq } from 'drizzle-orm'
import { db } from '../../db'
import { adminUsers } from '../../db/schema/admin-users'

interface LoginBody {
  username?: string
  password?: string
}

const failedLogins = new Map<string, { count: number, resetAt: number }>()
const MAX_FAILED_LOGINS = 10
const FAILURE_WINDOW_MS = 15 * 60 * 1000

export default defineEventHandler(async (event) => {
  const clientIp = getRequestIP(event) ?? 'unknown'
  const attempts = failedLogins.get(clientIp)
  if (attempts && attempts.resetAt > Date.now() && attempts.count >= MAX_FAILED_LOGINS) {
    throw createError({ statusCode: 429, statusMessage: 'Too many sign-in attempts. Try again later.' })
  }

  const body = await readBody<LoginBody>(event)
  const username = body?.username?.trim()
  const password = body?.password
  if (!username || typeof password !== 'string' || password.length > 128) {
    throw createError({ statusCode: 400, statusMessage: 'Username and password are required' })
  }

  const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.username, username)).limit(1)
  if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
    const current = failedLogins.get(clientIp)
    if (!current || current.resetAt <= Date.now()) {
      failedLogins.set(clientIp, { count: 1, resetAt: Date.now() + FAILURE_WINDOW_MS })
    }
    else {
      current.count += 1
    }
    throw createError({ statusCode: 401, statusMessage: 'Invalid username or password' })
  }

  failedLogins.delete(clientIp)
  await createAdminSession(event, admin.id)
  return { success: true, username: admin.username }
})
