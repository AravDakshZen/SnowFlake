'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Separator } from '@/components/ui/separator'
import { FileCode, Download, ChevronDown, ChevronRight, Filter } from 'lucide-react'
import type { FileCleanResult, Issue, IssueReport } from '@/types/investigation'
import { SeverityBadge } from '@/components/ui/SeverityBadge'

interface IssueReportPanelProps {
  fileResults: FileCleanResult[]
  totalIssuesFixed: number
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'critical_errors': return 'bg-red-100 text-red-700 border-red-200'
    case 'security': return 'bg-orange-100 text-orange-700 border-orange-200'
    case 'logic_errors': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    case 'code_quality': return 'bg-green-100 text-green-700 border-green-200'
    case 'style_cleanup': return 'bg-gray-100 text-gray-700 border-gray-200'
    default: return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

function getCategoryLabel(category: string): string {
  switch (category) {
    case 'critical_errors': return 'Critical'
    case 'security': return 'Security'
    case 'logic_errors': return 'Logic'
    case 'code_quality': return 'Quality'
    case 'style_cleanup': return 'Style'
    default: return category
  }
}

function IssueTable({ issues }: { issues: Issue[] }) {
  const sortedIssues = [...issues].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }
    return (order[a.severity] ?? 5) - (order[b.severity] ?? 5)
  })

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-black/10">
            <th className="text-left py-2 px-3 font-medium text-black/60">#</th>
            <th className="text-left py-2 px-3 font-medium text-black/60">Severity</th>
            <th className="text-left py-2 px-3 font-medium text-black/60">Line</th>
            <th className="text-left py-2 px-3 font-medium text-black/60">Issue</th>
            <th className="text-left py-2 px-3 font-medium text-black/60">Fix</th>
          </tr>
        </thead>
        <tbody>
          {sortedIssues.map((issue, index) => (
            <tr key={index} className="border-b border-black/5 hover:bg-black/5">
              <td className="py-2 px-3 text-black/40">{index + 1}</td>
              <td className="py-2 px-3">
                <SeverityBadge severity={issue.severity} />
              </td>
              <td className="py-2 px-3 font-mono text-xs">{issue.line}</td>
              <td className="py-2 px-3 max-w-xs truncate">{issue.description}</td>
              <td className="py-2 px-3 max-w-xs truncate text-green-600">{issue.after.split('\n')[0]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MiniDiffViewer({ patchDiff }: { patchDiff: string }) {
  const lines = patchDiff.split('\n').slice(0, 30)
  const truncated = patchDiff.split('\n').length > 30

  return (
    <div className="bg-[#1a1a2e] rounded-lg p-3 overflow-x-auto">
      <pre className="text-xs font-mono whitespace-pre-wrap">
        {lines.map((line, i) => {
          let colorClass = 'text-white/60'
          if (line.startsWith('+') && !line.startsWith('+++')) colorClass = 'text-green-400'
          else if (line.startsWith('-') && !line.startsWith('---')) colorClass = 'text-red-400'
          else if (line.startsWith('@@')) colorClass = 'text-cyan-400'
          
          return (
            <div key={i} className={colorClass}>
              {line}
            </div>
          )
        })}
        {truncated && (
          <div className="text-white/30 mt-2">... ({patchDiff.split('\n').length - 30} more lines)</div>
        )}
      </pre>
    </div>
  )
}

function FileSection({ result }: { result: FileCleanResult }) {
  const categoryBreakdown = result.issueReport.byCategory
  const categoryPills = Object.entries(categoryBreakdown)
    .map(([cat, count]) => (
      <Badge key={cat} variant="outline" className={`text-[10px] ${getCategoryColor(cat)}`}>
        {getCategoryLabel(cat)} ×{count}
      </Badge>
    ))

  return (
    <AccordionItem value={result.filePath} className="border rounded-lg">
      <AccordionTrigger className="px-4 py-3 hover:no-underline">
        <div className="flex items-center gap-3 flex-1">
          <FileCode className="h-4 w-4 text-black/40" />
          <span className="font-mono text-sm flex-1 text-left">{result.filePath}</span>
          <Badge variant="outline" className="text-xs">
            {result.issuesFixed} issues fixed
          </Badge>
          <div className="flex gap-1">
            {categoryPills}
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        <div className="space-y-4">
          <IssueTable issues={result.issues} />
          
          {result.patchDiff && (
            <div>
              <h4 className="text-xs font-medium text-black/50 mb-2">DIFF PREVIEW</h4>
              <MiniDiffViewer patchDiff={result.patchDiff} />
            </div>
          )}
          
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="text-xs">
              <Download className="h-3 w-3 mr-1" />
              Download patch for this file
            </Button>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

export function IssueReportPanel({ fileResults, totalIssuesFixed }: IssueReportPanelProps) {
  const [activeFilters, setActiveFilters] = useState<string[]>([])

  const allCategories = useMemo(() => {
    const cats = new Set<string>()
    fileResults.forEach(r => {
      Object.keys(r.issueReport.byCategory).forEach(cat => cats.add(cat))
    })
    return Array.from(cats)
  }, [fileResults])

  const totalCategoryBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {}
    fileResults.forEach(r => {
      Object.entries(r.issueReport.byCategory).forEach(([cat, count]) => {
        breakdown[cat] = (breakdown[cat] || 0) + count
      })
    })
    return breakdown
  }, [fileResults])

  const filteredResults = useMemo(() => {
    if (activeFilters.length === 0) return fileResults
    return fileResults.map(r => ({
      ...r,
      issues: r.issues.filter(i => activeFilters.includes(i.category)),
      issuesFixed: r.issues.filter(i => activeFilters.includes(i.category)).length
    })).filter(r => r.issues.length > 0)
  }, [fileResults, activeFilters])

  const toggleFilter = (category: string) => {
    setActiveFilters(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Issue Report</CardTitle>
          <div className="flex items-center gap-2 text-sm text-black/50">
            <span>{fileResults.length} files changed</span>
            <span>·</span>
            <span>{totalIssuesFixed} total issues fixed</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-black/40" />
          <span className="text-xs text-black/50">Filter by category:</span>
          {allCategories.map(cat => (
            <Badge
              key={cat}
              variant="outline"
              className={`text-xs cursor-pointer transition-all ${
                activeFilters.includes(cat)
                  ? `${getCategoryColor(cat)} ring-2 ring-black/20`
                  : 'opacity-50 hover:opacity-100'
              }`}
              onClick={() => toggleFilter(cat)}
            >
              {getCategoryLabel(cat)} ×{totalCategoryBreakdown[cat] || 0}
            </Badge>
          ))}
          {activeFilters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-6"
              onClick={() => setActiveFilters([])}
            >
              Clear filters
            </Button>
          )}
        </div>

        <Separator />

        <Accordion type="multiple" className="space-y-2">
          {filteredResults.map(result => (
            <FileSection key={result.filePath} result={result} />
          ))}
        </Accordion>

        {filteredResults.length === 0 && (
          <div className="text-center py-8 text-black/40">
            No issues match the selected filters
          </div>
        )}
      </CardContent>
    </Card>
  )
}
