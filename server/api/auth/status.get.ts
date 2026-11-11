import { db } from '../../db'
import { adminUsers } from '../../db/schema/admin-users'

export default defineEventHandler(async (event) => {
  const [admin] = await db.select({ id: adminUsers.id }).from(adminUsers).limit(1)
  const currentAdmin = await getAuthenticatedAdmin(event)

  return {
    setupRequired: !admin,
    authenticated: !!currentAdmin,
    username: currentAdmin?.username,
  }
})
