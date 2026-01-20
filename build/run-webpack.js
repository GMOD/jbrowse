#!/usr/bin/env node
const { spawn } = require('child_process')

const args = process.argv.slice(2)
const nodeVersion = parseInt(process.versions.node.split('.')[0], 10)

const env = { ...process.env }
if (nodeVersion >= 17) {
  env.NODE_OPTIONS = [env.NODE_OPTIONS, '--openssl-legacy-provider']
    .filter(Boolean)
    .join(' ')
}

const child = spawn('npx', args, {
  env,
  stdio: 'inherit',
  shell: true,
})

child.on('close', (code) => {
  process.exit(code)
})
