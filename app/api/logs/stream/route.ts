import { NextRequest, NextResponse } from 'next/server'

// SSE fallback for browsers without WebSocket support
export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json(
      { error: 'projectId required' },
      { status: 400 }
    )
  }

  // Create readable stream for SSE
  const readable = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue('data: {"type":"connected"}\n\n')

      // Keep connection alive with heartbeat
      const interval = setInterval(() => {
        controller.enqueue('data: {"type":"heartbeat"}\n\n')
      }, 30000)

      // Handle client close
      const originalCancel = (controller as any)._cancel
      if (originalCancel) {
        ;(controller as any)._cancel = function() {
          clearInterval(interval)
          return originalCancel.call(this)
        }
      }
    },
  })

  return new NextResponse(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
