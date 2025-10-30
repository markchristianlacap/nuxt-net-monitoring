import { exec } from 'node:child_process'

export function runEverySecond(task: () => Promise<void>) {
  async function run() {
    try {
      await task()
    }
    catch (err) {
      console.error('Error in runEverySecond task:', err)
    }
    finally {
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

  const now = new Date()
  const next = new Date(now)
  next.setMilliseconds(0)
  next.setSeconds(now.getSeconds() + 1)
  const delay = next.getTime() - now.getTime()
  setTimeout(run, delay)
}
export function runEveryHour(task: () => Promise<void>) {
  async function run() {
    try {
      await task()
    }
    catch (err) {
      console.error('Error in runEveryHour task:', err)
    }
    finally {
      scheduleNext()
    }
  }

  function scheduleNext() {
    const now = new Date()
    const next = new Date(now)
    next.setHours(now.getHours() + 1, 0, 0, 0)
    const delay = next.getTime() - now.getTime()
    setTimeout(run, delay)
  }

  const now = new Date()
  const next = new Date(now)
  next.setHours(now.getHours() + 1, 0, 0, 0)
  const delay = next.getTime() - now.getTime()
  setTimeout(run, delay)
}

export function execAsync(command: string): Promise<{ stdout: string, stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error)
        return reject(error)
      resolve({ stdout, stderr })
    })
  })
}
