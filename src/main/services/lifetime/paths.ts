import fs from 'fs'
import os from 'os'
import path from 'path'

export interface LifetimePaths {
  claudeProjectsDirs: string[]
  codexSessionsDir: string
}

export function resolveLifetimePaths(home: string = os.homedir()): LifetimePaths {
  return {
    claudeProjectsDirs: [
      path.join(home, '.claude', 'projects'),
      path.join(home, '.config', 'claude', 'projects'),
    ],
    codexSessionsDir: path.join(home, '.codex', 'sessions'),
  }
}

export function dirExists(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory()
  } catch {
    return false
  }
}

export function walkJsonl(root: string, maxDepth = 8): string[] {
  if (!dirExists(root)) return []
  const out: string[] = []
  const stack: { dir: string; depth: number }[] = [{ dir: root, depth: 0 }]
  while (stack.length) {
    const { dir, depth } = stack.pop()!
    let entries: fs.Dirent[] = []
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (depth < maxDepth) stack.push({ dir: full, depth: depth + 1 })
      } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        out.push(full)
      }
    }
  }
  return out
}
