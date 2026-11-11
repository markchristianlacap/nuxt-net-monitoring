export interface ScheduledSpeedtestAttempt {
  interfaceName: string
  completedAt: string
  status: 'success' | 'failed'
}

export interface SpeedtestScheduleStatus {
  enabled: boolean
  running: boolean
  interfaces: string[]
  currentInterface: string | null
  currentIndex: number | null
  frequencySeconds: number | null
  nextRunAt: string | null
  lastAttempt: ScheduledSpeedtestAttempt | null
}
