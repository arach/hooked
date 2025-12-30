#!/usr/bin/env node

import { spawnSync } from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cli = join(__dirname, '..', 'src', 'cli', 'index.ts')

spawnSync('npx', ['tsx', cli, ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: true,
})
