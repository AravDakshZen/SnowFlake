import path from 'path'

const EXT_MAP: Record<string, string> = {
  '.ts': 'TypeScript', '.tsx': 'TypeScript',
  '.js': 'JavaScript', '.jsx': 'JavaScript',
  '.py': 'Python', '.go': 'Go', '.rs': 'Rust',
  '.java': 'Java', '.cs': 'C#', '.php': 'PHP',
  '.rb': 'Ruby', '.swift': 'Swift', '.kt': 'Kotlin'
}

export function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  return EXT_MAP[ext] ?? 'code'
}
