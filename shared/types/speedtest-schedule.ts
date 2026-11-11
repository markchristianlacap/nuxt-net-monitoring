export interface ScheduledSpeedtestAttempt {
  interfaceName: string
  completedAt: string
  status: 'success' | 'failed'
}

export interface ScheduledSpeedtestProgress {
  phase: 'starting' | 'ping' | 'download' | 'upload' | 'complete' | 'error'
  progress: number
  downloadMbps: number | null
  uploadMbps: number | null
  latencyMs: number | null
  isp: string | null
  publicIp: string | null
  resultUrl: string | null
}

export interface SpeedtestScheduleStatus {
  enabled: boolean
  running: boolean
  interfaces: string[]
  currentInterface: string | null
  currentIndex: number | null
  currentTest: ScheduledSpeedtestProgress | null
  frequencySeconds: number | null
  nextRunAt: string | null
  lastAttempt: ScheduledSpeedtestAttempt | null
}
