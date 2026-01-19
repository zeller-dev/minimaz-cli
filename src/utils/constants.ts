import { MinimazConfig, PkgTemplate } from "./types.js"

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