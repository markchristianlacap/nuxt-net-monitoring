export function runEverySecond(task: () => Promise<void>) {
  async function run() {
    try {
      await task()
    } catch (err) {
      console.error('Error in runEverySecond task:', err)
    } finally {
      scheduleNext()
    }
  }

  function scheduleNext() {
    const now = new Date()
    const next = new Date(now)
    next.setMilliseconds(0)
    next.setSeconds(now.getSeconds() + 1)
    const delay = next.getTime() - now.getTime()
    setTimeout(run, delay)
  }

  // Align to next exact second
  const now = new Date()
  const next = new Date(now)
  next.setMilliseconds(0)
  next.setSeconds(now.getSeconds() + 1)
  const delay = next.getTime() - now.getTime()
  setTimeout(run, delay)
}
