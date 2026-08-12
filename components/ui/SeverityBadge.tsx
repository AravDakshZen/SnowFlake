import { Badge } from '@/components/ui/badge'

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'

const SEVERITY_CONFIG: Record<Severity, {
  variant: 'destructive' | 'outline' | 'secondary' | 'default'
  className?: string
  label: string
}> = {
  critical: { 
    variant: 'destructive', 
    label: 'Critical' 
  },
  high: { 
    variant: 'outline', 
    className: 'border-orange-500 text-orange-600 bg-orange-500/10',
    label: 'High' 
  },
  medium: { 
    variant: 'outline',
    className: 'border-yellow-500 text-yellow-600 bg-yellow-500/10',
    label: 'Medium'
  },
  low: { 
    variant: 'outline',
    className: 'border-blue-400 text-blue-500 bg-blue-400/10',
    label: 'Low'
  },
  info: { 
    variant: 'secondary',
    label: 'Info'
  }
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const config = SEVERITY_CONFIG[severity]
  return (
    <Badge 
      variant={config.variant} 
      className={config.className}
    >
      {config.label}
    </Badge>
  )
}
