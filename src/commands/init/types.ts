// ----- Init Command Options Types -----
export type InitCommandOptions = {
    template: string
    npm?: boolean
    git?: boolean
    gitremote?: string
    gitprovider?: string
}


/**
 * Template structure for generated package.json files.
 *
 * Focused on development-time dependencies and scripts.
 */
export type PkgTemplate = {
    version: string
    license: string
    type: "commonjs" | "module"
    scripts: Record<string, string>
    devDependencies: Record<string, string>
}