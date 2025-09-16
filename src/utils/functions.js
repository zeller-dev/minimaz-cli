import readline from 'readline'
import fs from 'fs-extra'
import { log } from './logService.js'

export function parseArgs(rawArgs) {
  const args = { _: [] }
  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i]
    if (arg.startsWith('-')) {
      const key = arg.startsWith('--') ? arg.slice(2) : arg.slice(1)
      const next = rawArgs[i + 1]
      const hasValue = next && !next.startsWith('-')
      args[key] = hasValue ? next : true
      if (hasValue) i++
    } else { args._.push(arg) }
  }
  return args
}

export function askQuestion(query) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question(query, answer => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

export async function listTemplates(dir) {
  if (!await fs.pathExists(dir)) {
    log('info', 'No global templates found.')
    return
  }
  const templates = await fs.readdir(dir)
  if (templates.length === 0) { log('info', 'No global templates available.') }
  else {
    log('info', 'Available global templates:')
    templates.forEach(t => log('info', `- ${t}`))
  }
}

export function applyReplacements(content, replacements = {}) {
  for (const [from, to] of Object.entries(replacements)) {
    content = content.split(from).join(to)
  }
  return content
}