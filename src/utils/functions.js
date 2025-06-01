export function parseArgs(rawArgs) {
  const args = { _: [] }

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i]

    if (arg[0] === '-') {
      const isLong = arg[1] === '-'
      const key = isLong ? arg.slice(2) : arg.slice(1)

      const next = rawArgs[i + 1]
      const hasValue = next !== undefined && !next.startsWith('-')

      args[key] = hasValue ? next : true
      if (hasValue) i++
    } else {
      args._.push(arg)
    }
  }

  return args
}
