// ----- Log Types -----
export type LogType =
    "error"
    | "warn"
    | "success"
    | "info"
    | "debug"

// ----- Command Help Types -----
export type CommandHelp = {
    usage: string
    description: string
    options?: Record<string, string>
}

// ----- Command Fn Types -----
export type CommandFn = () => Promise<void> | void

// ----- Minimaz Config Types -----
export type MinimazConfig = {
    outDir: string
    bundling?: {
        css?: {
            enabled?: boolean
            outFile?: string
        }
        js?: {
            enabled?: boolean
            outFile?: string
        }
        outDir: string
    }
    minify?: {
        html?: boolean
        css?: boolean
        js?: boolean
        ts?: boolean
    }
    replace?: Record<string, string>
    folders: {
        [key: string]: string
    }
    styles?: string[]
    scripts?: string[]
}

// ----- Package Template Types -----
export type PkgTemplate = {
    version: string
    license: string
    type: "commonjs" | "module"
    scripts: Record<string, string>
    devDependencies: Record<string, string>
}

// ----- Args Types -----
export interface Args {
    _: string[]
    [key: string]: string | boolean | string[]
}

// ----- Template Command Options Types -----
export type TemplateCommandOptions = {
    list?: boolean
    delete?: string
    update?: string
}

// ----- Init Command Options Types -----
export type InitCommandOptions = {
    template: string
    npm?: boolean
    git?: boolean
    gitremote?: string
    gitprovider?: string
}

// ----- Multiple Bundle Type -----
export type Bundles = {
    outDir: string
    css: Bundle
    js: Bundle
}

// ----- Single Bundle Type -----
export type Bundle = {
    outFile: string
    chunks: string[]
}

// ----- File Handlers Types -----
export type FileHandler =
    Record<string, (src: string, dest: string) => Promise<void>>

// ----- File Types -----
export type File = {
    src: string
    dest: string
    content: string
    ext: string
}

// --- Type for settings ---
export type Settings = {
    createdAt: string
    templatesPath: string
    npmGlobalPath: string
}