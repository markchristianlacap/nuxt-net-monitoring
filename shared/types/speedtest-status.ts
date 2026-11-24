export interface SpeedtestAttempt {
  interfaceName: string
  completedAt: string
  status: 'success' | 'failed' | 'cancelled'
}

export interface SpeedtestProgress {
  phase: 'starting' | 'ping' | 'download' | 'upload' | 'complete' | 'error' | 'cancelled'
  progress: number
  downloadMbps: number | null
  uploadMbps: number | null
  latencyMs: number | null
  isp: string | null
  publicIp: string | null
  resultUrl: string | null
  errorMessage: string | null
}

export interface SpeedtestStatus {
  enabled: boolean
  running: boolean
  source: 'manual' | 'scheduled' | null
  interfaces: string[]
  currentInterface: string | null
  currentIndex: number | null
  currentTest: SpeedtestProgress | null
  frequencySeconds: number | null
  nextRunAt: string | null
  lastAttempt: SpeedtestAttempt | null
}
