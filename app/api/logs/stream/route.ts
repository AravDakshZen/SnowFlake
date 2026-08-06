import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { subscribeProjectEvents } from '@/lib/events'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await getSession()
  const projectId = request.nextUrl.searchParams.get('projectId')

  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

  const encoder = new TextEncoder()
  let unsubscribe = () => {}
  let heartbeat: ReturnType<typeof setInterval> | undefined
  const readable = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (payload: Record<string, unknown>) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
      send({ type: 'connected', timestamp: new Date().toISOString() })
      unsubscribe = subscribeProjectEvents(projectId, (event) => send(event))
      heartbeat = setInterval(() => send({ type: 'heartbeat', timestamp: new Date().toISOString() }), 25000)
      request.signal.addEventListener('abort', () => {
        unsubscribe()
        if (heartbeat) clearInterval(heartbeat)
        try { controller.close() } catch {}
      })
    },
    cancel() {
      unsubscribe()
      if (heartbeat) clearInterval(heartbeat)
    },
  })

  return new NextResponse(readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
