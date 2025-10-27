import { db } from '../db'

export default defineNitroPlugin(() => {
  runEverySecond(async () => {
    const bandwidth = await getBandwidth()
    if (!bandwidth)
      return
    await db.insertInto('bandwidths').values(bandwidth).execute()
  })
})
