// ----- Log Types -----
export type LogType = 'error' | 'warn' | 'success' | 'info' | 'debug'

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
    src: string
    dist: string
    public: string
    bundling: {
        css: boolean
        js: boolean
    };
    minify: {
        html?: boolean
        css?: boolean
        js?: boolean
        ts?: boolean
    };
    replace?: Record<string, string>
    folders?: {
        [key: string]: string
    }
    styles?: string[]
    scripts?: string[]
}

// ----- Package Template Types -----
export type PkgTemplate = {
    version: string
    license: string
    type: 'commonjs' | 'module'
    scripts: Record<string, string>
    devDependencies: Record<string, string>
}

// ----- Args Types -----
export interface Args {
    _: string[]
    [key: string]: string | boolean | string[]
}

// ----- Template Command Options Types -----
export type templateCommandOptions = {
    list?: boolean
    delete?: string
    update?: string
}

// ----- Init Command Options Types -----
export type initCommandOptions = {
    template?: string
    npm?: boolean
    git?: boolean
    gitremote?: string
    gitprovider?: string
}

// ----- Bundles Types -----
export type Bundles = {
    css: string[],
    js: string[]
}

// ----- File Handlers Types -----
export type FileHandler = Record<string, (src: string, dest: string) => Promise<void>>
