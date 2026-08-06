export type SeverityLevel = 'P0' | 'P1' | 'P2' | 'P3';

interface ScoringFactors {
  occurrenceCount: number;
  lastSeenAt: Date;
  statusCode: number;
  timeWindowDays?: number;
}

export function calculateSeverity(factors: ScoringFactors): SeverityLevel {
  const score = calculateSeverityScore(factors);

  if (score >= 80) return 'P0';
  if (score >= 60) return 'P1';
  if (score >= 40) return 'P2';
  return 'P3';
}

export function calculateSeverityScore(factors: ScoringFactors): number {
  const { occurrenceCount, lastSeenAt, statusCode, timeWindowDays = 7 } = factors;

  // Recency weight: errors in last 24h get 1.0, older errors get less
  const hoursSinceLast = (Date.now() - lastSeenAt.getTime()) / (1000 * 60 * 60);
  const recencyWeight = Math.max(0.1, Math.exp(-hoursSinceLast / 24));

  // Status code weight: 5xx errors are more severe than 4xx
  let statusCodeWeight = 1;
  if (statusCode >= 500) statusCodeWeight = 2;
  else if (statusCode >= 400) statusCodeWeight = 1.5;

  // Frequency: log scale to avoid huge spikes
  const frequencyScore = Math.log(occurrenceCount + 1) * 10;

  // Final normalized score (0-100)
  const rawScore = frequencyScore * recencyWeight * statusCodeWeight;
  return Math.min(100, Math.round(rawScore));
}

export function calculateTrend(
  currentCount: number,
  previousCount: number
): 'rising' | 'falling' | 'stable' {
  if (currentCount > previousCount * 1.2) return 'rising';
  if (currentCount < previousCount * 0.8) return 'falling';
  return 'stable';
}

export interface SeverityStats {
  level: SeverityLevel;
  score: number;
  trend: 'rising' | 'falling' | 'stable';
  label: string;
  color: string;
}

export function getSeverityStats(factors: ScoringFactors, trend?: 'rising' | 'falling' | 'stable'): SeverityStats {
  const level = calculateSeverity(factors);
  const score = calculateSeverityScore(factors);

  const labels: Record<SeverityLevel, string> = {
    P0: 'Critical',
    P1: 'High',
    P2: 'Medium',
    P3: 'Low',
  };

  const colors: Record<SeverityLevel, string> = {
    P0: '#ef4444',
    P1: '#f97316',
    P2: '#eab308',
    P3: '#3b82f6',
  };

  return {
    level,
    score,
    trend: trend || 'stable',
    label: labels[level],
    color: colors[level],
  };
}
