import { db } from '../../db'
import { adminUsers } from '../../db/schema/admin-users'
import { getAuthenticatedAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const [admin] = await db.select({ id: adminUsers.id }).from(adminUsers).limit(1)
  const currentAdmin = await getAuthenticatedAdmin(event)
  const { ADMIN_SETUP_TOKEN } = useRuntimeConfig()

  return {
    setupRequired: !admin,
    setupEnabled: !!ADMIN_SETUP_TOKEN,
    authenticated: !!currentAdmin,
    username: currentAdmin?.username,
  }
})
