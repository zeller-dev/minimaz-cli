import { CommandHelp } from "../index.js"

const commands: Record<string, CommandHelp> = {
  init: {
    usage: 'minimaz init | i <project-name>',
    description: 'Create a new project (default: "minimaz-site")',
    options: {
      '--template | -t <template-name>': 'Use a global template (default: "default")'
    }
  },
  build: {
    usage: 'minimaz build | b',
    description: 'Build and minify files into the dist folder'
  },
  template: {
    usage: 'minimaz template | t [path]',
    description: 'Save current folder as a template (no path = current folder)',
    options: {
      '--list | -l': 'List available global templates',
      '--delete | -d <template-name>': 'Delete a global template'
    }
  },
  help: {
    usage: 'minimaz help | h',
    description: 'Show this help message'
  },
  clear: {
    usage: 'minimaz clear | c',
    description: 'Clear the dist folder'
  },
  version: {
    usage: 'minimaz version | v',
    description: 'Show Minimaz version'
  }
}

/**
 * Display help message.
 * If `cmdName` is provided, show help only for that command.
 * Otherwise, show full help.
 */
export function help(cmdName?: string): void {
  // If specific command requested
  if (cmdName) {
    const cmd = commands[cmdName]
    if (!cmd) {
      console.log(`No help found for command: ${cmdName}\n`)
      return
    }
    console.log(cmd.usage)
    console.log(`\t${cmd.description}`)
    if (cmd.options) {
      console.log('\tOptions:')
      for (const [opt, desc] of Object.entries(cmd.options)) {
        console.log(`\t\t${opt}\t${desc}`)
      }
    }
    console.log('')
    return
  }

  // Otherwise, show general help
  console.log('Usage:\n')
  for (const cmd of Object.values(commands)) {
    console.log(cmd.usage)
    console.log(`\t${cmd.description}`)
    if (cmd.options) {
      console.log('\tOptions:')
      for (const [opt, desc] of Object.entries(cmd.options)) {
        console.log(`\t\t${opt}\t${desc}`)
      }
    }
    console.log('')
  }
}