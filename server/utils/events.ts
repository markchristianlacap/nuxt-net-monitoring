import { EventEmitter } from 'node:events'

// custom event for 'ping:update' and 'bandwidth:update'
export const events = new EventEmitter()
