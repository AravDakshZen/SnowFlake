'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Clock, Play, GitBranch, Calendar, ChevronDown, Check } from 'lucide-react'
import { ISSUE_CATEGORIES, calculateEstimatedMinutes, getSelectedCategories, type IssueCategory } from '@/types/event'

interface CreateEventFormProps {
  onSubmit: (data: CreateEventData) => void
  loading?: boolean
  repos?: Array<{ owner: string; name: string; defaultBranch: string }>
}

export interface CreateEventData {
  name: string
  repoOwner: string
  repoName: string
  defaultBranch: string
  categoryIds: string[]
  triggerType: 'immediate' | 'commit' | 'schedule'
  cronExpression?: string
}

function CategoryCheckbox({
  category,
  checked,
  onChange
}: {
  category: IssueCategory
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
        checked
          ? 'border-black/20 bg-black/5'
          : 'border-black/10 hover:border-black/15'
      }`}
      onClick={() => onChange(!checked)}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={onChange}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{category.label}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            ~{category.estimatedMinutes} min
          </Badge>
        </div>
        <p className="text-xs text-black/50 mt-1">{category.description}</p>
      </div>
    </div>
  )
}

export function CreateEventForm({ onSubmit, loading, repos = [] }: CreateEventFormProps) {
  const [name, setName] = useState('')
  const [selectedRepo, setSelectedRepo] = useState<string>('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    ISSUE_CATEGORIES.map(c => c.id)
  )
  const [triggerType, setTriggerType] = useState<'immediate' | 'commit' | 'schedule'>('immediate')
  const [cronExpression, setCronExpression] = useState('0 */6 * * *')
  const [showRepoDropdown, setShowRepoDropdown] = useState(false)

  const selectedCategoriesData = getSelectedCategories(selectedCategories)
  const estimatedMinutes = calculateEstimatedMinutes(selectedCategories, 5)
  const repo = repos.find(r => `${r.owner}/${r.name}` === selectedRepo)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !selectedRepo || selectedCategories.length === 0) return

    onSubmit({
      name,
      repoOwner: repo?.owner || '',
      repoName: repo?.name || '',
      defaultBranch: repo?.defaultBranch || 'main',
      categoryIds: selectedCategories,
      triggerType,
      cronExpression: triggerType === 'schedule' ? cronExpression : undefined,
    })
  }

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const toggleAllCategories = () => {
    if (selectedCategories.length === ISSUE_CATEGORIES.length) {
      setSelectedCategories([])
    } else {
      setSelectedCategories(ISSUE_CATEGORIES.map(c => c.id))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Create Automation Event</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="event-name">Event name</Label>
            <Input
              id="event-name"
              placeholder="e.g., Production error monitoring"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Target repository</Label>
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between"
                onClick={() => setShowRepoDropdown(!showRepoDropdown)}
              >
                {selectedRepo || 'Select a repository'}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
              {showRepoDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg">
                  {repos.map(repo => (
                    <button
                      key={`${repo.owner}/${repo.name}`}
                      type="button"
                      className="w-full px-4 py-2 text-left hover:bg-black/5 flex items-center justify-between"
                      onClick={() => {
                        setSelectedRepo(`${repo.owner}/${repo.name}`)
                        setShowRepoDropdown(false)
                      }}
                    >
                      <span className="font-mono text-sm">{repo.owner}/{repo.name}</span>
                      {selectedRepo === `${repo.owner}/${repo.name}` && (
                        <Check className="h-4 w-4 text-green-500" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Analysis scope</Label>
                <p className="text-xs text-black/50 mt-1">
                  Select which issue categories to analyze
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleAllCategories}
              >
                {selectedCategories.length === ISSUE_CATEGORIES.length ? 'Deselect all' : 'Select all'}
              </Button>
            </div>

            <div className="grid gap-3">
              {ISSUE_CATEGORIES.map(category => (
                <CategoryCheckbox
                  key={category.id}
                  category={category}
                  checked={selectedCategories.includes(category.id)}
                  onChange={() => toggleCategory(category.id)}
                />
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div>
              <Label>Priority order preview</Label>
              <p className="text-xs text-black/50 mt-1">
                Issues will be analyzed in this order
              </p>
            </div>

            <div className="space-y-2">
              {selectedCategoriesData.map((category, index) => (
                <div
                  key={category.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-black/5"
                >
                  <span className="size-6 rounded-full bg-black/10 flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </span>
                  <span className="flex-1 text-sm">{category.label}</span>
                  <Badge variant="outline" className="text-[10px]">
                    ~{category.estimatedMinutes} min
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-sm font-medium">Estimated analysis time</p>
                  <p className="text-2xl font-light text-amber-600">~{estimatedMinutes} minutes</p>
                  <p className="text-xs text-black/50 mt-1">
                    Based on {selectedCategories.length} issue categories across your repo
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          <div className="space-y-4">
            <Label>Trigger type</Label>
            <RadioGroup
              value={triggerType}
              onValueChange={(v) => setTriggerType(v as typeof triggerType)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="immediate" id="trigger-immediate" />
                <Label htmlFor="trigger-immediate" className="flex items-center gap-2 cursor-pointer">
                  <Play className="h-4 w-4" />
                  Run analysis immediately
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="commit" id="trigger-commit" />
                <Label htmlFor="trigger-commit" className="flex items-center gap-2 cursor-pointer">
                  <GitBranch className="h-4 w-4" />
                  On every new commit
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="schedule" id="trigger-schedule" />
                <Label htmlFor="trigger-schedule" className="flex items-center gap-2 cursor-pointer">
                  <Calendar className="h-4 w-4" />
                  On schedule
                </Label>
              </div>
            </RadioGroup>

            {triggerType === 'schedule' && (
              <div className="space-y-2">
                <Label htmlFor="cron">Cron expression</Label>
                <Input
                  id="cron"
                  placeholder="0 */6 * * *"
                  value={cronExpression}
                  onChange={e => setCronExpression(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-black/50">
                  Example: 0 */6 * * * = every 6 hours
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" disabled={loading}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading || !name || !selectedRepo || selectedCategories.length === 0}
        >
          {loading ? 'Creating...' : 'Create Event'}
        </Button>
      </div>
    </form>
  )
}
