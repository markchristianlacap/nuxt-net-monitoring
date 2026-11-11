import type { SpeedtestScheduleStatus } from '~~/shared/types/speedtest-schedule'

let status: SpeedtestScheduleStatus = {
  enabled: false,
  running: false,
  interfaces: [],
  currentInterface: null,
  currentIndex: null,
  frequencySeconds: null,
  nextRunAt: null,
  lastAttempt: null,
}

export function getSpeedtestScheduleStatus(): SpeedtestScheduleStatus {
  return structuredClone(status)
}

export function updateSpeedtestScheduleStatus(update: Partial<SpeedtestScheduleStatus>) {
  status = {
    ...status,
    ...update,
  }
}
