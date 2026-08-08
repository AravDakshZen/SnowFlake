'use client'

import React from 'react'

type DiffLine = {
  type: 'header' | 'hunk' | 'context' | 'add' | 'remove'
  text: string
}

function parseUnifiedDiff(patch: string): DiffLine[] {
  if (!patch) return []
  return patch.split('\n').map((raw) => {
    const text = raw
    if (/^diff --git/.test(raw) || /^index /.test(raw) || /^--- /.test(raw) || /^\+\+\+ /.test(raw)) {
      return { type: 'header', text }
    }
    if (/^@@ /.test(raw)) {
      return { type: 'hunk', text }
    }
    if (/^\+/.test(raw) && !/^\+\+\+ /.test(raw)) {
      return { type: 'add', text }
    }
    if (/^-/.test(raw) && !/^--- /.test(raw)) {
      return { type: 'remove', text }
    }
    return { type: 'context', text }
  })
}

export function DiffView({ patch }: { patch: string }) {
  const lines = parseUnifiedDiff(patch)

  if (lines.length === 0) {
    return (
      <div className="text-xs text-black/40 font-mono">No patch content.</div>
    )
  }

  return (
    <div className="rounded-lg border border-black/5 font-mono text-[11px] leading-relaxed overflow-auto">
      <table className="w-full border-collapse">
        <tbody>
          {lines.map((line, i) => {
            const bg =
              line.type === 'add'
                ? 'bg-green-50 text-green-800'
                : line.type === 'remove'
                  ? 'bg-red-50 text-red-700'
                  : line.type === 'hunk'
                    ? 'bg-blue-50 text-blue-700'
                    : line.type === 'header'
                      ? 'bg-black/[0.05] text-black/60'
                      : 'text-black/70'
            const sign =
              line.type === 'add'
                ? '+'
                : line.type === 'remove'
                  ? '-'
                  : line.type === 'hunk'
                    ? '@'
                    : ' '
            return (
              <tr key={i} className={bg}>
                <td className="select-none px-2 text-right text-black/30 w-8 border-r border-black/5">
                  {line.type === 'header' || line.type === 'hunk' ? '' : sign}
                </td>
                <td className="px-3 py-px whitespace-pre-wrap break-words">
                  {line.text}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
