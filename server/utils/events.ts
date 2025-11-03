import { EventEmitter } from 'node:events'

interface AppEvents {
  'ping:update': PingResult
  'bandwidth:update': BandwidthResult
}
class TypedEventEmitter<T extends Record<string, any>> {
  private emitter = new EventEmitter()

  on<K extends keyof T>(event: K, listener: (payload: T[K]) => void): this {
    this.emitter.on(event as string, listener)
    return this
  }

  off<K extends keyof T>(event: K, listener: (payload: T[K]) => void): this {
    this.emitter.off(event as string, listener)
    return this
  }

  once<K extends keyof T>(event: K, listener: (payload: T[K]) => void): this {
    this.emitter.once(event as string, listener)
    return this
  }

  emit<K extends keyof T>(event: K, payload: T[K]): boolean {
    return this.emitter.emit(event as string, payload)
  }
}

export const events = new TypedEventEmitter<AppEvents>()
