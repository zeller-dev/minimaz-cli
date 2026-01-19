import { CommandHelp, MinimazConfig, PkgTemplate } from "./types.js"

export const pkgTemplate: PkgTemplate = {
    name: '{{name}}',
    version: '0.0.1',
    license: 'ISC',
    type: 'commonjs',
    scripts: {
        build: 'mz b',
        start: 'npx mz b && npx serve dist/'
    },
    devDependencies: {
        'minimaz-cli': 'latest',
        serve: 'latest'
    }
}

export const gitIgnoreTemplate: string = `dist
.vscode
node_modules`

export const minimazConfigTemplate: MinimazConfig = {
    src: 'src',
    dist: 'dist',
    public: 'public',

    minify: {
        html: true,
        css: true,
        js: true,
        ts: true
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

export const commands: Record<string, CommandHelp> = {
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