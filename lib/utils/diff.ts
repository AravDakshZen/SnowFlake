export function countDiffLines(patchDiff: string): number {
  return patchDiff
    .split('\n')
    .filter(line => line.startsWith('+') || line.startsWith('-'))
    .filter(line => !line.startsWith('+++') && !line.startsWith('---'))
    .length
}
