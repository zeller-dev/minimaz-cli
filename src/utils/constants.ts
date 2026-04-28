import {
    // --- FUNCTIONS ---
    colorize,

    // --- TYPES ---
    CommandHelp, LogType, MinimazConfig, PkgTemplate
} from "../index.js"

// ----- Package.json template -----
export const pkgTemplate: PkgTemplate = {
    version: '0.0.1',
    license: 'ISC',
    type: 'commonjs',
    scripts: {
        build: 'npx mz b',
        start: 'npx mz b && npx serve dist/'
    },
    devDependencies: {
        'minimaz-cli': 'latest',
        'serve': 'latest'
    }
}

// ----- .gitignore template -----
export const gitIgnoreTemplate: string =
    `node_modules
dist
.env
.vscode
.DS_Store
`.trim()

// ----- Default minimaz.config.json template -----
export const minimazConfigTemplate: MinimazConfig = {
    outDir: 'dist',
    bundling: {
        css: {
            enabled: true,
            outFile: 'styles.css'
        },
        js: {
            enabled: true,
            outFile: 'scripts.js'
        },
        outDir: ''
    },
    minify: {
        html: true,
        css: true,
        js: true
    },
    replace: {
        '../public/': 'public/'
    },
    styles: [
        'style.css',
        'style-2.css'
    ],
    scripts: [
        'script.js',
        'script-2.js'
    ],
    folders: {
        src: '',
        public: 'public'
    }
}

// ----- CLI Commands Help -----
export const commandsHelp: Record<string, CommandHelp> = {
    build: {
        usage:
            'minimaz build | b',
        description:
            'Build project into outDir folder (default: "./dist")'
    },
    clear: {
        usage:
            'minimaz clear | c',
        description:
            'Clear the outDir folder (default: "./dist")'
    },
    help: {
        usage:
            'minimaz help | h',
        description:
            'Show this help message'
    },
    init: {
        usage:
            'minimaz init | i <project-name>',
        description:
            'Create a new project (default: "minimaz-project")',
        options: {
            '--template | -t <template-name>': 'Use a global template (default: "default")'
        }
    },
    template: {
        usage:
            'minimaz template | t [path]',
        description:
            'Save folder as a template (no path = current folder)',
        options: {
            '--list | -l':
                'List available global templates',
            '--delete | -d <template-name>':
                'Delete a global template'
        }
    },
    validate: {
        usage:
            'minimaz validate',
        description:
            'Validate file'
    },
    version: {
        usage:
            'minimaz version | v',
        description:
            'Show Minimaz version'
    }
}

// ----- Colors for logging -----
export const colors: Record<string, string> = {
    reset:
        '\x1b[0m',
    red:
        '\x1b[31m',
    yellow:
        '\x1b[33m',
    green:
        '\x1b[32m',
    blue:
        '\x1b[34m',
    gray:
        '\x1b[90m'
}

export const prefix: Record<LogType, string> = {
    error:
        colorize('[ --- ERROR ----- ]\t', colors.red),
    warn:
        colorize('[ --- WARN ------ ]\t', colors.yellow),
    success:
        colorize('[ --- SUCCESS --- ]\t', colors.green),
    info:
        colorize('[ --- INFO ------ ]\t', colors.blue),
    debug:
        colorize('[ --- DEBUG ----- ]\t', colors.gray)
}