import { db } from '../../db'
import { adminUsers } from '../../db/schema/admin-users'

interface SetupBody {
  username?: string
  password?: string
}

const setupAttempts = new Map<string, { count: number, resetAt: number }>()
const MAX_SETUP_ATTEMPTS = 5
const SETUP_WINDOW_MS = 15 * 60 * 1000

export default defineEventHandler(async (event) => {
  if (!getHeader(event, 'content-type')?.includes('application/json')) {
    throw createError({ statusCode: 415, statusMessage: 'Setup requests must use JSON' })
  }
  if (await hasAdminAccount()) {
    throw createError({ statusCode: 409, statusMessage: 'Admin setup has already been completed' })
  }

  const clientIp = getRequestIP(event) ?? 'unknown'
  const attempts = setupAttempts.get(clientIp)
  if (attempts && attempts.resetAt > Date.now() && attempts.count >= MAX_SETUP_ATTEMPTS) {
    throw createError({ statusCode: 429, statusMessage: 'Too many setup attempts. Try again later.' })
  }
  if (!attempts || attempts.resetAt <= Date.now()) {
    setupAttempts.set(clientIp, { count: 1, resetAt: Date.now() + SETUP_WINDOW_MS })
  }
  else {
    attempts.count++
  }
  if (setupAttempts.size > 1000) {
    for (const [ip, entry] of setupAttempts) {
      if (entry.resetAt <= Date.now())
        setupAttempts.delete(ip)
    }
  }

  const body = await readBody<SetupBody>(event)
  const username = typeof body?.username === 'string'
    ? body.username.trim()
    : ''
  const password = body?.password
  if (!username || !/^[\w.-]{3,64}$/.test(username)) {
    throw createError({ statusCode: 400, statusMessage: 'Username must be 3–64 letters, numbers, dots, underscores, or hyphens' })
  }
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) {
    throw createError({ statusCode: 400, statusMessage: 'Password must be between 12 and 128 characters' })
  }

  const passwordHash = await hashPassword(password)
  const [createdAdmin] = await db.insert(adminUsers)
    .values({ id: 1, username, passwordHash })
    .onConflictDoNothing()
    .returning({ id: adminUsers.id })

  if (!createdAdmin) {
    throw createError({ statusCode: 409, statusMessage: 'Admin setup has already been completed' })
  }

  await createAdminSession(event, createdAdmin.id)
  return { success: true }
})
