import { destroyAdminSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await destroyAdminSession(event)
  return { success: true }
})
