// ----- Log Types -----
export type LogType = 'error' | 'warn' | 'success' | 'info' | 'log'

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

    minify: {
        html?: boolean
        css?: boolean
        js?: boolean
        ts?: boolean
    };

    replace?: Record<string, string>

    folders?: {
        src?: string
        public?: string
        [key: string]: string | undefined
    }
    styles?: string[]
    scripts?: string[]
}

// ----- Package Template Types -----
export type PkgTemplate = {
    name: string
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

export type GitRepo = {
    url: string
    provider?: 'github' | 'gitlab'
    name?: string
}