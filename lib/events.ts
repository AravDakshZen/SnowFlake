export type TracewiseEvent = {
  type: string
  timestamp: string
  projectId: string
  data: Record<string, unknown>
}

type Listener = (event: TracewiseEvent) => void

const listeners = new Map<string, Set<Listener>>()

export function emitProjectEvent(projectId: string, type: string, data: Record<string, unknown> = {}) {
  const event: TracewiseEvent = { type, timestamp: new Date().toISOString(), projectId, data }
  listeners.get(projectId)?.forEach((listener) => listener(event))
  return event
}

export function subscribeProjectEvents(projectId: string, listener: Listener) {
  const projectListeners = listeners.get(projectId) ?? new Set<Listener>()
  projectListeners.add(listener)
  listeners.set(projectId, projectListeners)
  return () => {
    projectListeners.delete(listener)
    if (projectListeners.size === 0) listeners.delete(projectId)
  }
}
