// ----- Command Help Types -----
export type CommandHelp = {
    usage: string
    description: string
    options?: Record<string, string>
}