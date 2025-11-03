import { db } from '~~/server/db'

export default defineEventHandler(async () => {
  // Get all users without their passwords
  const users = await db
    .selectFrom('users')
    .select(['id', 'username', 'email', 'name', 'lastLoginAt', 'createdAt', 'updatedAt'])
    .orderBy('createdAt', 'desc')
    .execute()

  return users
})
