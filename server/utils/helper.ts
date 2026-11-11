export type StopScheduledTask = () => void

function scheduleTask(
  intervalCalculator: () => number,
  task: () => Promise<void>,
): StopScheduledTask {
  let stopped = false
  let timeout: ReturnType<typeof setTimeout> | undefined

  async function run() {
    try {
      await task()
    }
    catch (err) {
      console.error('Error in scheduled task:', err)
    }
    finally {
      scheduleNext()
    }
  }

  function scheduleNext() {
    if (stopped)
      return
    const delay = intervalCalculator()
    timeout = setTimeout(run, delay)
  }

  scheduleNext()
  return () => {
    stopped = true
    if (timeout)
      clearTimeout(timeout)
  }
}

export function runEverySecond(task: () => Promise<void>): StopScheduledTask {
  return scheduleTask(() => {
    const now = new Date()
    const next = new Date(now)
    next.setMilliseconds(0)
    next.setSeconds(now.getSeconds() + 1)
    return next.getTime() - now.getTime()
  }, task)
}

export function runEveryHour(task: () => Promise<void>): StopScheduledTask {
  return scheduleTask(() => {
    const now = new Date()
    const next = new Date(now)
    next.setHours(now.getHours() + 1, 0, 0, 0)
    return next.getTime() - now.getTime()
  }, task)
}
export function runEveryMinute(task: () => Promise<void>): StopScheduledTask {
  return scheduleTask(() => {
    const now = new Date()
    const next = new Date(now)
    next.setMinutes(now.getMinutes() + 1, 0, 0)
    return next.getTime() - now.getTime()
  }, task)
}

export function runEveryInterval(intervalSeconds: number, task: () => Promise<void>): StopScheduledTask {
  return scheduleTask(() => intervalSeconds * 1000, task)
}
