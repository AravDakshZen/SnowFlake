import { Server as HTTPServer } from 'http'
import { Server, Socket } from 'socket.io'
import { emitProjectEvent } from '@/lib/events'

let io: Server | null = null

function readSessionUser(socket: Socket): string | null {
  const cookieHeader = socket.handshake.headers.cookie ?? socket.handshake.auth?.cookie ?? ''
  const match = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/)
  if (!match?.[1]) return null
  try {
    const sessionData = JSON.parse(Buffer.from(match[1], 'base64url').toString('utf8'))
    return sessionData?.user?.id ?? null
  } catch {
    return null
  }
}

export function initializeSocket(httpServer: HTTPServer): Server {
  if (io) return io

  io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  })

  io.use((socket, next) => {
    const userId = readSessionUser(socket)
    if (!userId) {
      return next(new Error('Unauthorized: valid session required'))
    }
    socket.data.userId = userId
    next()
  })

  io.on('connection', (socket: Socket) => {
    console.log('[v0] Socket connected:', socket.id)

    // Join project room only after verifying the user owns the project
    socket.on('join', async (projectId: string) => {
      try {
        const { getSql } = await import('@/lib/db')
        const sql = getSql()
        const owned = await sql`
          SELECT id FROM public.projects
          WHERE id = ${projectId} AND user_id = ${socket.data.userId}
          LIMIT 1
        `
        if (owned.length > 0) {
          socket.join(`project:${projectId}`)
          console.log('[v0] Socket joined project room:', projectId)
        } else {
          socket.emit('error', { message: 'Not authorized to join this project room' })
        }
      } catch (error) {
        console.error('[v0] Project ownership check failed:', error)
        socket.emit('error', { message: 'Failed to verify project ownership' })
      }
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
