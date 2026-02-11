import {
  CommandHelp,      // types
  commandsHelp      // constants
} from "../index.js"

/**
 * Display help message.
 * If `cmdName` is provided, show help only for that command.
 * Otherwise, show full help.
 */
export function help(cmdName?: string): void {
  // If specific command requested
  if (cmdName) {
    const cmd: CommandHelp = commandsHelp[cmdName]
    if (!cmd) {
      console.log(`No help found for command: ${cmdName}\n`)
      return
    }
    console.log(cmd.usage, `\n\t${cmd.description}`)
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
  for (const cmd of Object.values(commandsHelp)) {
    console.log(cmd.usage, `\n\t${cmd.description}`)
    if (cmd.options) {
      console.log('\tOptions:')
      for (const [opt, desc] of Object.entries(cmd.options)) {
        console.log(`\t\t${opt}\t${desc}`)
      }
    }
    console.log('')
  }
}