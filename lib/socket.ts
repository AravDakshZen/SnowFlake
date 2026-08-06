import { Server as HTTPServer } from 'http'
import { Server, Socket } from 'socket.io'
import { emitProjectEvent } from '@/lib/events'

let io: Server | null = null

export function initializeSocket(httpServer: HTTPServer): Server {
  if (io) return io

  io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  })

  io.on('connection', (socket: Socket) => {
    console.log('[v0] Socket connected:', socket.id)

    // Join project room
    socket.on('join', (projectId: string) => {
      socket.join(`project:${projectId}`)
      console.log('[v0] Socket joined project room:', projectId)
    })

    socket.on('disconnect', () => {
      console.log('[v0] Socket disconnected:', socket.id)
    })
  })

  return io
}

export function getSocket(): Server {
  if (!io) {
    throw new Error('Socket.io not initialized')
  }
  return io
}

export function emitToProject(projectId: string, event: string, data: Record<string, unknown> = {}) {
  emitProjectEvent(projectId, event, data)
  if (io) {
    io.to(`project:${projectId}`).emit(event, data)
  }
}

export function emitToSocket(socketId: string, event: string, data: any) {
  if (io) {
    io.to(socketId).emit(event, data)
  }
}
