import { getAuthenticatedAdmin } from '../../utils/auth'
import { getSoftwareUpdateStatus } from '../../utils/software-updates'

export default defineEventHandler(async (event) => {
  if (!await getAuthenticatedAdmin(event)) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required',
    })
  }

  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  const query = getQuery(event)

  return getSoftwareUpdateStatus(query.refresh === 'true')
})
