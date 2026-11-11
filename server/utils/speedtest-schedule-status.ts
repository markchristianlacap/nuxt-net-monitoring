let status: SpeedtestScheduleStatus = {
  enabled: false,
  running: false,
  interfaces: [],
  currentInterface: null,
  currentIndex: null,
  currentTest: null,
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
