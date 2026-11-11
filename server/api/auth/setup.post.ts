import { readBody } from 'h3'
import { db } from '../../db'
import { adminUsers } from '../../db/schema/admin-users'
import { createAdminSession, hashPassword, verifySecret } from '../../utils/auth'

interface SetupBody {
  token?: string
  username?: string
  password?: string
}

export default defineEventHandler(async (event) => {
  const { ADMIN_SETUP_TOKEN } = useRuntimeConfig()
  if (!ADMIN_SETUP_TOKEN) {
    throw createError({ statusCode: 503, statusMessage: 'Admin setup is not enabled. Configure NUXT_ADMIN_SETUP_TOKEN first.' })
  }

  const body = await readBody<SetupBody>(event)
  const username = body?.username?.trim()
  const password = body?.password
  if (!verifySecret(body?.token ?? '', ADMIN_SETUP_TOKEN)) {
    throw createError({ statusCode: 403, statusMessage: 'Invalid setup token' })
  }
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
