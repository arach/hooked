import { existsSync, mkdirSync, renameSync, writeFileSync } from 'fs'
import { basename, dirname, join } from 'path'

export function writeFileAtomic(filePath: string, contents: string): void {
  const dir = dirname(filePath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  const tempPath = join(dir, `.${basename(filePath)}.${process.pid}.${Date.now()}.tmp`)
  writeFileSync(tempPath, contents)
  renameSync(tempPath, filePath)
}
