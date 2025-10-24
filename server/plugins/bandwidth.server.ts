import { db } from '../db'

export default defineNitroPlugin(async () => {
  setInterval(async () => {
    const { inMbps, outMbps } = await getBandwidth()
    if (inMbps < 0 || outMbps < 0) return
    await db.insertInto('bandwidths').values({
      inMbps,
      outMbps,
      host: 'home',
      timestamp: new Date().toISOString()
    }).execute()
  }, 1000)
})
