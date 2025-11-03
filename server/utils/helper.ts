function scheduleTask(
  intervalCalculator: () => number,
  task: () => Promise<void>,
) {
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
    const delay = intervalCalculator()
    setTimeout(run, delay)
  }

  scheduleNext()
}

export function runEverySecond(task: () => Promise<void>) {
  scheduleTask(() => {
    const now = new Date()
    const next = new Date(now)
    next.setMilliseconds(0)
    next.setSeconds(now.getSeconds() + 1)
    return next.getTime() - now.getTime()
  }, task)
}

export function runEveryHour(task: () => Promise<void>) {
  scheduleTask(() => {
    const now = new Date()
    const next = new Date(now)
    next.setHours(now.getHours() + 1, 0, 0, 0)
    return next.getTime() - now.getTime()
  }, task)
}
export function runEveryMinute(task: () => Promise<void>) {
  scheduleTask(() => {
    const now = new Date()
    const next = new Date(now)
    next.setMinutes(now.getMinutes() + 1, 0, 0)
    return next.getTime() - now.getTime()
  }, task)
}
